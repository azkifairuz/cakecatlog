<script>
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { ChartBar, Info, LogOut, MessageCircle, Package, ShoppingCart, Tags, Image } from 'lucide-svelte';

	let { children } = $props();
</script>

<div class="flex min-h-screen w-full flex-col bg-slate-50 pb-16 sm:pb-0 font-sans text-[#4A3B32]">
	<header class="hidden md:flex sticky top-0 z-30 h-16 items-center gap-6 border-b border-[#8C5A35]/10 bg-white px-6 shadow-sm">
		<div class="flex items-center gap-2 font-bold text-[#8C5A35] font-['Playfair_Display'] text-xl">
			<ShoppingCart class="h-6 w-6" />
			<span>desertbyfir Admin</span>
		</div>

		<nav class="hidden lg:flex items-center gap-2 text-sm font-semibold ml-6">
			<a href="/admin/dashboard" class="px-4 py-2.5 rounded-full transition-all {$page.url.pathname === '/admin/dashboard' ? 'bg-[#8C5A35]/10 text-[#8C5A35]' : 'text-[#4A3B32]/70 hover:text-[#8C5A35] hover:bg-[#8C5A35]/5'}">Analytics</a>
			<a href="/admin/dashboard/orders" class="px-4 py-2.5 rounded-full transition-all {$page.url.pathname === '/admin/dashboard/orders' ? 'bg-[#8C5A35]/10 text-[#8C5A35]' : 'text-[#4A3B32]/70 hover:text-[#8C5A35] hover:bg-[#8C5A35]/5'}">Orders</a>
			<a href="/admin/dashboard/products" class="px-4 py-2.5 rounded-full transition-all {$page.url.pathname === '/admin/dashboard/products' ? 'bg-[#8C5A35]/10 text-[#8C5A35]' : 'text-[#4A3B32]/70 hover:text-[#8C5A35] hover:bg-[#8C5A35]/5'}">Products</a>
			<a href="/admin/dashboard/banners" class="px-4 py-2.5 rounded-full transition-all {$page.url.pathname === '/admin/dashboard/banners' ? 'bg-[#8C5A35]/10 text-[#8C5A35]' : 'text-[#4A3B32]/70 hover:text-[#8C5A35] hover:bg-[#8C5A35]/5'}">Banners</a>
			<a href="/admin/dashboard/site-info" class="px-4 py-2.5 rounded-full transition-all {$page.url.pathname === '/admin/dashboard/site-info' ? 'bg-[#8C5A35]/10 text-[#8C5A35]' : 'text-[#4A3B32]/70 hover:text-[#8C5A35] hover:bg-[#8C5A35]/5'}">Info Toko</a>
			<a href="/admin/dashboard/categories" class="px-4 py-2.5 rounded-full transition-all {$page.url.pathname === '/admin/dashboard/categories' ? 'bg-[#8C5A35]/10 text-[#8C5A35]' : 'text-[#4A3B32]/70 hover:text-[#8C5A35] hover:bg-[#8C5A35]/5'}">Categories</a>
			<a href="/admin/dashboard/whatsapp" class="px-4 py-2.5 rounded-full transition-all {$page.url.pathname === '/admin/dashboard/whatsapp' ? 'bg-[#8C5A35]/10 text-[#8C5A35]' : 'text-[#4A3B32]/70 hover:text-[#8C5A35] hover:bg-[#8C5A35]/5'}">WhatsApp</a>
		</nav>

		<div class="ml-auto hidden lg:block">
			<form action="/admin/logout" method="POST">
				<Button type="submit" variant="outline" size="sm" class="rounded-full border-[#8C5A35]/20 text-[#8C5A35] hover:bg-[#8C5A35]/10 hover:text-[#8C5A35]">Logout</Button>
			</form>
		</div>
	</header>
	<!-- <aside class="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-background xl:flex">
		<div class="flex h-14 items-center border-b px-4 xl:h-[60px] xl:px-6">
			<a href="/admin/dashboard" class="flex items-center gap-2 font-semibold">
				<ShoppingCart class="h-6 w-6" />
				<span class="">Cake Admin</span>
			</a>
		</div>
		<div class="flex-1 overflow-auto py-6">
			<nav class="grid items-start gap-2 px-2 text-base font-medium xl:px-4">
				<a
					href="/admin/dashboard"
					class="flex items-center gap-4 rounded-xl px-4 py-4 transition-all hover:text-primary hover:bg-muted/50 { $page.url.pathname === '/admin/dashboard' ? 'bg-muted text-primary shadow-sm' : 'text-muted-foreground' }"
				>
					<ChartBar class="h-5 w-5" />
					Analytics
				</a>
				<a
					href="/admin/dashboard/orders"
					class="flex items-center gap-4 rounded-xl px-4 py-4 transition-all hover:text-primary hover:bg-muted/50 { $page.url.pathname === '/admin/dashboard/orders' ? 'bg-muted text-primary shadow-sm' : 'text-muted-foreground' }"
				>
					<ShoppingCart class="h-5 w-5" />
					Orders
				</a>
				<a
					href="/admin/dashboard/products"
					class="flex items-center gap-4 rounded-xl px-4 py-4 transition-all hover:text-primary hover:bg-muted/50 { $page.url.pathname === '/admin/dashboard/products' ? 'bg-muted text-primary shadow-sm' : 'text-muted-foreground' }"
				>
					<Package class="h-5 w-5" />
					Products
				</a>
				<a
					href="/admin/dashboard/categories"
					class="flex items-center gap-4 rounded-xl px-4 py-4 transition-all hover:text-primary hover:bg-muted/50 { $page.url.pathname === '/admin/dashboard/categories' ? 'bg-muted text-primary shadow-sm' : 'text-muted-foreground' }"
				>
					<Tags class="h-5 w-5" />
					Categories
				</a>
			</nav>
		</div>
		<div class="mt-auto p-4">
			<form action="/admin/logout" method="POST">
				<Button type="submit" variant="outline" class="w-full justify-start gap-3 py-6 rounded-xl text-base font-medium hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all">
					<LogOut class="h-5 w-5" />
					Logout
				</Button>
			</form>
		</div>
	</aside> -->

	<div class="flex flex-col xl:gap-4 xl:py-4 xl:justify-center ">
		<header class="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-[#8C5A35]/10 bg-white px-4 md:hidden shadow-sm">
			<div class="flex font-bold text-[#8C5A35] font-['Playfair_Display'] text-lg">
				<span>desertbyfir Admin</span>
			</div>
			<div class="ml-auto">
				<form action="/admin/logout" method="POST">
					<Button type="submit" variant="ghost" size="icon" class="text-[#8C5A35] hover:bg-[#8C5A35]/10">
						<LogOut class="h-5 w-5" />
					</Button>
				</form>
			</div>
		</header>
		<main class="grid flex-1 items-start gap-4 p-4 xl:px-6 xl:py-0 md:gap-8 overflow-x-hidden mb-20 xl:mb-0">
			{@render children()}
		</main>
	</div>

	<!-- Mobile & Tablet Bottom Nav -->
	<div class="fixed bottom-0 left-0 z-40 flex h-[72px] w-full items-center overflow-x-auto border-t border-[#8C5A35]/10 bg-white px-1 pb-safe shadow-[0_-4px_20px_rgba(140,90,53,0.05)] [scrollbar-width:none] xl:hidden [&::-webkit-scrollbar]:hidden">
		<a href="/admin/dashboard" class="flex h-[85%] min-w-[64px] flex-none flex-col items-center justify-center gap-1.5 mx-0.5 rounded-2xl active:scale-95 transition-all { $page.url.pathname === '/admin/dashboard' ? 'text-[#8C5A35] bg-[#8C5A35]/10' : 'text-[#4A3B32]/50 hover:bg-[#8C5A35]/5 hover:text-[#8C5A35]' }">
			<ChartBar class="h-[22px] w-[22px]" />
			<span class="text-[11px] font-bold">Analytics</span>
		</a>
		<a href="/admin/dashboard/orders" class="flex h-[85%] min-w-[64px] flex-none flex-col items-center justify-center gap-1.5 mx-0.5 rounded-2xl active:scale-95 transition-all { $page.url.pathname === '/admin/dashboard/orders' ? 'text-[#8C5A35] bg-[#8C5A35]/10' : 'text-[#4A3B32]/50 hover:bg-[#8C5A35]/5 hover:text-[#8C5A35]' }">
			<ShoppingCart class="h-[22px] w-[22px]" />
			<span class="text-[11px] font-bold">Orders</span>
		</a>
		<a href="/admin/dashboard/products" class="flex h-[85%] min-w-[64px] flex-none flex-col items-center justify-center gap-1.5 mx-0.5 rounded-2xl active:scale-95 transition-all { $page.url.pathname === '/admin/dashboard/products' ? 'text-[#8C5A35] bg-[#8C5A35]/10' : 'text-[#4A3B32]/50 hover:bg-[#8C5A35]/5 hover:text-[#8C5A35]' }">
			<Package class="h-[22px] w-[22px]" />
			<span class="text-[11px] font-bold">Products</span>
		</a>
		<a href="/admin/dashboard/categories" class="flex h-[85%] min-w-[64px] flex-none flex-col items-center justify-center gap-1.5 mx-0.5 rounded-2xl active:scale-95 transition-all { $page.url.pathname === '/admin/dashboard/categories' ? 'text-[#8C5A35] bg-[#8C5A35]/10' : 'text-[#4A3B32]/50 hover:bg-[#8C5A35]/5 hover:text-[#8C5A35]' }">
			<Tags class="h-[22px] w-[22px]" />
			<span class="text-[11px] font-bold">Categories</span>
		</a>
		<a href="/admin/dashboard/banners" class="flex h-[85%] min-w-[64px] flex-none flex-col items-center justify-center gap-1.5 mx-0.5 rounded-2xl active:scale-95 transition-all { $page.url.pathname === '/admin/dashboard/banners' ? 'text-[#8C5A35] bg-[#8C5A35]/10' : 'text-[#4A3B32]/50 hover:bg-[#8C5A35]/5 hover:text-[#8C5A35]' }">
			<Image class="h-[22px] w-[22px]" />
			<span class="text-[11px] font-bold">Banners</span>
		</a>
		<a href="/admin/dashboard/site-info" class="flex h-[85%] min-w-[64px] flex-none flex-col items-center justify-center gap-1.5 mx-0.5 rounded-2xl active:scale-95 transition-all { $page.url.pathname === '/admin/dashboard/site-info' ? 'text-[#8C5A35] bg-[#8C5A35]/10' : 'text-[#4A3B32]/50 hover:bg-[#8C5A35]/5 hover:text-[#8C5A35]' }">
			<Info class="h-[22px] w-[22px]" />
			<span class="text-[11px] font-bold">Info</span>
		</a>
		<a href="/admin/dashboard/whatsapp" class="flex h-[85%] min-w-[64px] flex-none flex-col items-center justify-center gap-1.5 mx-0.5 rounded-2xl active:scale-95 transition-all { $page.url.pathname === '/admin/dashboard/whatsapp' ? 'text-[#8C5A35] bg-[#8C5A35]/10' : 'text-[#4A3B32]/50 hover:bg-[#8C5A35]/5 hover:text-[#8C5A35]' }">
			<MessageCircle class="h-[22px] w-[22px]" />
			<span class="text-[11px] font-bold">WhatsApp</span>
		</a>
	</div>
</div>
