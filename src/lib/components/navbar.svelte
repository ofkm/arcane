<script lang="ts">
	import { Home, Box, Image, Network, HardDrive, Settings, Menu, X, ChevronRight, ChevronLeft, FileStack, ExternalLink, LogOut, Sun, Moon, ChevronDown, UserIcon, Shield, Bell, Palette, Database, type Icon as IconType, ShieldCheck } from '@lucide/svelte';
	import { page } from '$app/state';
	import { fly, slide } from 'svelte/transition';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { cn } from '$lib/utils';
	import { browser } from '$app/environment';
	import { mode, toggleMode } from 'mode-watcher';
	import type { AppVersionInformation } from '$lib/types/application-configuration';
	import type { User } from '$lib/types/user.type';

	type SubMenuItem = {
		href: string;
		label: string;
		icon: typeof IconType;
	};

	type MenuItem = {
		href?: string;
		label: string;
		icon: typeof IconType;
		children?: SubMenuItem[];
	};

	let {
		items = [
			{ href: '/', label: 'Dashboard', icon: Home },
			{ href: '/containers', label: 'Containers', icon: Box },
			{ href: '/stacks', label: 'Stacks', icon: FileStack },
			{ href: '/images', label: 'Images', icon: Image },
			{ href: '/networks', label: 'Networks', icon: Network },
			{ href: '/volumes', label: 'Volumes', icon: HardDrive },
			{
				label: 'Settings',
				icon: Settings,
				children: [
					{ href: '/settings/general', label: 'General', icon: Settings },
					{ href: '/settings/docker', label: 'Docker', icon: Database },
					{ href: '/settings/users', label: 'Users', icon: UserIcon },
					// { href: '/settings/rbac', label: 'RBAC', icon: ShieldCheck },
					{ href: '/settings/security', label: 'Security', icon: Shield }
					// { href: '/settings/notifications', label: 'Notifications', icon: Bell },
					// { href: '/settings/appearance', label: 'Appearance', icon: Palette }
				]
			}
		] as MenuItem[],
		versionInformation,
		user
	} = $props<{
		items?: MenuItem[];
		versionInformation?: AppVersionInformation;
		user?: User | null;
	}>();

	let isOpen = $state(false);
	let isCollapsed = $state(false);
	let expandedSections = $state<Set<string>>(new Set());

	if (browser) {
		const savedState = localStorage.getItem('sidebarCollapsed');
		isCollapsed = savedState === 'true';

		const savedExpanded = localStorage.getItem('expandedSections');
		if (savedExpanded) {
			try {
				expandedSections = new Set(JSON.parse(savedExpanded));
			} catch (e) {
				expandedSections = new Set();
			}
		}
	}

	function toggleCollapse() {
		isCollapsed = !isCollapsed;
		if (browser) {
			localStorage.setItem('sidebarCollapsed', isCollapsed.toString());
		}
	}

	function toggleSection(label: string) {
		if (expandedSections.has(label)) {
			expandedSections.delete(label);
		} else {
			expandedSections.add(label);
		}
		expandedSections = new Set(expandedSections);

		if (browser) {
			localStorage.setItem('expandedSections', JSON.stringify([...expandedSections]));
		}
	}

	function isActiveItem(href: string): boolean {
		return page.url.pathname === href || (page.url.pathname.startsWith(href) && href !== '/');
	}

	function isActiveSection(children: SubMenuItem[]): boolean {
		return children.some((child) => isActiveItem(child.href));
	}

	const updateAvailable = $derived(versionInformation?.updateAvailable);
</script>

<!-- Mobile menu button - Modern floating design -->
<Button variant="ghost" size="icon" class="md:hidden fixed top-4 right-4 z-50 h-11 w-11 rounded-xl shadow-lg bg-background/80 backdrop-blur-xl border border-border/50 hover:shadow-xl hover:scale-105 transition-all duration-200" onclick={() => (isOpen = !isOpen)} aria-label={isOpen ? 'Close menu' : 'Open menu'}>
	{#if isOpen}
		<X size={20} class="transition-transform duration-200" />
	{:else}
		<Menu size={20} class="transition-transform duration-200" />
	{/if}
</Button>

<!-- Main sidebar container - Modern glassmorphism design -->
<div class={cn('fixed md:sticky top-0 left-0 h-screen md:h-dvh transition-all duration-300 ease-out', 'bg-gradient-to-b from-card/95 to-background/90 backdrop-blur-xl border-r border-border/40 shadow-2xl z-40 flex flex-col', isCollapsed ? 'w-[70px]' : 'w-64', isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0')}>
	<!-- Logo header - Enhanced with subtle glow effect -->
	<div class={cn('flex items-center h-16 transition-all duration-300 border-b border-border/30', isCollapsed ? 'justify-center px-2' : 'gap-3 px-6')}>
		<div class="shrink-0 flex items-center justify-center relative">
			<img src="/img/arcane.svg" alt="Arcane" class="size-8 transition-all duration-300 drop-shadow-sm" width="32" height="32" />
			<div class="absolute inset-0 bg-primary/10 rounded-full blur-xl opacity-60"></div>
		</div>
		{#if !isCollapsed}
			<div class="flex flex-col justify-center min-w-0">
				<span class="text-lg font-bold tracking-tight leading-none bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text"> Arcane </span>
				<span class="text-xs text-muted-foreground/80 font-medium">
					v{versionInformation?.currentVersion}
				</span>
			</div>
		{/if}
	</div>

	<Separator class="opacity-30" />

	<!-- Collapse toggle button - Modern floating design -->
	<div class="hidden md:flex justify-end px-3 -mt-[11px] mb-2 relative">
		<Button variant="outline" size="icon" class="rounded-full bg-background/90 backdrop-blur-sm absolute right-0 translate-x-1/2 h-6 w-6 shadow-md border border-border/50 transition-all duration-200 hover:scale-110 hover:shadow-lg" onclick={toggleCollapse} aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
			{#if isCollapsed}
				<ChevronRight size={14} class="transition-transform duration-200" />
			{:else}
				<ChevronLeft size={14} class="transition-transform duration-200" />
			{/if}
		</Button>
	</div>

	<!-- Navigation menu - Enhanced with modern card-like styling -->
	<nav class={cn('flex-1 overflow-y-auto overflow-x-hidden modern-scrollbar', isCollapsed ? 'py-4 px-2' : 'py-4 px-4')}>
		{#each items as item (item.label)}
			{#if item.children}
				<!-- Dropdown section -->
				{@const isExpanded = expandedSections.has(item.label)}
				{@const hasActiveChild = isActiveSection(item.children)}
				{@const Icon = item.icon}

				<div class="mb-1">
					{#if isCollapsed}
						<!-- Collapsed state - show tooltip with children -->
						<button
							class={cn(
								'flex items-center justify-center rounded-xl p-3 text-sm font-medium transition-all duration-200 group w-full',
								'hover:shadow-md hover:scale-[1.02] active:scale-[0.98]',
								hasActiveChild ? 'bg-gradient-to-br from-primary/15 to-primary/10 text-primary shadow-sm ring-1 ring-primary/20' : 'text-muted-foreground hover:bg-gradient-to-br hover:from-muted/80 hover:to-muted/60 hover:text-foreground'
							)}
							title={`${item.label} (${item.children.length} items)`}
							onclick={() => toggleSection(item.label)}
						>
							<div class={cn('p-1.5 rounded-lg transition-all duration-200', hasActiveChild ? 'bg-primary/20 shadow-sm' : 'bg-transparent group-hover:bg-muted-foreground/10')}>
								<Icon size={16} class={cn('transition-colors duration-200', hasActiveChild ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
							</div>
						</button>
					{:else}
						<!-- Expanded state - full dropdown -->
						<button
							class={cn(
								'flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group w-full',
								'hover:shadow-md hover:scale-[1.02] active:scale-[0.98]',
								hasActiveChild || isExpanded ? 'bg-gradient-to-br from-primary/15 to-primary/10 text-primary shadow-sm ring-1 ring-primary/20' : 'text-muted-foreground hover:bg-gradient-to-br hover:from-muted/80 hover:to-muted/60 hover:text-foreground'
							)}
							onclick={() => toggleSection(item.label)}
						>
							<div class="flex items-center gap-3">
								<div class={cn('p-1.5 rounded-lg transition-all duration-200', hasActiveChild || isExpanded ? 'bg-primary/20 shadow-sm' : 'bg-transparent group-hover:bg-muted-foreground/10')}>
									<Icon size={16} class={cn('transition-colors duration-200', hasActiveChild || isExpanded ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
								</div>
								<span class="truncate font-medium">{item.label}</span>
							</div>
							<ChevronDown size={14} class={cn('transition-transform duration-200', isExpanded ? 'rotate-180' : '', hasActiveChild || isExpanded ? 'text-primary/70' : 'text-muted-foreground/70')} />
						</button>

						<!-- Dropdown content -->
						{#if isExpanded}
							<div class="mt-1 ml-3 border-l-2 border-border/30 pl-3 space-y-1" transition:slide={{ duration: 200 }}>
								{#each item.children as child (child.href)}
									{@const isActive = isActiveItem(child.href)}
									{@const ChildIcon = child.icon}

									<a
										href={child.href}
										class={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200', 'hover:scale-[1.01] active:scale-[0.99]', isActive ? 'bg-gradient-to-r from-primary/20 to-primary/10 text-primary shadow-sm border border-primary/20' : 'text-muted-foreground hover:bg-gradient-to-r hover:from-muted/60 hover:to-muted/40 hover:text-foreground')}
										aria-current={isActive ? 'page' : undefined}
									>
										<div class={cn('p-1 rounded-md transition-all duration-200', isActive ? 'bg-primary/30' : 'bg-transparent')}>
											<ChildIcon size={14} class="transition-colors duration-200" />
										</div>
										<span class="truncate">{child.label}</span>
										{#if isActive}
											<div class="ml-auto w-1.5 h-1.5 rounded-full bg-primary"></div>
										{/if}
									</a>
								{/each}
							</div>
						{/if}
					{/if}
				</div>
			{:else}
				<!-- Regular menu item -->
				{@const isActive = item.href ? isActiveItem(item.href) : false}
				{@const Icon = item.icon}

				<a
					href={item.href}
					class={cn(
						'flex items-center justify-between rounded-xl text-sm font-medium mb-1 transition-all duration-200 group',
						'hover:shadow-md hover:scale-[1.02] active:scale-[0.98]',
						isCollapsed ? 'px-2 py-3 flex-col gap-1' : 'px-3 py-2.5',
						isActive ? 'bg-gradient-to-br from-primary/15 to-primary/10 text-primary shadow-sm ring-1 ring-primary/20' : 'text-muted-foreground hover:bg-gradient-to-br hover:from-muted/80 hover:to-muted/60 hover:text-foreground'
					)}
					aria-current={isActive ? 'page' : undefined}
					title={isCollapsed ? item.label : undefined}
				>
					<div class={cn('flex items-center', isCollapsed ? 'justify-center' : 'gap-3')}>
						<div class={cn('p-1.5 rounded-lg transition-all duration-200', isActive ? 'bg-primary/20 shadow-sm' : 'bg-transparent group-hover:bg-muted-foreground/10')}>
							<Icon size={16} class={cn('transition-colors duration-200', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
						</div>
						{#if !isCollapsed}
							<span class="truncate font-medium">{item.label}</span>
						{/if}
					</div>

					{#if !isCollapsed && isActive}
						<ChevronRight size={14} class="text-primary/70 transition-transform duration-200" />
					{/if}
				</a>
			{/if}
		{/each}
	</nav>

	<!-- Update notification - Modern card design with enhanced styling -->
	{#if updateAvailable}
		<div class="px-4 pb-2">
			<Separator class="mb-3 opacity-30" />

			<div class={cn('transition-all rounded-xl p-3 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20', 'hover:shadow-md hover:scale-[1.02] hover:from-blue-500/15 hover:to-blue-600/10', isCollapsed ? 'text-center' : '')}>
				{#if !isCollapsed}
					<a href={versionInformation?.releaseUrl} target="_blank" rel="noopener noreferrer" class="flex items-center justify-between text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200 group">
						<div class="flex flex-col gap-1">
							<span class="text-sm font-semibold">Update available</span>
							<span class="text-xs text-blue-500/80">v{versionInformation?.newestVersion}</span>
						</div>
						<ExternalLink size={16} class="transition-transform duration-200 group-hover:scale-110" />
					</a>
				{:else}
					<a href={versionInformation?.releaseUrl} target="_blank" rel="noopener noreferrer" title="Update available: v{versionInformation?.newestVersion}" class="flex justify-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-200 hover:scale-110">
						<ExternalLink size={18} />
					</a>
				{/if}
			</div>
		</div>
	{/if}

	<!-- User controls section - Modern design with enhanced spacing -->
	<div class="mt-auto p-4 border-t border-border/30">
		{#if user && user.displayName && !isCollapsed}
			<div class="px-3 py-2.5 mb-3 text-sm font-medium text-foreground truncate flex items-center gap-3 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 transition-all duration-200" title={user.displayName}>
				<div class="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary flex items-center justify-center text-sm font-semibold border border-primary/20">
					{user.displayName.charAt(0).toUpperCase()}
				</div>
				<span class="truncate font-medium">{user.displayName}</span>
			</div>
		{/if}

		<!-- Theme toggle button - Enhanced with modern styling -->
		<Button
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
		</Button>

		<!-- Logout button - Enhanced with modern styling and hover effects -->
		<form action="/auth/logout" method="POST">
			<Button
				variant="ghost"
				class={cn('w-full flex items-center text-sm font-medium transition-all duration-200 text-muted-foreground rounded-xl', 'hover:bg-gradient-to-br hover:from-destructive/10 hover:to-destructive/5 hover:text-destructive hover:shadow-md hover:scale-[1.02] active:scale-[0.98]', isCollapsed ? 'justify-center px-2 py-3 h-11' : 'justify-start gap-3 px-3 py-2.5 h-11')}
				title={isCollapsed ? 'Logout' : undefined}
				type="submit"
			>
				<div class="p-1 rounded-lg transition-colors duration-200 bg-transparent group-hover:bg-destructive/10">
					<LogOut size={16} class="transition-transform duration-200" />
				</div>
				{#if !isCollapsed}
					<span class="font-medium">Logout</span>
				{/if}
			</Button>
		</form>
	</div>
</div>

<!-- Mobile backdrop - Enhanced with better blur and transition -->
{#if isOpen}
	<button type="button" class="md:hidden fixed inset-0 w-full h-full bg-background/60 backdrop-blur-md z-30 border-none cursor-pointer" aria-label="Close menu" onclick={() => (isOpen = false)} transition:fly={{ duration: 250, opacity: 0 }}></button>
{/if}

<style>
	.modern-scrollbar {
		scrollbar-width: thin;
		scrollbar-color: hsl(var(--border)) transparent;
	}

	.modern-scrollbar::-webkit-scrollbar {
		width: 6px;
	}

	.modern-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}

	.modern-scrollbar::-webkit-scrollbar-thumb {
		background-color: hsl(var(--border));
		border-radius: 6px;
		transition: background-color 0.2s ease;
	}

	.modern-scrollbar::-webkit-scrollbar-thumb:hover {
		background-color: hsl(var(--border) / 0.8);
	}

	:global(.dark) .modern-scrollbar::-webkit-scrollbar-thumb {
		background-color: hsl(var(--border) / 0.6);
	}

	:global(.dark) .modern-scrollbar::-webkit-scrollbar-thumb:hover {
		background-color: hsl(var(--border) / 0.8);
	}
</style>
