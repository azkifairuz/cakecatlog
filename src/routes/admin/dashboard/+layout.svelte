<script>
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { LogOut, Package, ShoppingCart, Tags } from 'lucide-svelte';

	let { children } = $props();
</script>

<div class="flex min-h-screen w-full flex-col bg-muted/40 pb-16 sm:pb-0">
	<aside class="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-background xl:flex">
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
	</aside>

	<div class="flex flex-col xl:gap-4 xl:py-4 xl:pl-64">
		<header class="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 xl:static xl:h-auto xl:border-0 xl:bg-transparent xl:px-6">
			<div class="flex xl:hidden">
				<span class="font-semibold">Cake Admin</span>
			</div>
			<div class="ml-auto xl:hidden">
				<form action="/admin/logout" method="POST">
					<Button type="submit" variant="ghost" size="icon">
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
	<div class="fixed bottom-0 left-0 z-40 w-full h-[72px] bg-background border-t xl:hidden flex items-center px-1 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
		<a href="/admin/dashboard" class="flex flex-col items-center justify-center gap-1.5 flex-1 h-[85%] mx-0.5 rounded-xl active:scale-95 transition-all { $page.url.pathname === '/admin/dashboard' ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:bg-muted/50' }">
			<ShoppingCart class="h-[22px] w-[22px]" />
			<span class="text-[11px] font-semibold">Orders</span>
		</a>
		<a href="/admin/dashboard/products" class="flex flex-col items-center justify-center gap-1.5 flex-1 h-[85%] mx-0.5 rounded-xl active:scale-95 transition-all { $page.url.pathname === '/admin/dashboard/products' ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:bg-muted/50' }">
			<Package class="h-[22px] w-[22px]" />
			<span class="text-[11px] font-semibold">Products</span>
		</a>
		<a href="/admin/dashboard/categories" class="flex flex-col items-center justify-center gap-1.5 flex-1 h-[85%] mx-0.5 rounded-xl active:scale-95 transition-all { $page.url.pathname === '/admin/dashboard/categories' ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:bg-muted/50' }">
			<Tags class="h-[22px] w-[22px]" />
			<span class="text-[11px] font-semibold">Categories</span>
		</a>
	</div>
</div>
