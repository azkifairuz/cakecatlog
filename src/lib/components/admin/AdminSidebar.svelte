<script>
	import { page } from '$app/stores';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { LogOut, ShoppingCart } from 'lucide-svelte';

	let { navItems } = $props();
	const sidebar = Sidebar.useSidebar();

	function isActive(href) {
		return href === '/admin/dashboard' ? $page.url.pathname === href : $page.url.pathname.startsWith(href);
	}
</script>

<Sidebar.Root collapsible="icon">
	<Sidebar.Header class="h-16 justify-center border-b p-2">
		<div class="flex items-center justify-between gap-2 group-data-[collapsible=icon]:hidden">
			<a href="/admin/dashboard" class="flex min-w-0 items-center gap-2 px-2 font-semibold text-primary">
				<ShoppingCart class="size-5 shrink-0" />
				<span class="truncate">dessertbyfir Admin</span>
			</a>
			<Sidebar.Trigger aria-label={sidebar.state === 'collapsed' ? 'Perluas sidebar' : 'Perkecil sidebar'} />
		</div>
		<div class="hidden justify-center group-data-[collapsible=icon]:flex">
			<Sidebar.Trigger aria-label="Perluas sidebar" />
		</div>
	</Sidebar.Header>

	<Sidebar.Content class="p-2">
		<Sidebar.Menu>
			{#each navItems as item}
				{@const Icon = item.icon}
				<Sidebar.MenuItem>
					<Sidebar.MenuButton
						isActive={isActive(item.href)}
						tooltipContent={item.label}
						class="mx-auto h-10 gap-3 rounded-lg px-3 transition-[background-color,color,transform] duration-150 active:scale-[0.97] data-active:bg-primary data-active:text-primary-foreground data-active:hover:bg-primary data-active:hover:text-primary-foreground group-data-[collapsible=icon]:size-10!"
					>
						{#snippet child({ props })}
							<a href={item.href} aria-current={isActive(item.href) ? 'page' : undefined} {...props}>
								<Icon />
								<span>{item.label}</span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			{/each}
		</Sidebar.Menu>
	</Sidebar.Content>

	<Sidebar.Footer class="border-t p-2">
		<form action="/admin/logout" method="POST">
			<Sidebar.Menu>
				<Sidebar.MenuItem>
					<Sidebar.MenuButton tooltipContent="Logout" class="mx-auto h-10 gap-3 px-3 group-data-[collapsible=icon]:size-10!">
						{#snippet child({ props })}
							<button type="submit" {...props}>
								<LogOut />
								<span>Logout</span>
							</button>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			</Sidebar.Menu>
		</form>
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
