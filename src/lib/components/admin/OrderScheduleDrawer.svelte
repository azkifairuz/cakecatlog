<script>
	import { enhance } from '$app/forms';
	import { fade, fly } from 'svelte/transition';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import DatePicker from '$lib/components/DatePicker.svelte';
	import { toast } from 'svelte-sonner';

	let {
		open = $bindable(false),
		order = null,
		actionUrl = '?/updateSchedule',
		onSuccess
	} = $props();

	let isSubmitting = $state(false);
	let errorMessage = $state(null);

	// Form fields
	let deliveryOption = $state('delivery');
	let scheduleDate = $state('');
	let scheduleTime = $state('');

	// Compute today, tomorrow, dayAfterTomorrow in Jakarta timezone (UTC+7)
	function getRelativeDateStr(daysOffset) {
		const now = new Date();
		const wib = new Date(now.getTime() + (7 * 60 + now.getTimezoneOffset()) * 60000);
		wib.setDate(wib.getDate() + daysOffset);
		const y = wib.getFullYear();
		const m = String(wib.getMonth() + 1).padStart(2, '0');
		const d = String(wib.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}

	const todayStr = getRelativeDateStr(0);
	const tomorrowStr = getRelativeDateStr(1);
	const dayAfterTomorrowStr = getRelativeDateStr(2);

	const timePresets = [
		'09:00', '10:00', '11:00', '12:00',
		'13:00', '14:00', '15:00', '16:00',
		'17:00', '18:00', '19:00', '20:00'
	];

	// Initialize form fields when order changes or drawer opens
	$effect(() => {
		if (open && order) {
			const isPickup = (order.delivery_option || order.deliveryOption || '').toLowerCase() === 'pickup' ||
				(order.address || '').toLowerCase() === 'pickup';
			deliveryOption = isPickup ? 'pickup' : 'delivery';
			
			const existingDate = isPickup
				? (order.pickup_date || order.pickupDate || order.delivery_date || order.deliveryDate || '')
				: (order.delivery_date || order.deliveryDate || order.pickup_date || order.pickupDate || '');
			
			const rawTime = isPickup
				? (order.pickup_time || order.pickupTime || order.delivery_time || order.deliveryTime || '')
				: (order.delivery_time || order.deliveryTime || order.pickup_time || order.pickupTime || '');

			scheduleDate = existingDate ? String(existingDate).slice(0, 10) : todayStr;
			
			// Sanitize time to HH:mm for native time input
			const timeMatch = String(rawTime || '').match(/^([01]\d|2[0-3]):[0-5]\d/);
			scheduleTime = timeMatch ? timeMatch[0] : '10:00';
			errorMessage = null;
			isSubmitting = false;
		}
	});

	function formatDateNice(dateStr) {
		if (!dateStr) return '-';
		try {
			const [y, m, d] = dateStr.split('-').map(Number);
			const dt = new Date(y, m - 1, d);
			return dt.toLocaleDateString('id-ID', {
				weekday: 'long',
				day: 'numeric',
				month: 'short',
				year: 'numeric'
			});
		} catch {
			return dateStr;
		}
	}

	function close() {
		if (isSubmitting) return;
		open = false;
		errorMessage = null;
	}

	function handleKeydown(event) {
		if (event.key === 'Escape' && open) {
			close();
		}
	}

	let currentScheduleLabel = $derived.by(() => {
		if (!order) return '-';
		const opt = (order.delivery_option || order.deliveryOption || '').toLowerCase() === 'pickup' ? 'Pickup' : 'Delivery';
		const d = order.delivery_date || order.deliveryDate || order.pickup_date || order.pickupDate;
		const t = order.delivery_time || order.deliveryTime || order.pickup_time || order.pickupTime;
		return `${opt} • ${formatDateNice(d)}${t ? ` (${t})` : ''}`;
	});

	let newScheduleLabel = $derived.by(() => {
		const opt = deliveryOption === 'pickup' ? 'Pickup' : 'Delivery';
		return `${opt} • ${formatDateNice(scheduleDate)}${scheduleTime ? ` (${scheduleTime})` : ''}`;
	});

	let isScheduleChanged = $derived.by(() => {
		if (!order) return false;
		const oldOpt = (order.delivery_option || order.deliveryOption || '').toLowerCase() === 'pickup' ? 'pickup' : 'delivery';
		const oldDate = String(order.delivery_date || order.deliveryDate || order.pickup_date || order.pickupDate || '').slice(0, 10);
		const oldTime = String(order.delivery_time || order.deliveryTime || order.pickup_time || order.pickupTime || '');
		return oldOpt !== deliveryOption || oldDate !== scheduleDate || oldTime !== scheduleTime;
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open && order}
	<div class="fixed inset-0 z-50 flex flex-col justify-end md:justify-center items-center pointer-events-auto p-0 md:p-4">
		<!-- Backdrop -->
		<button
			type="button"
			class="absolute inset-0 w-full h-full bg-slate-900/40 backdrop-blur-xs cursor-default transition-opacity"
			transition:fade={{ duration: 180 }}
			onclick={close}
			aria-label="Tutup popup atur jadwal"
		></button>

		<!-- Drawer Container (Emil Design: custom curve, snappy timing, tactile scale) -->
		<div
			class="relative bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-lg mx-auto flex flex-col max-h-[92vh] z-10 border border-slate-100 overflow-hidden"
			transition:fly={{ y: 30, duration: 240, opacity: 1, easing: (t) => 1 - Math.pow(1 - t, 4) }}
			role="dialog"
			aria-modal="true"
			aria-labelledby="schedule-drawer-title"
		>
			<!-- Mobile Drag Indicator -->
			<div class="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3.5 mb-2 md:hidden"></div>

			<!-- Header -->
			<div class="flex items-start justify-between p-5 pb-4 border-b border-slate-100">
				<div class="min-w-0 pr-2">
					<div class="flex items-center gap-2 mb-1">
						<span class="text-[11px] font-black tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
							#{order.order_number}
						</span>
						<span class="text-[11px] font-bold px-2 py-0.5 rounded-full {order.status === 'Selesai' ? 'bg-emerald-100 text-emerald-800' : order.status === 'Diproses' ? 'bg-sky-100 text-sky-800' : order.status === 'Batal/Refund' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}">
							{order.status}
						</span>
					</div>
					<h3 id="schedule-drawer-title" class="text-lg font-bold text-slate-900 leading-snug truncate">
						Atur Ulang Jadwal
					</h3>
					<p class="text-xs text-slate-500 truncate mt-0.5">
						Pelanggan: <strong class="text-slate-700 font-semibold">{order.customer_name}</strong>
					</p>
				</div>
				<button
					type="button"
					onclick={close}
					aria-label="Tutup"
					class="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors active:scale-[0.92] shrink-0"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Scrollable Form Body -->
			<form
				method="POST"
				action={actionUrl}
				use:enhance={() => {
					isSubmitting = true;
					errorMessage = null;
					return async ({ result, update }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							toast.success('Jadwal pesanan berhasil diperbarui!');
							await update();
							onSuccess?.();
							close();
						} else if (result.type === 'failure') {
							errorMessage = result.data?.error || 'Gagal memperbarui jadwal pesanan.';
							toast.error(errorMessage);
						} else {
							await update();
						}
					};
				}}
				class="flex flex-col flex-1 overflow-y-auto"
			>
				<input type="hidden" name="id" value={order.id} />
				<input type="hidden" name="delivery_option" value={deliveryOption} />
				<input type="hidden" name="date" value={scheduleDate} />
				<input type="hidden" name="time" value={scheduleTime} />

				<div class="p-5 space-y-5 flex-1">
					{#if errorMessage}
						<div class="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-xl flex items-center gap-2" transition:fade={{ duration: 150 }}>
							<svg class="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<span>{errorMessage}</span>
						</div>
					{/if}

					<!-- 1. Opsi Pengiriman: Segmented Toggle -->
					<div>
						<Label class="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">
							Metode Pengiriman
						</Label>
						<div class="grid grid-cols-2 p-1 bg-slate-100 rounded-xl gap-1">
							<button
								type="button"
								onclick={() => (deliveryOption = 'delivery')}
								class="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all duration-150 active:scale-[0.97] {deliveryOption === 'delivery' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}"
							>
								<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
								</svg>
								<span>Delivery (Antar)</span>
							</button>

							<button
								type="button"
								onclick={() => (deliveryOption = 'pickup')}
								class="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all duration-150 active:scale-[0.97] {deliveryOption === 'pickup' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}"
							>
								<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
								</svg>
								<span>Pickup (Ambil)</span>
							</button>
						</div>
					</div>

					<!-- 2. Pilih Tanggal -->
					<div class="space-y-2">
						<Label class="text-xs font-bold text-slate-600 uppercase tracking-wider block">
							Pilih Tanggal {deliveryOption === 'pickup' ? 'Ambil' : 'Kirim'}
						</Label>

						<!-- Quick Date Preset Chips -->
						<div class="grid grid-cols-3 gap-2">
							<button
								type="button"
								onclick={() => (scheduleDate = todayStr)}
								class="py-2 px-2.5 rounded-xl border text-xs font-bold transition-all duration-150 active:scale-[0.96] text-center {scheduleDate === todayStr ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}"
							>
								Hari Ini
								<span class="block text-[10px] font-normal opacity-80">{todayStr.slice(8, 10)}/{todayStr.slice(5, 7)}</span>
							</button>

							<button
								type="button"
								onclick={() => (scheduleDate = tomorrowStr)}
								class="py-2 px-2.5 rounded-xl border text-xs font-bold transition-all duration-150 active:scale-[0.96] text-center {scheduleDate === tomorrowStr ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}"
							>
								Besok
								<span class="block text-[10px] font-normal opacity-80">{tomorrowStr.slice(8, 10)}/{tomorrowStr.slice(5, 7)}</span>
							</button>

							<button
								type="button"
								onclick={() => (scheduleDate = dayAfterTomorrowStr)}
								class="py-2 px-2.5 rounded-xl border text-xs font-bold transition-all duration-150 active:scale-[0.96] text-center {scheduleDate === dayAfterTomorrowStr ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}"
							>
								Lusa
								<span class="block text-[10px] font-normal opacity-80">{dayAfterTomorrowStr.slice(8, 10)}/{dayAfterTomorrowStr.slice(5, 7)}</span>
							</button>
						</div>

						<!-- Custom Date Picker -->
						<div class="pt-1">
							<DatePicker
								bind:value={scheduleDate}
								class="w-full h-11 rounded-xl bg-slate-50 border-slate-200 text-sm font-bold text-slate-800 focus-visible:ring-slate-900"
								placeholder="Pilih tanggal di kalender..."
							/>
						</div>
					</div>

					<!-- 3. Pilih Jam (Sama seperti saat membuat order: input type="time" + quick preset) -->
					<div class="space-y-2.5">
						<div class="flex items-center justify-between">
							<Label for="schedule_time_input" class="text-xs font-bold text-slate-600 uppercase tracking-wider">
								Pilih Jam {deliveryOption === 'pickup' ? 'Ambil' : 'Kirim'}
							</Label>
							<span class="text-xs text-slate-400 font-medium">Format 24 Jam</span>
						</div>

						<!-- Time Input (Same as order creation form) -->
						<div class="relative">
							<input
								type="time"
								id="schedule_time_input"
								bind:value={scheduleTime}
								required
								class="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all cursor-pointer"
							/>
						</div>

						<!-- Quick Time Preset Chips -->
						<div class="space-y-1.5 pt-1">
							<span class="text-[11px] font-semibold text-slate-400 block">Pilihan Cepat:</span>
							<div class="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
								{#each timePresets as preset}
									<button
										type="button"
										onclick={() => (scheduleTime = preset)}
										class="py-1.5 px-2 rounded-lg border text-xs font-bold transition-all duration-150 active:scale-[0.95] text-center {scheduleTime === preset ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'}"
									>
										{preset}
									</button>
								{/each}
							</div>
						</div>
					</div>

					<!-- 4. Schedule Diff Comparison Banner (Emil Design Detail) -->
					<div class="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 space-y-2 text-xs">
						<div class="flex items-center justify-between">
							<span class="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Perbandingan Jadwal</span>
							{#if isScheduleChanged}
								<span class="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md font-bold text-[10px]">
									Ada Perubahan
								</span>
							{:else}
								<span class="px-2 py-0.5 bg-slate-200 text-slate-600 rounded-md font-bold text-[10px]">
									Sama
								</span>
							{/if}
						</div>
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
							<div class="p-2.5 rounded-xl bg-white border border-slate-200/80">
								<span class="text-[10px] text-slate-400 font-bold block mb-0.5">Jadwal Sekarang:</span>
								<span class="font-bold text-slate-700 text-xs block truncate leading-tight">
									{currentScheduleLabel}
								</span>
							</div>
							<div class="p-2.5 rounded-xl bg-primary/5 border border-primary/20">
								<span class="text-[10px] text-primary font-bold block mb-0.5">Jadwal Baru:</span>
								<span class="font-bold text-slate-900 text-xs block truncate leading-tight">
									{newScheduleLabel}
								</span>
							</div>
						</div>
					</div>
				</div>

				<!-- Footer Action Button -->
				<div class="p-4 md:p-5 pt-3 border-t border-slate-100 bg-slate-50/50 flex items-center gap-3">
					<Button
						type="button"
						variant="outline"
						onclick={close}
						disabled={isSubmitting}
						class="flex-1 h-12 rounded-xl font-bold text-slate-700 border-slate-200 hover:bg-slate-100 active:scale-[0.98] transition-transform"
					>
						Batal
					</Button>

					<Button
						type="submit"
						disabled={isSubmitting || !scheduleDate}
						class="flex-2 h-12 rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-md active:scale-[0.97] transition-all gap-2"
					>
						{#if isSubmitting}
							<svg class="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							<span>Menyimpan...</span>
						{:else}
							<span>Simpan Perubahan Jadwal</span>
						{/if}
					</Button>
				</div>
			</form>
		</div>
	</div>
{/if}
