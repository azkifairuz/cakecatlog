<script>
	import { page } from '$app/stores';
	import AdminSidebar from '$lib/components/admin/AdminSidebar.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { Toaster } from '$lib/components/ui/sonner';
	import { cn } from '$lib/utils';
	import { ChartBar, Info, ListPlus, LogOut, Menu, MessageCircle, Package, ShoppingCart, Tags, Image } from 'lucide-svelte';

	let { children } = $props();
	let sidebarOpen = $state(false);
	let mobileMoreOpen = $state(false);
	const navItems = [
		{ href: '/admin/dashboard', label: 'Analytics', icon: ChartBar },
		{ href: '/admin/dashboard/orders', label: 'Orders', icon: ShoppingCart },
		{ href: '/admin/dashboard/products', label: 'Products', icon: Package },
		{ href: '/admin/dashboard/categories', label: 'Categories', icon: Tags },
		{ href: '/admin/dashboard/addons', label: 'Addons', icon: ListPlus },
		{ href: '/admin/dashboard/banners', label: 'Banners', icon: Image },
		{ href: '/admin/dashboard/site-info', label: 'Info Toko', icon: Info },
		{ href: '/admin/dashboard/whatsapp', label: 'WhatsApp', icon: MessageCircle }
	];
	const primaryMobileNav = navItems.slice(0, 3);
	const secondaryMobileNav = navItems.slice(3);
	const pageTitles = Object.fromEntries(navItems.map((item) => [item.href, item.label]));
	let pageTitle = $derived(pageTitles[$page.url.pathname] ?? 'Dashboard');
	let isSecondaryMobileActive = $derived(secondaryMobileNav.some((item) => item.href === $page.url.pathname));

	function isActive(href) {
		return href === '/admin/dashboard' ? $page.url.pathname === href : $page.url.pathname.startsWith(href);
	}
</script>

<svelte:head><title>{pageTitle} | dessertbyfir Admin</title></svelte:head>

<Sidebar.Provider bind:open={sidebarOpen} class="bg-muted/40 text-foreground" style="--sidebar-width: 14rem; --sidebar-width-icon: 4.5rem;">
	<AdminSidebar {navItems} />
	<Sidebar.Inset class="min-w-0 bg-muted/40">
			<header class="sticky top-0 z-30 flex h-14 items-center border-b bg-background/95 px-4 backdrop-blur md:hidden">
				<span class="font-semibold text-primary">dessertbyfir Admin</span>
				<span class="ml-auto text-sm text-muted-foreground">{pageTitle}</span>
			</header>
			<main class="min-w-0 overflow-x-hidden p-4 pb-24 md:p-5 md:pb-5 lg:p-6">{@render children()}</main>
	</Sidebar.Inset>

	<nav class="fixed inset-x-0 bottom-0 z-40 grid h-[68px] grid-cols-4 border-t bg-background px-2 pb-safe shadow-[0_-8px_24px_rgb(0_0_0/0.05)] md:hidden">
			{#each primaryMobileNav as item}
				{@const Icon = item.icon}
				<a href={item.href} aria-current={isActive(item.href) ? 'page' : undefined} class={cn('my-1 flex flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.97]', isActive(item.href) ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}>
					<Icon class="size-5" /><span>{item.label}</span>
				</a>
			{/each}
			<button type="button" onclick={() => (mobileMoreOpen = true)} class={cn('my-1 flex flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.97]', isSecondaryMobileActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}>
				<Menu class="size-5" /><span>Lainnya</span>
			</button>
	</nav>
</Sidebar.Provider>

<Sheet.Root bind:open={mobileMoreOpen}>
	<Sheet.Content side="bottom" class="rounded-t-xl p-4 pb-8">
		<Sheet.Header><Sheet.Title>Menu lainnya</Sheet.Title><Sheet.Description>Akses pengaturan dan fitur admin lainnya.</Sheet.Description></Sheet.Header>
		<nav class="grid grid-cols-2 gap-2">
			{#each secondaryMobileNav as item}
				{@const Icon = item.icon}
				<a href={item.href} onclick={() => (mobileMoreOpen = false)} class={cn('flex h-12 items-center gap-3 rounded-lg border px-3 text-sm font-medium', isActive(item.href) ? 'border-primary bg-primary/10 text-primary' : 'bg-background text-foreground')}><Icon class="size-4" />{item.label}</a>
			{/each}
		</nav>
		<form action="/admin/logout" method="POST"><Button type="submit" variant="outline" class="w-full"><LogOut data-icon="inline-start" />Logout</Button></form>
	</Sheet.Content>
</Sheet.Root>

<Toaster position="top-right" richColors />
