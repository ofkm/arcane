<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as Button from '$lib/components/ui/button/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import type { User } from '$lib/types/user.type';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import { mode, toggleMode } from 'mode-watcher';
	import { cn } from '$lib/utils';

	let { user, isCollapsed }: { user: User; isCollapsed: boolean } = $props();
	const sidebar = useSidebar();
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Sidebar.MenuButton size="lg" class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground" {...props}>
						{#if user && user.displayName}
							<Avatar.Root class="size-8 rounded-lg">
								<div class="size-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary flex items-center justify-center text-sm font-semibold border border-primary/20">
									<Avatar.Image src={user.displayName?.charAt(0).toUpperCase()} alt={user.displayName?.charAt(0).toUpperCase()} />
									<Avatar.Fallback class="rounded-lg">{user.displayName?.charAt(0).toUpperCase()}</Avatar.Fallback>
								</div>
							</Avatar.Root>
							{#if !isCollapsed}
								<div class="grid flex-1 text-left text-sm leading-tight">
									<span class="truncate font-medium">{user.displayName}</span>
									<span class="truncate text-xs">{user.email}</span>
								</div>
								<ChevronsUpDownIcon class="ml-auto size-4" />
							{/if}
						{/if}
					</Sidebar.MenuButton>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg" side={sidebar.isMobile ? 'bottom' : 'right'} align="end" sideOffset={4}>
				<DropdownMenu.Label class="p-0 font-normal">
					<div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
						<Avatar.Root class="size-8 rounded-lg">
							<div class="size-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary flex items-center justify-center text-sm font-semibold border border-primary/20">
								<Avatar.Image src={user.displayName?.charAt(0).toUpperCase()} alt={user.displayName?.charAt(0).toUpperCase()} />
								<Avatar.Fallback class="rounded-lg">{user.displayName?.charAt(0).toUpperCase()}</Avatar.Fallback>
							</div>
						</Avatar.Root>
						<div class="grid flex-1 text-left text-sm leading-tight">
							<span class="truncate font-medium">{user.displayName}</span>
							<span class="truncate text-xs">{user.email}</span>
						</div>
					</div>
				</DropdownMenu.Label>
				<DropdownMenu.Separator />
				<DropdownMenu.Group>
					<Button.Root
						variant="ghost"
						class={cn('w-full flex items-center text-sm font-medium transition-all duration-200 text-muted-foreground hover:bg-gradient-to-br hover:from-muted/80 hover:to-muted/60 hover:text-foreground rounded-xl mb-1', 'hover:shadow-md hover:scale-[1.02] active:scale-[0.98]', isCollapsed ? 'justify-center px-2 py-3 h-11' : 'justify-start gap-3 px-3 py-2.5 h-11')}
						title={isCollapsed ? 'Toggle theme' : undefined}
						onclick={toggleMode}
					>
						<div class="p-1 rounded-lg transition-colors duration-200 bg-transparent group-hover:bg-muted-foreground/10">
							{#if mode.current === 'dark'}
								<Sun size={16} class="transition-transform duration-200" />
							{:else}
								<Moon size={16} class="transition-transform duration-200" />
							{/if}
						</div>
						{#if !isCollapsed}
							<span class="font-medium">Toggle theme</span>
						{/if}
					</Button.Root>
				</DropdownMenu.Group>
				<DropdownMenu.Separator />
				<form action="/auth/logout" method="POST">
					<Button.Root
						variant="ghost"
						class={cn('w-full flex items-center text-sm font-medium transition-all duration-200 text-muted-foreground rounded-xl', 'hover:bg-linear-to-br hover:from-destructive/10 hover:to-destructive/5 hover:text-destructive hover:shadow-md hover:scale-[1.02] active:scale-[0.98]', isCollapsed ? 'justify-center px-2 py-3 h-11' : 'justify-start gap-3 px-3 py-2.5 h-11')}
						title={isCollapsed ? 'Logout' : undefined}
						type="submit"
					>
						<div class="p-1 rounded-lg transition-colors duration-200 bg-transparent group-hover:bg-destructive/10">
							<LogOutIcon size={16} class="transition-transform duration-200" />
						</div>
						{#if !isCollapsed}
							<span class="font-medium">Logout</span>
						{/if}
					</Button.Root>
				</form>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>
