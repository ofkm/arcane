<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import SearchIcon from '@lucide/svelte/icons/search';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import DatabaseIcon from '@lucide/svelte/icons/database';
	import UserIcon from '@lucide/svelte/icons/user';
	import ShieldIcon from '@lucide/svelte/icons/shield';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { m } from '$lib/paraglide/messages';
	import type { Settings } from '$lib/types/settings.type';
	import settingsStore from '$lib/stores/config-store';
	import { settingsAPI } from '$lib/services/api';
	import GeneralSettingsForm from './forms/general-settings-form.svelte';
	import DockerSettingsForm from './forms/docker-settings-form.svelte';
	import SecuritySettingsForm from './forms/security-settings-form.svelte';

	interface SettingMeta {
		key: string;
		label: string;
		type: string;
	}

	interface SettingsCategory {
		id: string;
		title: string;
		description: string;
		icon: any;
		url: string;
		keywords: string[];
		settings: SettingMeta[];
		matchingSettings?: SettingMeta[];
		relevanceScore?: number;
	}

	let { data } = $props();
	let currentSettings = $state(data.settings);
	let searchQuery = $state('');
	let showSearchResults = $state(false);
	let searchResults = $state<SettingsCategory[]>([]);

	// Settings categories with metadata
	const settingsCategories: SettingsCategory[] = [
		{
			id: 'general',
			title: m.general_title(),
			description: m.general_description(),
			icon: SettingsIcon,
			url: '/settings/general',
			keywords: ['projects', 'directory', 'base', 'url', 'gravatar', 'avatars', 'general', 'core'],
			settings: [
				{ key: 'projectsDirectory', label: m.general_projects_directory_label(), type: 'text' },
				{ key: 'baseServerUrl', label: m.general_base_url_label(), type: 'text' },
				{ key: 'enableGravatar', label: m.general_enable_gravatar_label(), type: 'boolean' }
			]
		},
		{
			id: 'docker',
			title: m.docker_title(),
			description: 'Configure Docker settings, polling, and auto-updates',
			icon: DatabaseIcon,
			url: '/settings/docker',
			keywords: ['docker', 'polling', 'auto', 'update', 'prune', 'interval', 'images'],
			settings: [
				{ key: 'pollingEnabled', label: m.docker_enable_polling_label(), type: 'boolean' },
				{ key: 'pollingInterval', label: m.docker_polling_interval_label(), type: 'number' },
				{ key: 'autoUpdate', label: m.docker_auto_update_label(), type: 'boolean' },
				{ key: 'autoUpdateInterval', label: m.docker_auto_update_interval_label(), type: 'number' },
				{ key: 'dockerPruneMode', label: m.docker_prune_action_label(), type: 'select' }
			]
		},
		{
			id: 'security',
			title: m.security_title(),
			description: 'Manage authentication and security settings',
			icon: ShieldIcon,
			url: '/settings/security',
			keywords: ['security', 'auth', 'authentication', 'oidc', 'local', 'session', 'timeout', 'password', 'policy'],
			settings: [
				{ key: 'authLocalEnabled', label: m.security_local_auth_label(), type: 'boolean' },
				{ key: 'authOidcEnabled', label: m.security_oidc_auth_label(), type: 'boolean' },
				{ key: 'authSessionTimeout', label: m.security_session_timeout_label(), type: 'number' },
				{ key: 'authPasswordPolicy', label: m.security_password_policy_label(), type: 'select' }
			]
		},
		{
			id: 'users',
			title: m.users_title(),
			description: m.users_subtitle(),
			icon: UserIcon,
			url: '/settings/users',
			keywords: ['users', 'accounts', 'admin', 'roles', 'management'],
			settings: []
		}
	];

	// Search functionality
	$effect(() => {
		if (searchQuery.trim()) {
			showSearchResults = true;
			performSearch();
		} else {
			showSearchResults = false;
			searchResults = [];
		}
	});

	function performSearch() {
		const query = searchQuery.toLowerCase().trim();
		const results: SettingsCategory[] = [];

		settingsCategories.forEach(category => {
			// Check if category matches
			const categoryMatch = 
				category.title.toLowerCase().includes(query) ||
				category.description.toLowerCase().includes(query) ||
				category.keywords.some(keyword => keyword.includes(query));

			// Check individual settings
			const matchingSettings = category.settings.filter(setting => 
				setting.key.toLowerCase().includes(query) ||
				setting.label.toLowerCase().includes(query)
			);

			if (categoryMatch || matchingSettings.length > 0) {
				const categoryResult: SettingsCategory = {
					...category,
					matchingSettings: matchingSettings.length > 0 ? matchingSettings : category.settings,
					relevanceScore: categoryMatch ? 10 : matchingSettings.length
				};
				results.push(categoryResult);
			}
		});

		// Sort by relevance
		searchResults = results.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
	}

	async function updateSettingsConfig(updatedSettings: Partial<Settings>) {
		try {
			await settingsAPI.updateSettings(updatedSettings as any);
			currentSettings = { ...currentSettings, ...updatedSettings };
			settingsStore.set(currentSettings);
			settingsStore.reload();
		} catch (error) {
			console.error('Error updating settings:', error);
			throw error;
		}
	}

	function navigateToCategory(categoryUrl: string) {
		goto(categoryUrl);
	}

	function clearSearch() {
		searchQuery = '';
		showSearchResults = false;
	}
</script>

<div class="settings-dashboard px-4 py-6">
	<!-- Header -->
	<div class="mb-8">
		<div class="from-background/60 via-background/40 to-background/60 relative overflow-hidden rounded-xl border bg-gradient-to-br p-6 shadow-sm">
			<div class="bg-primary/10 pointer-events-none absolute -right-10 -top-10 size-40 rounded-full blur-3xl"></div>
			<div class="bg-muted/40 pointer-events-none absolute -bottom-10 -left-10 size-40 rounded-full blur-3xl"></div>
			<div class="relative">
				<div class="flex items-start justify-between">
					<div class="flex items-start gap-4">
						<div class="bg-primary/10 text-primary ring-primary/20 flex size-10 items-center justify-center rounded-lg ring-1">
							<SettingsIcon class="size-5" />
						</div>
						<div>
							<h1 class="text-2xl font-bold tracking-tight">{m.sidebar_settings()}</h1>
							<p class="text-muted-foreground mt-1">Configure and customize your Arcane experience</p>
						</div>
					</div>
				</div>
				
				<!-- Search Bar -->
				<div class="relative mt-6 max-w-md">
					<SearchIcon class="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
					<input
						type="text"
						placeholder="Search settings..."
						bind:value={searchQuery}
						class="bg-background/50 border-border/50 pl-10 backdrop-blur-sm flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
					/>
					{#if showSearchResults}
						<Button
							variant="ghost"
							size="sm"
							onclick={clearSearch}
							class="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
						>
							×
						</Button>
					{/if}
				</div>
			</div>
		</div>
	</div>

	{#if !showSearchResults}
		<!-- Categories Grid -->
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each settingsCategories as category}
				<Card class="hover:shadow-md group cursor-pointer transition-all duration-200 hover:border-primary/20">
					<button
						onclick={() => navigateToCategory(category.url)}
						class="w-full p-6 text-left"
					>
						<div class="flex items-start justify-between">
							<div class="flex items-start gap-4">
								<div class="bg-primary/5 text-primary ring-primary/10 group-hover:bg-primary/10 flex size-12 items-center justify-center rounded-lg ring-1 transition-colors">
									<svelte:component this={category.icon} class="size-6" />
								</div>
								<div class="min-w-0 flex-1">
									<h3 class="text-base font-semibold">{category.title}</h3>
									<p class="text-muted-foreground mt-1 text-sm">{category.description}</p>
									<p class="text-muted-foreground mt-2 text-xs">
										{category.settings.length} {category.settings.length === 1 ? 'setting' : 'settings'}
									</p>
								</div>
							</div>
							<ChevronRightIcon class="text-muted-foreground group-hover:text-foreground size-4 transition-colors" />
						</div>
					</button>
				</Card>
			{/each}
		</div>
	{:else}
		<!-- Search Results -->
		<div class="space-y-8">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-semibold">
					Search Results for "{searchQuery}" ({searchResults.length} {searchResults.length === 1 ? 'result' : 'results'})
				</h2>
			</div>

			{#if searchResults.length === 0}
				<div class="text-center py-12">
					<SearchIcon class="text-muted-foreground mx-auto size-12 mb-4" />
					<h3 class="text-lg font-medium mb-2">No settings found</h3>
					<p class="text-muted-foreground">Try adjusting your search terms or browse categories above.</p>
				</div>
			{:else}
				<!-- Inline Settings Forms -->
				<div class="space-y-6">
					{#each searchResults as result}
						<div class="bg-background/40 rounded-lg border p-6 shadow-sm">
							<div class="mb-6 flex items-center gap-3">
								<svelte:component this={result.icon} class="text-primary size-5" />
								<h3 class="text-lg font-semibold">{result.title}</h3>
							</div>

							<!-- Render appropriate settings form based on category -->
							{#if result.id === 'general'}
								<GeneralSettingsForm settings={currentSettings} callback={updateSettingsConfig} />
							{:else if result.id === 'docker'}
								<DockerSettingsForm settings={currentSettings} callback={updateSettingsConfig} />
							{:else if result.id === 'security'}
								<SecuritySettingsForm 
									settings={currentSettings} 
									oidcStatus={data.oidcStatus}
									callback={updateSettingsConfig} 
								/>
							{:else if result.id === 'users'}
								<div class="text-center py-8">
									<UserIcon class="text-muted-foreground mx-auto size-12 mb-4" />
									<h4 class="text-base font-medium mb-2">User Management</h4>
									<p class="text-muted-foreground mb-4">Manage user accounts and permissions</p>
									<Button onclick={() => navigateToCategory(result.url)}>
										Go to User Management
									</Button>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.settings-dashboard :global(.settings-page) {
		padding-left: 0;
		padding-right: 0;
		padding-top: 0;
		padding-bottom: 0;
	}

	.settings-dashboard :global(.settings-grid) {
		margin-top: 0;
	}

	.settings-dashboard :global(.settings-grid .w-full) {
		padding: 0;
	}
</style>
