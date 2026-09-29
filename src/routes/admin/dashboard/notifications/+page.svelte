<script>
	import { getContext, onMount, untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import AdminPage from '$lib/components/admin/AdminPage.svelte';
	import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
	import {
		getAdminNotifications,
		markAdminNotificationRead,
		markAllAdminNotificationsRead,
		saveAdminPushSubscription
	} from '$lib/api/notifications.js';
	import {
		revokeAdminPushSubscription,
		subscriptionPayload,
		urlBase64ToUint8Array
	} from '$lib/admin-notifications.js';
	import Bell from '@lucide/svelte/icons/bell';
	import BellOff from '@lucide/svelte/icons/bell-off';
	import CheckCheck from '@lucide/svelte/icons/check-check';

	let { data } = $props();
	const center = getContext('admin-notifications');
	let items = $state(untrack(() => data.notifications || []));
	let loading = $state(false);
	let saving = $state(false);
	let pushEnabled = $state(false);
	let pushSupported = $state(false);
	let permission = $state('default');
	let isIOSBrowser = $state(false);
	let error = $state(untrack(() => data.error));
	let unreadCount = $derived(items.filter((item) => !item.isRead).length);

	const dateFormatter = new Intl.DateTimeFormat('id-ID', {
		dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta'
	});

	async function reload() {
		if (data.isForbidden) return;
		loading = true;
		try {
			const result = await getAdminNotifications();
			items = Array.isArray(result) ? result : [];
			error = null;
			void center.refreshCount();
		} catch (cause) {
			error = cause?.message || 'Notifikasi belum dapat dimuat.';
		} finally {
			loading = false;
		}
	}

	async function markRead(item) {
		if (item.isRead) return;
		try {
			await markAdminNotificationRead(item.id);
			items = items.map((entry) => entry.id === item.id ? { ...entry, isRead: true } : entry);
			void center.refreshCount();
		} catch (cause) {
			toast.error(cause?.message || 'Gagal menandai notifikasi.');
		}
	}

	async function markAllRead() {
		if (!unreadCount) return;
		try {
			await markAllAdminNotificationsRead();
			items = items.map((entry) => ({ ...entry, isRead: true }));
			void center.refreshCount();
		} catch (cause) {
			toast.error(cause?.message || 'Gagal menandai semua notifikasi.');
		}
	}

	async function enablePush() {
		if (!pushSupported || !data.vapidPublicKey) return;
		saving = true;
		try {
			// The permission request must start in this click handler.
			const requested = Notification.permission === 'granted'
				? 'granted'
				: await Notification.requestPermission();
			permission = requested;
			if (requested !== 'granted') return;

			const registration = await navigator.serviceWorker.ready;
			let subscription = await registration.pushManager.getSubscription();
			let created = false;
			if (!subscription) {
				subscription = await registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: urlBase64ToUint8Array(data.vapidPublicKey)
				});
				created = true;
			}
			try {
				await saveAdminPushSubscription(subscriptionPayload(subscription));
			} catch (cause) {
				if (created) await subscription.unsubscribe();
				throw cause;
			}
			pushEnabled = true;
			toast.success('Notifikasi sistem aktif.');
		} catch (cause) {
			toast.error(cause?.message || 'Notifikasi sistem gagal diaktifkan.');
		} finally {
			saving = false;
		}
	}

	async function disablePush() {
		saving = true;
		try {
			await revokeAdminPushSubscription();
			pushEnabled = false;
			toast.success('Notifikasi sistem dinonaktifkan.');
		} catch (cause) {
			pushEnabled = false;
			toast.error(cause?.message || 'Gagal menghapus subscription di server.');
		} finally {
			saving = false;
		}
	}

	$effect(() => {
		if (center.state.version > 0) void reload();
	});

	onMount(() => {
		pushSupported = window.isSecureContext &&
			'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
		permission = pushSupported ? Notification.permission : 'unsupported';
		const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
			(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
		const installed = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
		isIOSBrowser = isIOS && !installed;
		if (isIOSBrowser || !pushSupported) return;

		void navigator.serviceWorker.ready.then(async (registration) => {
			const subscription = await registration.pushManager.getSubscription();
			pushEnabled = Boolean(subscription);
			if (subscription && Notification.permission === 'granted') {
				try {
					await saveAdminPushSubscription(subscriptionPayload(subscription));
				} catch {
					// A temporary backend failure does not remove the browser subscription.
				}
			}
		}).catch(() => {});
	});
</script>

<AdminPage>
	<AdminPageHeader
		title="Notifikasi"
		description="Kabar terbaru tentang pesanan dan perubahan status."
	>
		{#snippet actions()}
			<Button variant="outline" size="sm" disabled={!unreadCount} onclick={markAllRead}>
				<CheckCheck class="size-4" /> Tandai semua dibaca
			</Button>
		{/snippet}
	</AdminPageHeader>

	{#if !data.isForbidden}
		<section class="flex flex-col gap-3 rounded-xl border border-primary/15 bg-background p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
			<div class="flex items-start gap-3">
				<div class="rounded-lg bg-primary/10 p-2 text-primary"><Bell class="size-5" /></div>
				<div>
					<h2 class="font-medium">Notifikasi saat aplikasi di latar belakang</h2>
					<p class="mt-1 max-w-xl text-sm text-muted-foreground">
						{#if isIOSBrowser}
							Pasang aplikasi ke Layar Utama, lalu buka dari ikonnya untuk mengaktifkan notifikasi sistem.
						{:else if !pushSupported}
							Browser atau koneksi ini belum mendukung Web Push.
						{:else if !data.vapidPublicKey}
							Kunci Web Push belum tersedia di server.
						{:else if permission === 'denied'}
							Izin notifikasi diblokir. Ubah izin situs di pengaturan browser.
						{:else if pushEnabled}
							Aktif di perangkat ini. Notifikasi tetap dapat muncul saat aplikasi ditutup.
						{:else}
							Aktifkan izin sekali untuk menerima kabar pesanan saat aplikasi tidak terbuka.
						{/if}
					</p>
				</div>
			</div>
			{#if pushEnabled}
				<Button variant="outline" size="sm" disabled={saving} onclick={disablePush}><BellOff class="size-4" />Nonaktifkan</Button>
			{:else}
				<Button size="sm" disabled={saving || isIOSBrowser || !pushSupported || !data.vapidPublicKey || permission === 'denied'} onclick={enablePush}><Bell class="size-4" />Aktifkan notifikasi</Button>
			{/if}
		</section>
	{/if}

	{#if error}
		<div class="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">{error}</div>
	{/if}

	<div class="flex items-center justify-between">
		<p class="text-sm text-muted-foreground">{unreadCount} belum dibaca</p>
		<Button variant="ghost" size="sm" disabled={loading || data.isForbidden} onclick={reload}>Muat ulang</Button>
	</div>

	{#if !items.length && !error}
		<div class="rounded-xl border border-dashed bg-background px-6 py-12 text-center text-sm text-muted-foreground">Belum ada notifikasi.</div>
	{:else}
		<div class="space-y-2">
			{#each items as item (item.id)}
				<article class={item.isRead ? 'rounded-xl border bg-background p-4' : 'rounded-xl border border-primary/30 bg-primary/5 p-4'}>
					<div class="flex items-start gap-3">
						<span class={item.isRead ? 'mt-2 size-2 shrink-0 rounded-full bg-transparent' : 'mt-2 size-2 shrink-0 rounded-full bg-primary'} aria-hidden="true"></span>
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-start justify-between gap-2">
								<h2 class="font-semibold text-foreground">{item.title}</h2>
								<time class="text-xs text-muted-foreground" datetime={item.createdAt}>{dateFormatter.format(new Date(item.createdAt))}</time>
							</div>
							<p class="mt-1 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
							{#if !item.isRead}
								<button type="button" class="mt-3 text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:underline" onclick={() => markRead(item)}>Tandai dibaca</button>
							{/if}
						</div>
					</div>
				</article>
			{/each}
		</div>
	{/if}
</AdminPage>
