<script>
	import { groupAdminNavItems } from '$lib/admin-menu.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Package from '@lucide/svelte/icons/package';
	import Users from '@lucide/svelte/icons/users';
	import Settings from '@lucide/svelte/icons/settings';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import LogOut from '@lucide/svelte/icons/log-out';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';

	let { navItems, activePath = '/admin/dashboard', onLogout } = $props();
	const sidebar = Sidebar.useSidebar();
	const groupedNav = $derived(groupAdminNavItems(navItems));
	const groupIcons = { catalog: Package, operations: Users, settings: Settings };

	function isActive(href) {
		return href === '/admin/dashboard' ? activePath === href : (activePath === href || activePath.startsWith(`${href}/`));
	}
</script>

<Sidebar.Root collapsible="icon" aria-label="Navigasi admin">
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

	<Sidebar.Content class="p-2 group-data-[collapsible=icon]:overflow-y-auto" data-sveltekit-preload-code="eager">
		<Sidebar.Menu>
			{#each groupedNav.primary as item}
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
			{#each groupedNav.groups as group}
				{@const GroupIcon = groupIcons[group.id]}
				<Sidebar.MenuItem>
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props: triggerProps })}
								<Sidebar.MenuButton
									{...triggerProps}
									isActive={group.items.some((item) => isActive(item.href))}
									tooltipContent={group.label}
									aria-label={group.label}
									class="mx-auto h-10 gap-3 rounded-lg px-3 data-active:bg-primary data-active:text-primary-foreground data-active:hover:bg-primary data-active:hover:text-primary-foreground group-data-[collapsible=icon]:size-10!"
								>
									<GroupIcon /><span>{group.label}</span>
									<ChevronRight class="ml-auto group-data-[collapsible=icon]:hidden" />
								</Sidebar.MenuButton>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content side="right" align="start" sideOffset={12} class="w-56 max-h-[calc(100dvh-2rem)]">
							<DropdownMenu.Label>{group.label}</DropdownMenu.Label>
							{#each group.items as item}
								{@const Icon = item.icon}
								<DropdownMenu.Item class={isActive(item.href) ? 'bg-primary/10 text-primary' : ''}>
									{#snippet child({ props })}
										<a href={item.href} aria-current={isActive(item.href) ? 'page' : undefined} {...props}><Icon /><span>{item.label}</span></a>
									{/snippet}
								</DropdownMenu.Item>
							{/each}
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</Sidebar.MenuItem>
			{/each}
		</Sidebar.Menu>
	</Sidebar.Content>

	<Sidebar.Footer class="border-t p-2">
		<form action="/admin/logout" method="POST" onsubmit={onLogout}>
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
