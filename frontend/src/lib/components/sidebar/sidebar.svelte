<script lang="ts" module>
	import { navigationItems } from '$lib/config/navigation-config';
</script>

<script lang="ts">
	import SidebarItemGroup from './sidebar-itemgroup.svelte';
	import SidebarUser from './sidebar-user.svelte';
	import SidebarEnvSwitcher from './sidebar-env-switcher.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import type { ComponentProps } from 'svelte';
	import type { User } from '$lib/types/user.type';
	import type { AppVersionInformation } from '$lib/types/application-configuration';
	import SidebarLogo from './sidebar-logo.svelte';
	import SidebarUpdatebanner from './sidebar-updatebanner.svelte';
	import SidebarPinButton from './sidebar-pin-button.svelte';
	import userStore from '$lib/stores/user-store';
	import { m } from '$lib/paraglide/messages';
	import * as Button from '$lib/components/ui/button/index.js';
	import LogOutIcon from '@lucide/svelte/icons/log-out';

	let {
		ref = $bindable(null),
		collapsible = 'icon',
		variant = 'floating',
		user,
		versionInformation,
		...restProps
	}: ComponentProps<typeof Sidebar.Root> & {
		versionInformation: AppVersionInformation;
		user?: User | null;
	} = $props();

	const sidebar = useSidebar();

	let storeUser: User | null = $state(null);
	$effect(() => {
		const unsub = userStore.subscribe((u) => (storeUser = u));
		return unsub;
	});
	const effectiveUser = $derived(user ?? storeUser);

	const isCollapsed = $derived(sidebar.state === 'collapsed' && !sidebar.isHovered);
	const isAdmin = $derived(!!effectiveUser?.roles?.includes('admin'));
</script>

<Sidebar.Root {collapsible} {variant} {...restProps}>
	<Sidebar.Header>
		<div class="relative">
			<SidebarLogo {isCollapsed} {versionInformation} />
			{#if !isCollapsed || sidebar.isHovered}
				<div class="absolute right-0 top-0 -mr-1 -mt-1">
					<SidebarPinButton />
				</div>
			{/if}
		</div>
		<SidebarEnvSwitcher {isAdmin} />
	</Sidebar.Header>
	<Sidebar.Content>
		<SidebarItemGroup label={m.sidebar_management()} items={navigationItems.managementItems} />
		<SidebarItemGroup label={m.sidebar_customization()} items={navigationItems.customizationItems} />
		{#if isAdmin}
			<SidebarItemGroup label={m.sidebar_environments()} items={navigationItems.environmentItems} />
			<SidebarItemGroup label={m.sidebar_administration()} items={navigationItems.settingsItems} />
		{/if}
	</Sidebar.Content>
	<Sidebar.Footer>
		<SidebarUpdatebanner {isCollapsed} {versionInformation} updateAvailable={versionInformation.updateAvailable} />
		{#if effectiveUser}
			{#if isCollapsed}
				<div class="px-0 pb-2">
					<div class="flex flex-col items-center gap-2">
						<SidebarUser {isCollapsed} user={effectiveUser} />
					</div>
				</div>
			{:else}
				<div class="px-3 pb-2">
					<div class="flex items-center gap-2">
						<SidebarUser {isCollapsed} user={effectiveUser} />
						<form action="/auth/logout" method="POST" class="ml-auto">
							<Button.Root
								variant="ghost"
								title={m.common_logout()}
								type="submit"
								class="text-muted-foreground hover:text-destructive hover:bg-destructive/10 size-9 rounded-xl p-0"
							>
								<LogOutIcon size={16} />
							</Button.Root>
						</form>
					</div>
				</div>
			{/if}
		{/if}
		{#if !isCollapsed}
			<div class="border-border/30 border-t px-3 py-2">
				<div class="text-muted-foreground/60 text-center text-xs font-medium">
					{m.sidebar_version({ version: versionInformation?.currentVersion ?? m.common_unknown() })}
				</div>
			</div>
		{:else}
			<div class="border-border/30 flex justify-center border-t px-1 py-2">
				<div class="text-muted-foreground/60 text-[10px] font-medium">
					{versionInformation?.currentVersion?.replace(/^v/, '') ?? '?'}
				</div>
			</div>
		{/if}
	</Sidebar.Footer>
</Sidebar.Root>
