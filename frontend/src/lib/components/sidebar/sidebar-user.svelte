<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as Button from '$lib/components/ui/button/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import type { User } from '$lib/types/user.type';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import { mode, toggleMode } from 'mode-watcher';
	import { cn } from '$lib/utils';
	import settingsStore from '$lib/stores/config-store';
	import { m } from '$lib/paraglide/messages';
	import * as Select from '$lib/components/ui/select/index.js';
	import { getLocale, type Locale } from '$lib/paraglide/runtime';
	import userStore from '$lib/stores/user-store';
	import { setLocale } from '$lib/utils/locale.util';
	import UserAPIService from '$lib/services/api/user-api-service';

	let { user, isCollapsed }: { user: User; isCollapsed: boolean } = $props();
	const sidebar = useSidebar();

	async function getGravatarUrl(email: string | undefined, size = 40): Promise<string> {
		if (!email) return '';

		const encoder = new TextEncoder();
		const data = encoder.encode(email.toLowerCase().trim());
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

		return `https://www.gravatar.com/avatar/${hash}?s=${size}`;
	}

	const userApi = new UserAPIService();
	const currentLocale = getLocale();
	const locales: Record<string, string> = {
		en: 'English',
		es: 'Español',
		nl: 'Nederlands',
		zh: 'Chinese'
	};

	async function updateLocale(locale: Locale) {
		await userApi.update(user.id, { ...$userStore!, locale });
		await setLocale(locale);
	}
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Sidebar.MenuButton
						size="lg"
						class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground w-full"
						{...props}
					>
						{#if user && user.displayName}
							<Avatar.Root class="size-8 rounded-lg">
								{#if $settingsStore.enableGravatar}
									{#await getGravatarUrl(user?.email)}
										<Avatar.Image src="/img/profile.jpg" alt={user.displayName} />
									{:then url}
										<Avatar.Image src={url || '/img/profile.jpg'} alt={user.displayName} />
									{:catch _}
										<Avatar.Image src="/img/profile.jpg" alt={user.displayName} />
									{/await}
								{:else}
									<Avatar.Image src="/img/profile.jpg" alt={user.displayName} />
								{/if}
								<Avatar.Fallback
									class="from-primary/20 to-primary/10 text-primary border-primary/20 rounded-lg border bg-gradient-to-br"
								>
									{user.displayName?.charAt(0).toUpperCase()}
								</Avatar.Fallback>
							</Avatar.Root>
							{#if !isCollapsed}
								<div class="grid flex-1 pl-0 text-left text-sm leading-tight">
									<span class="truncate font-medium">{user.displayName}</span>
									<span class="truncate text-xs">{user.email}</span>
								</div>
							{/if}
						{/if}
					</Sidebar.MenuButton>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content
				class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
				side={sidebar.isMobile ? 'bottom' : 'right'}
				align="end"
				sideOffset={12}
			>
				<DropdownMenu.Label class="p-0 font-normal">
					<div class="flex items-center gap-2 py-1.5 text-left text-sm">
						<Avatar.Root class="size-8 rounded-lg">
							{#if $settingsStore.enableGravatar}
								{#await getGravatarUrl(user?.email)}
									<Avatar.Image src="/img/profile.jpg" alt={user.displayName} />
								{:then url}
									<Avatar.Image src={url || '/img/profile.jpg'} alt={user.displayName} />
								{:catch _}
									<Avatar.Image src="/img/profile.jpg" alt={user.displayName} />
								{/await}
							{:else}
								<Avatar.Image src="/img/profile.jpg" alt={user.displayName} />
							{/if}
							<Avatar.Fallback
								class="from-primary/20 to-primary/10 text-primary border-primary/20 rounded-lg border bg-gradient-to-br"
							>
								{user.displayName?.charAt(0).toUpperCase()}
							</Avatar.Fallback>
						</Avatar.Root>
						{#if !isCollapsed}
							<div class="grid flex-1 text-left text-sm leading-tight">
								<span class="truncate font-medium">{user.displayName}</span>
								<span class="truncate text-xs">{user.email}</span>
							</div>
						{/if}
					</div>
				</DropdownMenu.Label>
				<DropdownMenu.Separator />

				<!-- Locale picker -->
				<div class="px-3 py-2">
					<Select.Root type="single" value={currentLocale} onValueChange={(v) => updateLocale(v as Locale)}>
						<Select.Trigger class="h-9 w-full max-w-[240px]" aria-label={m.common_select_locale()}>
							{locales[currentLocale]}
						</Select.Trigger>
						<Select.Content>
							{#each Object.entries(locales) as [value, label]}
								<Select.Item {value}>{label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<DropdownMenu.Group class="px-3 pb-2">
					<Button.Root
						variant="ghost"
						class={cn(
							'text-muted-foreground flex w-full items-center rounded-xl text-sm font-medium transition-all duration-200 hover:bg-gradient-to-br',
							'h-11 justify-start gap-3 px-3 py-2.5'
						)}
						title={m.common_toggle_theme()}
						onclick={toggleMode}
					>
						<div class="group-hover:bg-muted-foreground/10 rounded-lg bg-transparent p-1 transition-colors duration-200">
							{#if mode.current === 'dark'}
								<Sun size={16} class="transition-transform duration-200" />
							{:else}
								<Moon size={16} class="transition-transform duration-200" />
							{/if}
						</div>
						<span class="font-medium">{m.common_toggle_theme()}</span>
					</Button.Root>
				</DropdownMenu.Group>

				<DropdownMenu.Separator />
				<form action="/auth/logout" method="POST" class="px-3 py-2">
					<Button.Root
						variant="ghost"
						class={cn(
							'text-muted-foreground flex w-full items-center rounded-xl text-sm font-medium transition-all duration-200',
							'hover:from-destructive/10 hover:to-destructive/5 hover:text-destructive hover:bg-gradient-to-br hover:shadow-md active:scale-[0.98]',
							'h-11 justify-start gap-3 px-3 py-2.5'
						)}
						title={m.common_logout()}
						type="submit"
					>
						<div class="group-hover:bg-destructive/10 rounded-lg bg-transparent p-1 transition-colors duration-200">
							<LogOutIcon size={16} class="transition-transform duration-200" />
						</div>
						<span class="font-medium">{m.common_logout()}</span>
					</Button.Root>
				</form>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>
