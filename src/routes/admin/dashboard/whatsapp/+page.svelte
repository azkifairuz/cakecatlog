<script>
	import { enhance } from '$app/forms';
	import { invalidateAll, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount, tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import MessageCircleIcon from '@lucide/svelte/icons/message-circle';
	import MessageSquareTextIcon from '@lucide/svelte/icons/message-square-text';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import ShoppingBagIcon from '@lucide/svelte/icons/shopping-bag';
	import CreditCardIcon from '@lucide/svelte/icons/credit-card';
	import CakeIcon from '@lucide/svelte/icons/cake';
	import StoreIcon from '@lucide/svelte/icons/store';
	import SaveIcon from '@lucide/svelte/icons/save';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import MailIcon from '@lucide/svelte/icons/mail';
	import CheckIcon from '@lucide/svelte/icons/check';
	import SearchIcon from '@lucide/svelte/icons/search';
	import InfoIcon from '@lucide/svelte/icons/info';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import SmartphoneIcon from '@lucide/svelte/icons/smartphone';

	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Spinner } from '$lib/components/ui/spinner';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import AdminPage from '$lib/components/admin/AdminPage.svelte';
	import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
	import AdminStatusBadge from '$lib/components/admin/AdminStatusBadge.svelte';
	import { createDebouncedValue } from '$lib/debounced-value.svelte.js';
	import { cn } from '$lib/utils';
	import {
		DEFAULT_INVOICE_TEMPLATE,
		SAMPLE_ORDERS,
		VARIABLE_CATEGORIES,
		normalizeInvoiceTemplate,
		normalizeTemplateVariables,
		renderInvoicePreview,
		formatWhatsAppToHtml
	} from '$lib/invoice-template.js';

	let { data, form } = $props();

	// ----------------------------------------------------
	// TAB NAVIGATION
	// ----------------------------------------------------
	let activeTab = $state(page.url.searchParams.get('tab') === 'template' ? 'template' : 'gateway');

	function setTab(tab) {
		activeTab = tab;
		const url = new URL(window.location.href);
		if (tab === 'gateway') {
			url.searchParams.delete('tab');
		} else {
			url.searchParams.set('tab', tab);
		}
		goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
	}

	// ----------------------------------------------------
	// TAB 1: WHATSAPP GATEWAY CONNECTION
	// ----------------------------------------------------
	let currentState = $state({ status: 'idle', qr: null, message: 'Memuat status WhatsApp.' });
	let pollingTimer = null;
	let disconnecting = $state(false);
	let refreshing = $state(false);

	const statusLabels = {
		idle: 'Belum diinisialisasi',
		connecting: 'Sedang menghubungkan',
		qr: 'Menunggu QR dipindai',
		connected: 'Terhubung',
		logged_out: 'Sesi telah keluar',
		error: 'Terjadi gangguan'
	};

	let statusCode = $derived(currentState?.status ?? 'error');
	let statusLabel = $derived(statusLabels[statusCode] ?? currentState?.message ?? 'Status tidak diketahui');
	let qrImage = $derived(currentState?.qr?.dataUrl ?? null);
	let isConnected = $derived(statusCode === 'connected');

	$effect(() => {
		if (data.whatsapp) {
			currentState = data.whatsapp;
		}
	});

	function scheduleStatusCheck(delay = 8_000) {
		if (pollingTimer) clearTimeout(pollingTimer);
		if (document.hidden) return;
		pollingTimer = setTimeout(checkStatus, delay);
	}

	async function checkStatus() {
		if (document.hidden) return;

		try {
			const response = await fetch('/admin/dashboard/whatsapp/status', {
				headers: { Accept: 'application/json' }
			});
			const result = await response.json();
			currentState = result;

			if (response.status === 429) {
				const retryAfter = Number.parseInt(response.headers.get('Retry-After') ?? '', 10);
				scheduleStatusCheck(Number.isFinite(retryAfter) ? retryAfter * 1_000 : 60_000);
				return;
			}
		} catch {
			currentState = {
				status: 'error',
				qr: null,
				message: 'Tidak dapat menghubungi server aplikasi.'
			};
		}

		scheduleStatusCheck();
	}

	async function refreshPairing() {
		refreshing = true;
		await invalidateAll();
		refreshing = false;
		scheduleStatusCheck();
	}

	// ----------------------------------------------------
	// TAB 2: INVOICE MESSAGE TEMPLATE
	// ----------------------------------------------------
	let messageTemplate = $state(data.template?.messageTemplate ?? DEFAULT_INVOICE_TEMPLATE.messageTemplate);
	let itemTemplate = $state(data.template?.itemTemplate ?? DEFAULT_INVOICE_TEMPLATE.itemTemplate);
	let emailSubjectTemplate = $state(data.template?.emailSubjectTemplate ?? DEFAULT_INVOICE_TEMPLATE.emailSubjectTemplate);

	let savingTemplate = $state(false);
	let selectedCategory = $state('all');
	let variableSearch = $state('');
	const getSettledVariableSearch = createDebouncedValue(() => variableSearch);
	let sampleType = $state('single'); // 'single' or 'multi'
	let activeTargetField = $state('messageTemplate'); // 'messageTemplate' | 'itemTemplate' | 'emailSubjectTemplate'
	let insertedKey = $state(null);
	let insertTimer = null;

	// Elements references for cursor tracking
	let emailSubjectRef = $state(null);
	let itemTemplateRef = $state(null);
	let messageTemplateRef = $state(null);

	let variablesList = $derived(normalizeTemplateVariables(data.variables));

	let filteredVariables = $derived(
		variablesList.filter((v) => {
			const query = getSettledVariableSearch().toLowerCase().trim();
			const matchesCategory = selectedCategory === 'all' || v.category === selectedCategory;
			const matchesSearch =
				!query ||
				v.key.toLowerCase().includes(query) ||
				v.label.toLowerCase().includes(query) ||
				v.description.toLowerCase().includes(query);
			return matchesCategory && matchesSearch;
		})
	);

	let previewData = $derived(
		renderInvoicePreview(
			{
				messageTemplate,
				itemTemplate,
				emailSubjectTemplate
			},
			SAMPLE_ORDERS[sampleType] || SAMPLE_ORDERS.single
		)
	);

	let formattedWhatsAppHtml = $derived(formatWhatsAppToHtml(previewData.message));

	// Insert variable at cursor position into the active field
	async function insertVariable(varKey) {
		const placeholder = `{{${varKey}}}`;
		let targetElement = null;

		if (activeTargetField === 'emailSubjectTemplate') {
			targetElement = emailSubjectRef;
		} else if (activeTargetField === 'itemTemplate') {
			targetElement = itemTemplateRef;
		} else {
			targetElement = messageTemplateRef;
		}

		if (targetElement) {
			targetElement.focus();
			const start = targetElement.selectionStart ?? targetElement.value.length;
			const end = targetElement.selectionEnd ?? targetElement.value.length;
			const currentValue = targetElement.value;
			const updatedValue = currentValue.substring(0, start) + placeholder + currentValue.substring(end);

			if (activeTargetField === 'emailSubjectTemplate') {
				emailSubjectTemplate = updatedValue;
			} else if (activeTargetField === 'itemTemplate') {
				itemTemplate = updatedValue;
			} else {
				messageTemplate = updatedValue;
			}

			await tick();
			const newPos = start + placeholder.length;
			targetElement.setSelectionRange(newPos, newPos);
		} else {
			// Fallback append
			if (varKey.startsWith('product.') && varKey !== 'products') {
				itemTemplate = (itemTemplate ? itemTemplate + '\n' : '') + placeholder;
			} else {
				messageTemplate = (messageTemplate ? messageTemplate + '\n' : '') + placeholder;
			}
		}

		// Tactile visual feedback
		insertedKey = varKey;
		if (insertTimer) clearTimeout(insertTimer);
		insertTimer = setTimeout(() => {
			insertedKey = null;
		}, 1500);

		toast.success(`{{${varKey}}} disisipkan ke teks`, { duration: 1500 });
	}

	function resetToDefault() {
		if (confirm('Kembalikan seluruh template pesan invoice dan item ke format standar awal?')) {
			messageTemplate = DEFAULT_INVOICE_TEMPLATE.messageTemplate;
			itemTemplate = DEFAULT_INVOICE_TEMPLATE.itemTemplate;
			emailSubjectTemplate = DEFAULT_INVOICE_TEMPLATE.emailSubjectTemplate;
			toast.info('Template dikembalikan ke format standar');
		}
	}

	// Keyboard shortcut: Cmd+S / Ctrl+S to save
	function handleKeydown(e) {
		if ((e.metaKey || e.ctrlKey) && e.key === 's' && activeTab === 'template') {
			e.preventDefault();
			const saveBtn = document.getElementById('save-template-submit');
			if (saveBtn) saveBtn.click();
		}
	}

	onMount(() => {
		const handleVisibilityChange = () => {
			if (!document.hidden) checkStatus();
			else if (pollingTimer) clearTimeout(pollingTimer);
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);
		window.addEventListener('keydown', handleKeydown);
		scheduleStatusCheck();

		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			window.removeEventListener('keydown', handleKeydown);
			if (pollingTimer) clearTimeout(pollingTimer);
			if (insertTimer) clearTimeout(insertTimer);
		};
	});
</script>

<AdminPage class={activeTab === 'template' ? 'max-w-7xl' : 'max-w-2xl'}>
	<AdminPageHeader
		eyebrow="Integrasi & Notifikasi"
		title="WhatsApp & Invoice"
		description="Kelola gateway WhatsApp dan sesuaikan format template pesan invoice otomatis untuk pelanggan."
	/>

	<!-- TAB NAVIGATION SWITCHER -->
	<div class="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
		<div class="inline-flex rounded-xl bg-muted p-1 shadow-inner" role="tablist">
			<button
				type="button"
				role="tab"
				aria-selected={activeTab === 'gateway'}
				onclick={() => setTab('gateway')}
				class={cn(
					'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-[background-color,color,transform,box-shadow] duration-150 ease-out active:scale-[0.98]',
					activeTab === 'gateway'
						? 'bg-background text-foreground shadow-sm'
						: 'text-muted-foreground hover:text-foreground'
				)}
			>
				<MessageCircleIcon class="size-4 text-emerald-600" />
				<span>Koneksi Gateway</span>
				<span
					class={cn(
						'size-2 rounded-full transition-colors',
						isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-amber-400'
					)}
				></span>
			</button>

			<button
				type="button"
				role="tab"
				aria-selected={activeTab === 'template'}
				onclick={() => setTab('template')}
				class={cn(
					'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-[background-color,color,transform,box-shadow] duration-150 ease-out active:scale-[0.98]',
					activeTab === 'template'
						? 'bg-background text-foreground shadow-sm'
						: 'text-muted-foreground hover:text-foreground'
				)}
			>
				<FileTextIcon class="size-4 text-primary" />
				<span>Template Invoice</span>
				<span class="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">Custom</span>
			</button>
		</div>

		{#if activeTab === 'template'}
			<div class="flex items-center gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onclick={resetToDefault}
					class="h-9 gap-1.5 text-xs text-muted-foreground transition-transform duration-150 active:scale-[0.98] hover:text-foreground"
				>
					<RotateCcwIcon class="size-3.5" />
					Reset ke Standar
				</Button>
			</div>
		{/if}
	</div>

	<!-- TAB 1: WHATSAPP GATEWAY CONNECTION -->
	{#if activeTab === 'gateway'}
		<div class="space-y-6">
			<Card.Root class="overflow-hidden border-border/70 shadow-sm">
				<Card.Header class="border-b bg-muted/20">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div class="flex items-center gap-3">
							<div class="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 shadow-xs">
								<MessageCircleIcon class="size-5" />
							</div>
							<div class="flex flex-col gap-0.5">
								<Card.Title class="text-base font-bold">Status Koneksi Gateway</Card.Title>
								<Card.Description class="text-xs">{statusLabel} · {currentState?.message}</Card.Description>
							</div>
						</div>
						<div class="flex items-center gap-2">
							<AdminStatusBadge status={isConnected ? 'active' : 'pending'} label={statusLabel} />
							{#if isConnected}
								<form
									method="POST"
									action="?/logout"
									use:enhance={() => {
										disconnecting = true;
										return async ({ update }) => {
											await update({ reset: false, invalidateAll: true });
											disconnecting = false;
											scheduleStatusCheck();
										};
									}}
								>
									<Button type="submit" variant="destructive" size="sm" disabled={disconnecting} class="transition-transform duration-150 active:scale-[0.98]">
										{#if disconnecting}<Spinner data-icon="inline-start" />{/if}
										{disconnecting ? 'Memutus...' : 'Logout'}
									</Button>
								</form>
							{/if}
						</div>
					</div>
				</Card.Header>

				<Card.Content class="flex min-h-96 flex-col items-center justify-center pt-6 text-center">
					{#if isConnected}
						<div class="flex max-w-sm flex-col items-center gap-4 py-8">
							<div class="flex size-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-500/10">
								<CheckCircle2Icon class="size-10" />
							</div>
							<div class="flex flex-col gap-1.5">
								<h3 class="text-xl font-bold text-foreground">WhatsApp Terhubung</h3>
								<p class="text-sm text-muted-foreground">
									Gateway aktif. Pesan invoice dapat dikirim otomatis melalui menu
									<a href="/admin/dashboard/orders" class="font-semibold text-primary underline">Daftar Pesanan</a>
									sesuai template yang diatur di tab sebelah.
								</p>
							</div>
						</div>
					{:else if qrImage}
						<div class="flex max-w-sm flex-col items-center gap-5 py-4">
							<div class="rounded-2xl border bg-background p-4 shadow-md ring-1 ring-border/50">
								<img src={qrImage} alt="WhatsApp QR Code" class="size-64 rounded-lg" />
							</div>
							<div class="flex flex-col gap-2">
								<h3 class="text-lg font-bold">Scan QR Code WhatsApp</h3>
								<p class="text-sm text-muted-foreground">
									Buka aplikasi WhatsApp di HP Anda, buka <strong>Perangkat Tertaut (Linked Devices)</strong>, pilih <strong>Tautkan Perangkat</strong> dan arahkan kamera ke QR code di atas.
								</p>
							</div>
						</div>
					{:else}
						<div class="flex max-w-sm flex-col items-center gap-4 py-8">
							{#if statusCode === 'connecting' || statusCode === 'idle'}
								<Spinner class="size-9 text-primary" />
							{:else}
								<MessageCircleIcon class="size-10 text-muted-foreground" />
							{/if}
							<div class="flex flex-col gap-1.5">
								<p class="font-semibold text-foreground">{currentState?.message ?? statusLabel}</p>
								<p class="text-xs text-muted-foreground">QR code akan tampil otomatis setelah gateway siap menerima koneksi.</p>
							</div>
							{#if statusCode === 'error' || statusCode === 'logged_out' || statusCode === 'idle'}
								<Button type="button" variant="outline" size="sm" disabled={refreshing} onclick={refreshPairing} class="mt-2 transition-transform duration-150 active:scale-[0.98]">
									{#if refreshing}<Spinner data-icon="inline-start" />{:else}<RefreshCwIcon data-icon="inline-start" />{/if}
									Coba Hubungkan Ulang
								</Button>
							{/if}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

			{#if form?.message}
				<Alert.Root variant="destructive">
					<Alert.Title>Gagal Memproses</Alert.Title>
					<Alert.Description>{form.message}</Alert.Description>
				</Alert.Root>
			{/if}

			<Alert.Root class="border-border/60 bg-muted/30">
				<InfoIcon class="size-4 text-primary" />
				<Alert.Title class="text-sm font-semibold">Informasi Gateway</Alert.Title>
				<Alert.Description class="text-xs text-muted-foreground">
					<ul class="mt-1.5 flex list-disc flex-col gap-1 pl-4">
						<li>Hanya satu nomor WhatsApp admin yang dapat terhubung dalam satu waktu.</li>
						<li>Jika koneksi terputus, cukup klik tombol hubungkan ulang dan pindai QR code kembali.</li>
					</ul>
				</Alert.Description>
			</Alert.Root>
		</div>
	{/if}

	<!-- TAB 2: INVOICE MESSAGE TEMPLATE -->
	{#if activeTab === 'template'}
		<div class="space-y-6">
			<!-- NOTIFICATIONS / ALERTS -->
			{#if data.templateLoadError}
				<Alert.Root class="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
					<InfoIcon class="size-4 text-amber-600" />
					<Alert.Title class="font-bold">Info Template</Alert.Title>
					<Alert.Description class="text-xs">{data.templateLoadError}</Alert.Description>
				</Alert.Root>
			{/if}

			{#if form?.templateError}
				<Alert.Root variant="destructive">
					<Alert.Title>Gagal Menyimpan</Alert.Title>
					<Alert.Description>{form.templateError}</Alert.Description>
				</Alert.Root>
			{/if}

			<!-- MAIN 2-COLUMN GRID (EDITOR ON LEFT, LIVE SIMULATOR ON RIGHT) -->
			<div class="grid items-start gap-6 lg:grid-cols-12">
				<!-- LEFT COLUMN: TEMPLATE FORMS & VARIABLE PALETTE -->
				<div class="space-y-6 lg:col-span-7">
					<form
						method="POST"
						action="?/saveTemplate"
						use:enhance={() => {
							savingTemplate = true;
							return async ({ result, update }) => {
								try {
									await update({ reset: false });
									if (result.type === 'success') {
										toast.success('Template invoice berhasil disimpan!');
									} else if (result.type === 'failure') {
										toast.error(result.data?.templateError || 'Gagal menyimpan template.');
									}
								} finally {
									savingTemplate = false;
								}
							};
						}}
						class="space-y-6"
					>
						<!-- EMAIL SUBJECT CARD -->
						<Card.Root class="border-border/70 shadow-xs">
							<Card.Header class="pb-3">
								<div class="flex items-center gap-2 text-primary">
									<MailIcon class="size-4" />
									<Card.Title class="text-sm font-bold">Subjek Email Invoice</Card.Title>
								</div>
								<Card.Description class="text-xs">
									Judul email invoice yang dikirimkan ke email pelanggan.
								</Card.Description>
							</Card.Header>
							<Card.Content class="space-y-2 pt-0">
								<Input
									id="emailSubjectTemplate"
									name="emailSubjectTemplate"
									bind:ref={emailSubjectRef}
									bind:value={emailSubjectTemplate}
									onfocus={() => (activeTargetField = 'emailSubjectTemplate')}
									placeholder={'Invoice Pesanan #{{order.number}} - dessertbyfir'}
									class="h-10 bg-muted/20 font-medium text-foreground"
								/>
								<div class="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
									<span>Contoh cepat:</span>
									<button
										type="button"
										onclick={() => insertVariable('order.number')}
										class="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-primary hover:bg-primary/10 transition-colors"
									>
										+ {'{{order.number}}'}
									</button>
									<button
										type="button"
										onclick={() => insertVariable('customer.name')}
										class="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-primary hover:bg-primary/10 transition-colors"
									>
										+ {'{{customer.name}}'}
									</button>
								</div>
							</Card.Content>
						</Card.Root>

						<!-- ITEM TEMPLATE CARD (CRITICAL FOR MULTI-PRODUCT RENDERING) -->
						<Card.Root class="border-primary/20 bg-primary/[0.01] shadow-xs">
							<Card.Header class="pb-3">
								<div class="flex items-center justify-between gap-2">
									<div class="flex items-center gap-2 text-primary">
										<CakeIcon class="size-4" />
										<Card.Title class="text-sm font-bold">Format per Item Produk (itemTemplate)</Card.Title>
									</div>
									<span class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
										Diulang untuk setiap kue
									</span>
								</div>
								<Card.Description class="text-xs text-muted-foreground">
									Format teks untuk setiap baris produk. Semua item pesanan nantinya otomatis digabungkan ke variabel <code class="font-mono font-bold text-primary">{'{{products}}'}</code> di pesan WhatsApp.
								</Card.Description>
							</Card.Header>
							<Card.Content class="space-y-3 pt-0">
								<!-- QUICK ITEM VARIABLE BUTTONS -->
								<div class="flex flex-wrap items-center gap-1 rounded-lg border border-border/50 bg-background/80 p-2 shadow-2xs">
									<span class="mr-1 text-[11px] font-semibold text-muted-foreground">Sisipkan ke Item:</span>
									{#each [
										{ key: 'product.index', label: 'No' },
										{ key: 'product.name', label: 'Nama' },
										{ key: 'product.quantity', label: 'Qty' },
										{ key: 'product.price', label: 'Harga' },
										{ key: 'product.subtotal', label: 'Subtotal' },
										{ key: 'product.variant', label: 'Varian' },
										{ key: 'product.size', label: 'Ukuran' },
										{ key: 'product.flavor', label: 'Rasa' }
									] as pVar}
										<button
											type="button"
											onclick={() => {
												activeTargetField = 'itemTemplate';
												insertVariable(pVar.key);
											}}
											class="flex items-center gap-0.5 rounded border border-border bg-muted/40 px-2 py-1 text-[11px] font-medium text-foreground transition-[transform,background-color] duration-150 active:scale-95 hover:border-primary hover:bg-primary/5 hover:text-primary"
										>
											<PlusIcon class="size-3 text-primary" />
											<span>{pVar.label}</span>
										</button>
									{/each}
								</div>

								<Textarea
									id="itemTemplate"
									name="itemTemplate"
									bind:ref={itemTemplateRef}
									bind:value={itemTemplate}
									onfocus={() => (activeTargetField = 'itemTemplate')}
									rows={3}
									placeholder={'{{product.index}}. {{product.name}} (x{{product.quantity}}) - Rp {{product.subtotal}}'}
									class="min-h-24 resize-y bg-background font-mono text-xs leading-relaxed"
								/>
							</Card.Content>
						</Card.Root>

						<!-- WHATSAPP MAIN MESSAGE TEMPLATE CARD -->
						<Card.Root class="border-border/70 shadow-xs">
							<Card.Header class="pb-3">
								<div class="flex items-center justify-between gap-2">
									<div class="flex items-center gap-2 text-emerald-600">
										<MessageSquareTextIcon class="size-4" />
										<Card.Title class="text-sm font-bold">Template Pesan WhatsApp (messageTemplate)</Card.Title>
									</div>
									<span class="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
										Pesan Utama
									</span>
								</div>
								<Card.Description class="text-xs">
									Pesan invoice lengkap yang diterima pelanggan. Gunakan <code class="font-mono font-bold text-emerald-600">{'{{products}}'}</code> untuk menampilkan daftar kue dari format item di atas.
								</Card.Description>
							</Card.Header>
							<Card.Content class="space-y-3 pt-0">
								<div class="flex items-center justify-between gap-2 rounded-lg bg-emerald-500/5 px-3 py-2 text-xs text-emerald-900 dark:text-emerald-200">
									<div class="flex items-center gap-1.5">
										<SparklesIcon class="size-3.5 text-emerald-600" />
										<span>Format WhatsApp: <strong>*tebal*</strong>, <em>_miring_</em>, <del>~coret~</del></span>
									</div>
									<button
										type="button"
										onclick={() => {
											activeTargetField = 'messageTemplate';
											insertVariable('products');
										}}
										class="font-mono font-bold text-emerald-700 underline hover:text-emerald-800 dark:text-emerald-400"
									>
										+ Sisipkan {'{{products}}'}
									</button>
								</div>

								<Textarea
									id="messageTemplate"
									name="messageTemplate"
									bind:ref={messageTemplateRef}
									bind:value={messageTemplate}
									onfocus={() => (activeTargetField = 'messageTemplate')}
									rows={14}
									placeholder="*INVOICE PESANAN*..."
									class="min-h-72 resize-y bg-muted/10 font-mono text-xs leading-relaxed"
								/>
							</Card.Content>
						</Card.Root>

						<!-- PALET VARIABEL 1-KLIK (ONE-CLICK VARIABLE PALETTE) -->
						<Card.Root class="overflow-hidden border-border/70 shadow-xs">
							<Card.Header class="border-b bg-muted/30 pb-3">
								<div class="flex flex-wrap items-center justify-between gap-3">
									<div class="flex items-center gap-2">
										<SparklesIcon class="size-4 text-primary" />
										<div>
											<Card.Title class="text-sm font-bold">Palet Variabel 1-Klik</Card.Title>
											<Card.Description class="text-xs">
												Klik variabel untuk menyisipkan langsung ke kursor teks aktif (<span class="font-semibold text-primary">{activeTargetField === 'itemTemplate' ? 'Format Item' : activeTargetField === 'emailSubjectTemplate' ? 'Subjek Email' : 'Pesan WhatsApp'}</span>)
											</Card.Description>
										</div>
									</div>

									<!-- SEARCH VARIABLES -->
									<div class="relative w-full sm:w-48">
										<SearchIcon class="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
										<Input
											type="search"
											bind:value={variableSearch}
											placeholder="Cari variabel..."
											class="h-8 pl-8 text-xs bg-background"
										/>
									</div>
								</div>

								<!-- CATEGORY FILTER CHIPS -->
								<div class="mt-3 flex flex-wrap items-center gap-1.5 pt-1">
									{#each VARIABLE_CATEGORIES as cat}
										<button
											type="button"
											onclick={() => (selectedCategory = cat.id)}
											class={cn(
												'rounded-lg px-2.5 py-1 text-xs font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.97]',
												selectedCategory === cat.id
													? 'bg-primary text-primary-foreground shadow-2xs'
													: 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
											)}
										>
											{cat.label}
										</button>
									{/each}
								</div>
							</Card.Header>

							<Card.Content class="p-4">
								{#if filteredVariables.length === 0}
									<div class="py-8 text-center text-xs text-muted-foreground">
										Tidak ada variabel yang sesuai dengan pencarian "{variableSearch}".
									</div>
								{:else}
									<div class="grid gap-2 sm:grid-cols-2">
										{#each filteredVariables as v}
											{@const isJustInserted = insertedKey === v.key}
											<button
												type="button"
												onclick={() => insertVariable(v.key)}
												class={cn(
													'group flex flex-col items-start gap-1 rounded-xl border p-2.5 text-left transition-[border-color,background-color,transform,box-shadow] duration-150 active:scale-[0.98]',
													isJustInserted
														? 'border-emerald-500 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-500/20 dark:bg-emerald-950/30'
														: 'border-border/70 bg-card hover:border-primary/50 hover:bg-accent/40'
												)}
											>
												<div class="flex w-full items-center justify-between gap-1.5">
													<code class="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-bold text-primary group-hover:bg-primary/10">
														{'{{' + v.key + '}}'}
													</code>
													{#if isJustInserted}
														<span class="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600">
															<CheckIcon class="size-3" /> Disisipkan
														</span>
													{:else}
														<span class="text-[10px] font-semibold text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
															+ Sisipkan
														</span>
													{/if}
												</div>
												<div class="text-xs font-semibold text-foreground">
													{v.label}
												</div>
												<div class="text-[11px] leading-tight text-muted-foreground">
													{v.description}
												</div>
											</button>
										{/each}
									</div>
								{/if}
							</Card.Content>
						</Card.Root>

						<!-- SUBMIT / SAVE ACTIONS -->
						<div class="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background/95 p-4 shadow-lg backdrop-blur">
							<div class="text-xs text-muted-foreground">
								<span class="font-medium text-foreground">Tips:</span> Tekan <kbd class="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Ctrl+S</kbd> / <kbd class="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Cmd+S</kbd> untuk menyimpan cepat.
							</div>

							<Button
								id="save-template-submit"
								type="submit"
								disabled={savingTemplate}
								class="h-11 rounded-xl bg-primary px-6 font-bold text-white shadow-md transition-transform duration-150 active:scale-[0.98] hover:bg-[#724828]"
							>
								{#if savingTemplate}
									<Spinner data-icon="inline-start" /> Menyimpan...
								{:else}
									<SaveIcon class="size-4" /> Simpan Template Invoice
								{/if}
							</Button>
						</div>
					</form>
				</div>

				<!-- RIGHT COLUMN: LIVE WHATSAPP CHAT SIMULATOR & EMAIL PREVIEW -->
				<div class="space-y-4 lg:sticky lg:top-6 lg:col-span-5">
					<!-- SIMULATOR CONTROL BAR -->
					<div class="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-card p-2.5 shadow-2xs">
						<div class="flex items-center gap-2 text-xs font-bold text-foreground">
							<SmartphoneIcon class="size-4 text-emerald-600" />
							<span>Simulator Tampilan Real-Time</span>
						</div>

						<div class="flex items-center gap-1 rounded-lg bg-muted p-0.5 text-[11px]">
							<button
								type="button"
								onclick={() => (sampleType = 'single')}
								class={cn(
									'rounded-md px-2 py-1 font-medium transition-colors',
									sampleType === 'single' ? 'bg-background font-bold text-foreground shadow-2xs' : 'text-muted-foreground'
								)}
							>
								1 Item
							</button>
							<button
								type="button"
								onclick={() => (sampleType = 'multi')}
								class={cn(
									'rounded-md px-2 py-1 font-medium transition-colors',
									sampleType === 'multi' ? 'bg-background font-bold text-foreground shadow-2xs' : 'text-muted-foreground'
								)}
							>
								2 Item + Box
							</button>
						</div>
					</div>

					<!-- WHATSAPP PHONE MOCKUP -->
					<div class="overflow-hidden rounded-3xl border-2 border-slate-800/20 bg-slate-950 p-2 shadow-2xl dark:border-slate-700">
						<!-- PHONE SCREEN -->
						<div class="overflow-hidden rounded-2xl bg-[#EFEAE2] text-slate-900 shadow-inner dark:bg-[#0B141A] dark:text-slate-100">
							<!-- WHATSAPP CHAT APP BAR -->
							<div class="flex items-center justify-between bg-[#075E54] px-3 py-2.5 text-white dark:bg-[#202C33]">
								<div class="flex items-center gap-2.5">
									<div class="flex size-9 items-center justify-center rounded-full bg-primary/20 text-white font-bold text-xs ring-1 ring-white/30">
										🍰
									</div>
									<div>
										<div class="flex items-center gap-1 text-xs font-bold leading-tight">
											<span>dessertbyfir</span>
											<span class="size-3.5 rounded-full bg-emerald-400 text-[9px] text-slate-900 flex items-center justify-center">✓</span>
										</div>
										<div class="text-[10px] text-emerald-100/80 leading-tight">Online · WhatsApp Official</div>
									</div>
								</div>
								<div class="text-[10px] font-mono opacity-80">
									PREVIEW
								</div>
							</div>

							<!-- CHAT BODY WALLPAPER -->
							<div class="relative min-h-[460px] max-h-[580px] overflow-y-auto p-3 space-y-3 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#334155_1px,transparent_1px)]">
								<!-- DATE CHIP -->
								<div class="flex justify-center">
									<span class="rounded-lg bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-slate-600 shadow-2xs backdrop-blur dark:bg-slate-800/90 dark:text-slate-300">
										HARI INI
									</span>
								</div>

								<!-- OUTGOING CHAT BUBBLE -->
								<div class="flex justify-end">
									<div class="relative max-w-[92%] rounded-2xl rounded-tr-xs bg-[#E7FFDB] p-3 text-[12px] leading-relaxed text-slate-900 shadow-md dark:bg-[#005C4B] dark:text-slate-100">
										<!-- RENDERED HTML MESSAGE -->
										<div class="break-words font-sans space-y-1 select-text">
											{#if formattedWhatsAppHtml}
												{@html formattedWhatsAppHtml}
											{:else}
												<span class="text-xs italic text-slate-400">Pesan WhatsApp kosong...</span>
											{/if}
										</div>

										<!-- TIMESTAMP & DOUBLE BLUE CHECK -->
										<div class="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-500 dark:text-slate-300">
											<span>14:32</span>
											<span class="text-sky-500 font-bold">✓✓</span>
										</div>
									</div>
								</div>
							</div>

							<!-- CHAT INPUT BAR MOCKUP -->
							<div class="flex items-center gap-2 border-t border-slate-300/50 bg-[#F0F2F5] p-2 dark:border-slate-800 dark:bg-[#202C33]">
								<div class="flex-1 rounded-full bg-white px-3 py-1.5 text-xs text-slate-400 shadow-2xs dark:bg-[#2A3942] dark:text-slate-500">
									Ketik balasan konfirmasi...
								</div>
								<div class="flex size-7 items-center justify-center rounded-full bg-[#00A884] text-white text-xs shadow-xs">
									▶
								</div>
							</div>
						</div>
					</div>

					<!-- EMAIL SUBJECT PREVIEW CARD -->
					<Card.Root class="border-border/70 shadow-2xs">
						<Card.Header class="p-3 pb-1">
							<div class="flex items-center gap-2 text-xs font-bold text-foreground">
								<MailIcon class="size-3.5 text-primary" />
								<span>Preview Subjek Email Pelanggan</span>
							</div>
						</Card.Header>
						<Card.Content class="p-3 pt-1">
							<div class="rounded-lg border bg-muted/40 p-2.5 text-xs">
								<div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
									<span class="font-bold text-foreground">Dari:</span> dessertbyfir &lt;order@dessertbyfir.com&gt;
								</div>
								<div class="mt-1 flex items-center gap-1.5 font-bold text-foreground">
									<span class="text-[11px] text-muted-foreground font-normal">Subjek:</span>
									<span class="truncate">{previewData.emailSubject || '(Subjek Kosong)'}</span>
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				</div>
			</div>
		</div>
	{/if}
</AdminPage>
