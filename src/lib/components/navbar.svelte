<script lang="ts">
	import { Home, Box, Image, Network, HardDrive, Settings, Menu, X, ChevronRight, ChevronLeft, FileStack, ExternalLink, LogOut, Sun, Moon, type Icon as IconType } from '@lucide/svelte';
	import { page } from '$app/state';
	import { fly } from 'svelte/transition';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { cn } from '$lib/utils';
	import { browser } from '$app/environment';
	import { mode, toggleMode } from 'mode-watcher';
	import type { AppVersionInformation } from '$lib/types/application-configuration';
	import type { User } from '$lib/types/user.type';

	let {
		items = [
			{ href: '/', label: 'Dashboard', icon: Home },
			{ href: '/containers', label: 'Containers', icon: Box },
			{ href: '/stacks', label: 'Stacks', icon: FileStack },
			{ href: '/images', label: 'Images', icon: Image },
			{ href: '/networks', label: 'Networks', icon: Network },
			{ href: '/volumes', label: 'Volumes', icon: HardDrive },
			{ href: '/settings', label: 'Settings', icon: Settings }
		] as MenuItem[],
		versionInformation,
		user
	} = $props<{
		items?: MenuItem[];
		versionInformation?: AppVersionInformation;
		user?: User | null;
	}>();

	type MenuItem = {
		href: string;
		label: string;
		icon: typeof IconType;
	};

	let isOpen = $state(false);
	let isCollapsed = $state(false);

	if (browser) {
		const savedState = localStorage.getItem('sidebarCollapsed');
		isCollapsed = savedState === 'true';
	}

	function toggleCollapse() {
		isCollapsed = !isCollapsed;
		if (browser) {
			localStorage.setItem('sidebarCollapsed', isCollapsed.toString());
		}
	}

	const updateAvailable = $derived(versionInformation?.updateAvailable);
</script>

<!-- Mobile menu button - Enhanced with better positioning and shadow -->
<Button variant="ghost" size="icon" class="md:hidden fixed top-4 right-4 z-50 shadow-md bg-background/95 backdrop-blur-sm border" onclick={() => (isOpen = !isOpen)} aria-label={isOpen ? 'Close menu' : 'Open menu'}>
	{#if isOpen}
		<X size={18} />
	{:else}
		<Menu size={18} />
	{/if}
</Button>

<!-- Main sidebar container - Enhanced with smoother transitions and better shadows -->
<div class={cn('fixed md:sticky top-0 left-0 h-screen md:h-dvh transition-all duration-300 ease-in-out', 'bg-card border-r shadow-md z-40', 'flex flex-col', isCollapsed ? 'w-[70px]' : 'w-64', isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0')}>
	<!-- Logo header - Enhanced spacing and alignment -->
	<div class={cn('flex items-center h-16 transition-all duration-300', isCollapsed ? 'justify-center px-2' : 'gap-3 px-5')}>
		<div class="shrink-0 flex items-center justify-center">
			<img src="/img/arcane.svg" alt="Arcane" class={cn('transition-all duration-300', isCollapsed ? 'size-15' : 'size-15')} width={isCollapsed ? '24' : '28'} height={isCollapsed ? '24' : '28'} />
		</div>
		{#if !isCollapsed}
			<div class="flex flex-col justify-center">
				<span class="text-lg font-bold tracking-tight leading-none">Arcane</span>
				<span class="text-xs text-muted-foreground">v{versionInformation?.currentVersion}</span>
			</div>
		{/if}
	</div>

	<Separator />

	<!-- Collapse toggle button - Enhanced positioning and animation -->
	<div class="hidden md:flex justify-end px-2 -mt-[9px] mb-1.5 relative">
		<Button variant="outline" size="icon" class="rounded-full bg-background/95 backdrop-blur-sm absolute right-0 translate-x-1/2 size-[22px] shadow-sm border transition-transform duration-300 hover:scale-110" onclick={toggleCollapse} aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
			{#if isCollapsed}
				<ChevronRight size={12} />
			{:else}
				<ChevronLeft size={12} />
			{/if}
		</Button>
	</div>

	<!-- Navigation menu - Enhanced with better spacing and transitions -->
	<nav class={cn('p-2 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar', isCollapsed && 'py-2 px-1')}>
		{#each items as item (item.href)}
			{@const isActive = page.url.pathname === item.href || (page.url.pathname.startsWith(item.href) && item.href !== '/')}
			{@const Icon = item.icon}

			<a
				href={item.href}
				class={cn('flex items-center justify-between rounded-lg text-sm font-medium', isCollapsed ? 'px-2 py-3 my-1 flex-col gap-1' : 'px-3 py-2.5 my-0.5', 'transition-all duration-200 group', isActive ? 'bg-primary/12 text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground')}
				aria-current={isActive ? 'page' : undefined}
				title={isCollapsed ? item.label : undefined}
			>
				<div class={cn('flex items-center', isCollapsed ? 'justify-center' : 'gap-3')}>
					<div class={cn('p-1.5 rounded-md transition-colors duration-200', isActive ? 'bg-primary/15' : 'bg-transparent group-hover:bg-muted-foreground/10')}>
						<Icon size={16} class={cn('transition-colors duration-200', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
					</div>
					{#if !isCollapsed}
						<span class="truncate">{item.label}</span>
					{/if}
				</div>

				{#if !isCollapsed && isActive}
					<ChevronRight size={14} class="text-primary opacity-70" />
				{/if}
			</a>
		{/each}
	</nav>

	<!-- Update notification - Enhanced with better visibility -->
	{#if updateAvailable}
		<Separator />

		<div class={cn('transition-all px-3 py-3', isCollapsed ? 'text-center' : '', 'bg-blue-500/10 dark:bg-blue-500/5 my-1 mx-2 rounded-md')}>
			{#if !isCollapsed}
				<a href={versionInformation.releaseUrl} target="_blank" rel="noopener noreferrer" class="flex items-center justify-between text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">
					<span>Update available</span>
					<span class="flex items-center">
						v{versionInformation.newestVersion}
						<ExternalLink class="ml-1 size-3.5" />
					</span>
				</a>
			{:else}
				<a href={versionInformation.releaseUrl} target="_blank" rel="noopener noreferrer" title="Update available: v{versionInformation.newestVersion}" class="flex justify-center text-blue-600 dark:text-blue-400">
					<ExternalLink class="size-4" />
				</a>
			{/if}
		</div>
	{/if}

	<!-- User controls section - Enhanced with better spacing and hover effects -->
	<div class="mt-auto p-2">
		<Separator class="mb-2" />

		{#if user && user.displayName && !isCollapsed}
			<div class="px-3 py-2.5 text-sm font-medium text-muted-foreground truncate flex items-center gap-2" title={user.displayName}>
				<div class="size-6 rounded-full bg-primary/15 text-primary flex items-center justify-center">
					{user.displayName.charAt(0).toUpperCase()}
				</div>
				<span class="truncate">{user.displayName}</span>
			</div>
		{/if}

		<!-- Theme toggle button - Enhanced with better hover effects -->
		<Button variant="ghost" class={cn('w-full flex items-center text-sm font-medium transition-colors text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg', isCollapsed ? 'justify-center px-2 py-3' : 'justify-start gap-3 px-3 py-2.5')} title={isCollapsed ? 'Toggle theme' : 'Toggle theme'} onclick={toggleMode}>
			<div class={cn('p-1 rounded-md transition-colors', 'bg-transparent group-hover:bg-muted-foreground/10')}>
				{#if mode.current === 'dark'}
					<Sun size={16} />
				{:else}
					<Moon size={16} />
				{/if}
			</div>
			{#if !isCollapsed}
				<span>Toggle theme</span>
			{/if}
		</Button>

		<!-- Logout button - Enhanced with better hover effects -->
		<form action="/auth/logout" method="POST">
			<Button variant="ghost" class={cn('w-full flex items-center text-sm font-medium transition-colors text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg', isCollapsed ? 'justify-center px-2 py-3' : 'justify-start gap-3 px-3 py-2.5')} title={isCollapsed ? 'Logout' : undefined} type="submit">
				<div class={cn('p-1 rounded-md transition-colors', 'bg-transparent group-hover:bg-muted-foreground/10')}>
					<LogOut size={16} />
				</div>
				{#if !isCollapsed}
					<span>Logout</span>
				{/if}
			</Button>
		</form>
	</div>
</div>

<!-- Mobile backdrop - Enhanced with smoother blur effect -->
{#if isOpen}
	<button type="button" class="md:hidden fixed inset-0 w-full h-full bg-background/60 backdrop-blur-sm z-30 border-none" aria-label="Close menu" onclick={() => (isOpen = false)} transition:fly={{ duration: 200, y: -5 }}></button>
{/if}

<style>
	.custom-scrollbar {
		scrollbar-width: thin;
		scrollbar-color: var(--scrollbar-thumb) transparent;
	}

	.custom-scrollbar::-webkit-scrollbar {
		width: 6px;
	}

	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}

	.custom-scrollbar::-webkit-scrollbar-thumb {
		background-color: var(--scrollbar-thumb, rgba(0, 0, 0, 0.2));
		border-radius: 3px;
	}

	:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
		--scrollbar-thumb: rgba(255, 255, 255, 0.2);
	}
</style>
