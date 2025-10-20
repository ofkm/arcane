<script lang="ts">
	import { goto } from '$app/navigation';
	import SearchIcon from '@lucide/svelte/icons/search';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import DatabaseIcon from '@lucide/svelte/icons/database';
	import UserIcon from '@lucide/svelte/icons/user';
	import ShieldIcon from '@lucide/svelte/icons/shield';
	import NavigationIcon from '@lucide/svelte/icons/navigation';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { m } from '$lib/paraglide/messages';
	import { UiConfigDisabledTag } from '$lib/components/badges/index.js';

	interface SettingMeta {
		key: string;
		label: string;
		type: string;
		keywords?: string[];
		description?: string;
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
			keywords: ['general', 'core', 'basic', 'main'],
			settings: [
				{
					key: 'projectsDirectory',
					label: m.general_projects_directory_label(),
					type: 'text',
					description: 'Configure where project files are stored',
					keywords: ['projects', 'directory', 'path', 'folder', 'location', 'storage', 'files', 'compose', 'docker-compose']
				},
				{
					key: 'baseServerUrl',
					label: m.general_base_url_label(),
					type: 'text',
					description: 'Set the base URL for the application',
					keywords: ['base', 'url', 'server', 'domain', 'host', 'endpoint', 'address', 'link']
				},
				{
					key: 'enableGravatar',
					label: m.general_enable_gravatar_label(),
					type: 'boolean',
					description: 'Enable Gravatar profile pictures for users',
					keywords: ['gravatar', 'avatar', 'profile', 'picture', 'image', 'user', 'photo']
				}
			]
		},
		{
			id: 'docker',
			title: m.docker_title(),
			description: 'Configure Docker settings, polling, and auto-updates',
			icon: DatabaseIcon,
			url: '/settings/docker',
			keywords: ['docker', 'container', 'image'],
			settings: [
				{
					key: 'pollingEnabled',
					label: m.docker_enable_polling_label(),
					type: 'boolean',
					description: 'Enable automatic checking for image updates',
					keywords: ['polling', 'check', 'monitor', 'watch', 'scan', 'detection', 'automatic']
				},
				{
					key: 'pollingInterval',
					label: m.docker_polling_interval_label(),
					type: 'number',
					description: 'How often to check for image updates',
					keywords: ['interval', 'frequency', 'schedule', 'time', 'minutes', 'period', 'delay']
				},
				{
					key: 'autoUpdate',
					label: m.docker_auto_update_label(),
					type: 'boolean',
					description: 'Automatically update containers when new images are available',
					keywords: ['auto', 'update', 'automatic', 'upgrade', 'refresh', 'restart', 'deploy']
				},
				{
					key: 'autoUpdateInterval',
					label: m.docker_auto_update_interval_label(),
					type: 'number',
					description: 'Interval between automatic updates',
					keywords: ['auto', 'update', 'interval', 'frequency', 'schedule', 'automatic', 'timing']
				},
				{
					key: 'dockerPruneMode',
					label: m.docker_prune_action_label(),
					type: 'select',
					description: 'Configure how unused Docker images are cleaned up',
					keywords: ['prune', 'cleanup', 'clean', 'remove', 'delete', 'unused', 'dangling', 'space', 'disk']
				}
			]
		},
		{
			id: 'security',
			title: m.security_title(),
			description: 'Manage authentication and security settings',
			icon: ShieldIcon,
			url: '/settings/security',
			keywords: ['security', 'safety', 'protection'],
			settings: [
				{
					key: 'authLocalEnabled',
					label: m.security_local_auth_label(),
					type: 'boolean',
					description: 'Enable local username/password authentication',
					keywords: ['local', 'auth', 'authentication', 'username', 'password', 'login', 'credentials']
				},
				{
					key: 'authOidcEnabled',
					label: m.security_oidc_auth_label(),
					type: 'boolean',
					description: 'Enable OpenID Connect (OIDC) authentication',
					keywords: ['oidc', 'openid', 'connect', 'sso', 'oauth', 'external', 'provider', 'federation']
				},
				{
					key: 'authSessionTimeout',
					label: m.security_session_timeout_label(),
					type: 'number',
					description: 'How long user sessions remain active',
					keywords: ['session', 'timeout', 'expire', 'duration', 'lifetime', 'minutes', 'logout']
				},
				{
					key: 'authPasswordPolicy',
					label: m.security_password_policy_label(),
					type: 'select',
					description: 'Set password strength requirements',
					keywords: ['password', 'policy', 'strength', 'complexity', 'requirements', 'security', 'rules']
				}
			]
		},
		{
			id: 'navigation',
			title: m.navigation_title(),
			description: m.navigation_description(),
			icon: NavigationIcon,
			url: '/settings/navigation',
			keywords: [
				'navigation',
				'nav',
				'menu',
				'bar',
				'floating',
				'docked',
				'behavior',
				'mobile',
				'desktop',
				'ui',
				'interface',
				'layout',
				'appearance',
				'customize'
			],
			settings: [
				{
					key: 'sidebarHoverExpansion',
					label: m.navigation_sidebar_hover_expansion_label(),
					type: 'boolean',
					description: m.navigation_sidebar_hover_expansion_description(),
					keywords: [
						'sidebar',
						'hover',
						'expansion',
						'expand',
						'desktop',
						'mouse',
						'over',
						'collapsed',
						'collapsible',
						'icon',
						'labels',
						'text',
						'preview',
						'peek',
						'tooltip',
						'overlay',
						'temporary',
						'quick',
						'access',
						'navigation',
						'menu',
						'items',
						'submenu',
						'nested'
					]
				},
				{
					key: 'mobileNavigationMode',
					label: m.navigation_mode_label(),
					type: 'select',
					description: m.navigation_mode_description(),
					keywords: ['mode', 'style', 'type', 'floating', 'docked', 'position', 'layout', 'design', 'appearance', 'bottom']
				},
				{
					key: 'mobileNavigationShowLabels',
					label: m.navigation_show_labels_label(),
					type: 'boolean',
					description: m.navigation_show_labels_description(),
					keywords: ['labels', 'text', 'icons', 'display', 'show', 'hide', 'names', 'captions', 'titles', 'visible', 'toggle']
				},
				{
					key: 'mobileNavigationScrollToHide',
					label: m.navigation_scroll_to_hide_label(),
					type: 'boolean',
					description: m.navigation_scroll_to_hide_description(),
					keywords: [
						'scroll',
						'hide',
						'auto-hide',
						'behavior',
						'down',
						'up',
						'automatic',
						'disappear',
						'vanish',
						'minimize',
						'collapse'
					]
				},
				{
					key: 'glassEffectEnabled',
					label: m.navigation_glass_effect_label(),
					type: 'boolean',
					description: 'Enable modern glassmorphism design with blur, gradients, and ambient effects',
					keywords: [
						'glass',
						'glassmorphism',
						'blur',
						'backdrop',
						'frosted',
						'effect',
						'gradient',
						'ambient',
						'design',
						'ui',
						'appearance',
						'modern',
						'visual',
						'style',
						'theme',
						'transparency',
						'translucent'
					]
				}
			]
		},
		{
			id: 'users',
			title: m.users_title(),
			description: m.users_subtitle(),
			icon: UserIcon,
			url: '/settings/users',
			keywords: ['users', 'accounts', 'admin', 'roles', 'management', 'people'],
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

		settingsCategories.forEach((category) => {
			// Check if category matches
			const categoryMatch =
				category.title.toLowerCase().includes(query) ||
				category.description.toLowerCase().includes(query) ||
				category.keywords.some((keyword) => keyword.toLowerCase().includes(query));

			// Check individual settings with enhanced matching
			const matchingSettings = category.settings.filter((setting) => {
				const keyMatch = setting.key.toLowerCase().includes(query);
				const labelMatch = setting.label.toLowerCase().includes(query);
				const descriptionMatch = setting.description?.toLowerCase().includes(query) || false;
				const keywordsMatch = setting.keywords?.some((keyword) => keyword.toLowerCase().includes(query)) || false;

				return keyMatch || labelMatch || descriptionMatch || keywordsMatch;
			});

			if (categoryMatch || matchingSettings.length > 0) {
				// Calculate relevance score based on match quality
				let relevanceScore = 0;

				if (categoryMatch) {
					// Category title/description match gets high score
					if (category.title.toLowerCase().includes(query)) relevanceScore += 20;
					if (category.description.toLowerCase().includes(query)) relevanceScore += 15;
					if (category.keywords.some((keyword) => keyword.toLowerCase() === query)) relevanceScore += 25;
					if (category.keywords.some((keyword) => keyword.toLowerCase().includes(query))) relevanceScore += 10;
				}

				// Add score for individual setting matches
				matchingSettings.forEach((setting) => {
					if (setting.key.toLowerCase() === query) relevanceScore += 30;
					else if (setting.key.toLowerCase().includes(query)) relevanceScore += 15;

					if (setting.label.toLowerCase().includes(query)) relevanceScore += 12;
					if (setting.description?.toLowerCase().includes(query)) relevanceScore += 8;

					if (setting.keywords?.some((keyword) => keyword.toLowerCase() === query)) relevanceScore += 20;
					else if (setting.keywords?.some((keyword) => keyword.toLowerCase().includes(query))) relevanceScore += 5;
				});

				const categoryResult: SettingsCategory = {
					...category,
					matchingSettings: matchingSettings.length > 0 ? matchingSettings : category.settings,
					relevanceScore
				};
				results.push(categoryResult);
			}
		});

		// Sort by relevance (highest first)
		searchResults = results.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
	}

	function navigateToCategory(categoryUrl: string) {
		goto(categoryUrl);
	}

	function clearSearch() {
		searchQuery = '';
		showSearchResults = false;
	}
</script>

<div class="px-2 py-4 sm:px-6 sm:py-6 lg:px-8">
	<div class="mb-6 sm:mb-8">
		<div
			class="from-background/60 via-background/40 to-background/60 relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 shadow-sm sm:p-6"
		>
			<div class="bg-primary/10 pointer-events-none absolute -top-10 -right-10 size-40 rounded-full blur-3xl"></div>
			<div class="bg-muted/40 pointer-events-none absolute -bottom-10 -left-10 size-40 rounded-full blur-3xl"></div>
			<div class="relative">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div class="flex w-full items-start gap-3 sm:gap-4">
						<div
							class="bg-primary/10 text-primary ring-primary/20 flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 sm:size-10"
						>
							<SettingsIcon class="size-4 sm:size-5" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex items-start justify-between gap-3">
								<h1 class="min-w-0 text-xl font-bold tracking-tight sm:text-2xl">{m.sidebar_settings()}</h1>
								<div class="shrink-0">
									<UiConfigDisabledTag />
								</div>
							</div>
							<p class="text-muted-foreground mt-1 text-sm sm:text-base">Configure and customize your Arcane experience</p>
						</div>
					</div>
				</div>

				<div class="relative mt-4 w-full sm:mt-6 sm:max-w-md">
					<SearchIcon class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
					<input
						type="text"
						placeholder="Search settings..."
						bind:value={searchQuery}
						class="bg-background/50 border-input ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 pl-10 text-sm backdrop-blur-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					/>
					{#if showSearchResults}
						<Button variant="ghost" size="sm" onclick={clearSearch} class="absolute top-1/2 right-2 h-6 w-6 -translate-y-1/2 p-0">
							×
						</Button>
					{/if}
				</div>
			</div>
		</div>
	</div>

	{#if !showSearchResults}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
			{#each settingsCategories as category}
				{@const Icon = category.icon}
				<Card class="hover:border-primary/20 group cursor-pointer transition-all duration-200 hover:shadow-md">
					<button onclick={() => navigateToCategory(category.url)} class="w-full p-4 text-left sm:p-6">
						<div class="flex items-start justify-between gap-3">
							<div class="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
								<div
									class="bg-primary/5 text-primary ring-primary/10 group-hover:bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 transition-colors sm:size-12"
								>
									<Icon class="size-5 sm:size-6" />
								</div>
								<div class="min-w-0 flex-1">
									<h3 class="text-sm leading-tight font-semibold sm:text-base">{category.title}</h3>
									<p class="text-muted-foreground mt-1 text-xs leading-relaxed sm:text-sm">{category.description}</p>
								</div>
							</div>
							<ChevronRightIcon
								class="text-muted-foreground group-hover:text-foreground mt-1 size-4 shrink-0 transition-colors"
							/>
						</div>
					</button>
				</Card>
			{/each}
		</div>
	{:else}
		<div class="space-y-6 sm:space-y-8">
			<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<h2 class="text-base font-semibold sm:text-lg">
					Search Results for "{searchQuery}" ({searchResults.length}
					{searchResults.length === 1 ? 'result' : 'results'})
				</h2>
			</div>

			{#if searchResults.length === 0}
				<div class="py-8 text-center sm:py-12">
					<SearchIcon class="text-muted-foreground mx-auto mb-3 size-8 sm:mb-4 sm:size-12" />
					<h3 class="mb-2 text-base font-medium sm:text-lg">No settings found</h3>
					<p class="text-muted-foreground text-sm sm:text-base">Try adjusting your search terms or browse categories above.</p>
				</div>
			{:else}
				<div class="space-y-4 sm:space-y-6">
					{#each searchResults as result}
						{@const Icon = result.icon}
						<div class="bg-background/40 rounded-lg border shadow-sm">
							<div class="border-b p-4 sm:p-6">
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-3">
										<Icon class="text-primary size-4 shrink-0 sm:size-5" />
										<div>
											<h3 class="text-base font-semibold sm:text-lg">{result.title}</h3>
											<p class="text-muted-foreground text-xs sm:text-sm">{result.description}</p>
										</div>
									</div>
									<Button variant="outline" size="sm" onclick={() => navigateToCategory(result.url)} class="shrink-0">
										Go to Page
									</Button>
								</div>
							</div>

							<!-- Show matching settings with descriptions -->
							{#if result.matchingSettings && result.matchingSettings.length > 0}
								<div class="space-y-3 p-4 sm:p-6">
									<h4 class="text-muted-foreground mb-3 text-sm font-medium">Matching Settings:</h4>
									{#each result.matchingSettings as setting}
										<div class="bg-background/60 border-primary/20 rounded-md border-l-2 p-3">
											<div class="flex items-start justify-between gap-3">
												<div class="min-w-0 flex-1">
													<h5 class="text-sm font-medium">{setting.label}</h5>
													{#if setting.description}
														<p class="text-muted-foreground mt-1 text-xs">{setting.description}</p>
													{/if}
													{#if setting.keywords && setting.keywords.length > 0}
														<div class="mt-2 flex flex-wrap gap-1">
															{#each setting.keywords.slice(0, 6) as keyword}
																<span class="bg-muted/50 text-muted-foreground rounded px-2 py-0.5 text-xs">
																	{keyword}
																</span>
															{/each}
															{#if setting.keywords.length > 6}
																<span class="text-muted-foreground px-2 py-0.5 text-xs">
																	+{setting.keywords.length - 6} more
																</span>
															{/if}
														</div>
													{/if}
												</div>
												<div class="bg-muted/30 text-muted-foreground shrink-0 rounded px-2 py-1 font-mono text-xs">
													{setting.type}
												</div>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
