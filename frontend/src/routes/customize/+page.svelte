<script lang="ts">
	import { goto } from '$app/navigation';
	import SearchIcon from '@lucide/svelte/icons/search';
	import PaletteIcon from '@lucide/svelte/icons/palette';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { m } from '$lib/paraglide/messages';
	import { UiConfigDisabledTag } from '$lib/components/badges/index.js';
	import { navigationItems } from '$lib/config/navigation-config';
	import type { NavigationItem } from '$lib/config/navigation-config';

	interface CustomizationMeta {
		key: string;
		label: string;
		type: string;
		keywords?: string[];
		description?: string;
	}

	interface CustomizationCategory {
		id: string;
		title: string;
		description: string;
		icon: any;
		url: string;
		keywords: string[];
		customizations: CustomizationMeta[];
		matchingCustomizations?: CustomizationMeta[];
		relevanceScore?: number;
	}

	let { data } = $props();
	let searchQuery = $state('');
	let showSearchResults = $state(false);
	let searchResults = $state<CustomizationCategory[]>([]);

	// Extract customization items from navigation config
	const customizationNavItems = navigationItems.customizationItems[0]?.items || [];

	// Build customization categories with metadata
	const customizationCategories: CustomizationCategory[] = customizationNavItems.map((item: NavigationItem) => {
		const categoryId = item.url.split('/').pop() || '';

		// Define customization metadata for each category
		const customizationsByCategory: Record<string, CustomizationMeta[]> = {
			defaults: [
				{
					key: 'defaultProjectTemplate',
					label: m.customize_default_project_template(),
					type: 'select',
					description: m.customize_defaults_description(),
					keywords: ['template', 'default', 'project', 'scaffold', 'boilerplate', 'starter']
				},
				{
					key: 'defaultContainerSettings',
					label: m.customize_default_container_settings(),
					type: 'object',
					description: m.customize_defaults_description(),
					keywords: ['container', 'default', 'settings', 'docker', 'configuration', 'runtime']
				},
				{
					key: 'defaultNetworkMode',
					label: m.customize_default_network_mode(),
					type: 'select',
					description: m.customize_category_defaults_description(),
					keywords: ['network', 'default', 'mode', 'bridge', 'host', 'none', 'container']
				}
			],
			templates: [
				{
					key: 'customTemplates',
					label: m.templates_title(),
					type: 'array',
					description: m.customize_category_templates_description(),
					keywords: ['templates', 'custom', 'project', 'compose', 'docker-compose', 'yaml', 'stack']
				},
				{
					key: 'templateCategories',
					label: m.customize_template_categories(),
					type: 'array',
					description: m.customize_category_templates_description(),
					keywords: ['categories', 'organization', 'grouping', 'tags', 'classification']
				},
				{
					key: 'templateValidation',
					label: m.customize_template_validation(),
					type: 'boolean',
					description: m.customize_validation_error(),
					keywords: ['validation', 'check', 'verify', 'lint', 'syntax', 'schema']
				}
			],
			registries: [
				{
					key: 'containerRegistries',
					label: m.registries_title(),
					type: 'array',
					description: m.customize_category_registries_description(),
					keywords: ['registry', 'docker', 'images', 'hub', 'private', 'authentication', 'credentials']
				},
				{
					key: 'registryCredentials',
					label: m.customize_registry_credentials(),
					type: 'secure',
					description: m.registries_credentials_description(),
					keywords: ['credentials', 'auth', 'username', 'password', 'token', 'login', 'security']
				},
				{
					key: 'registryMirrors',
					label: m.customize_registry_mirrors(),
					type: 'array',
					description: m.customize_category_registries_description(),
					keywords: ['mirrors', 'proxy', 'cache', 'performance', 'cdn', 'regional']
				}
			],
			variables: [
				{
					key: 'globalVariables',
					label: m.variables_title(),
					type: 'object',
					description: m.variables_subtitle(),
					keywords: ['variables', 'environment', 'env', 'global', 'config', 'settings', 'parameters']
				},
				{
					key: 'secretVariables',
					label: m.customize_secret_variables(),
					type: 'secure',
					description: m.customize_category_variables_description(),
					keywords: ['secrets', 'sensitive', 'secure', 'encrypted', 'password', 'api', 'key']
				},
				{
					key: 'variableTemplates',
					label: m.customize_variable_templates(),
					type: 'array',
					description: m.customize_category_variables_description(),
					keywords: ['templates', 'reusable', 'preset', 'configuration', 'standard', 'common']
				}
			]
		};

		return {
			id: categoryId,
			title: item.title,
			description: getDescriptionForCategory(categoryId),
			icon: item.icon,
			url: item.url,
			keywords: getKeywordsForCategory(categoryId),
			customizations: customizationsByCategory[categoryId] || []
		};
	});

	function getDescriptionForCategory(categoryId: string): string {
		const descriptions: Record<string, string> = {
			defaults: m.customize_category_defaults_description(),
			templates: m.customize_category_templates_description(),
			registries: m.customize_category_registries_description(),
			variables: m.customize_category_variables_description()
		};
		return descriptions[categoryId] || m.customize_fallback_description();
	}

	function getKeywordsForCategory(categoryId: string): string[] {
		const keywordMap: Record<string, string[]> = {
			defaults: ['defaults', 'templates', 'presets', 'configuration', 'initial'],
			templates: ['templates', 'stacks', 'compose', 'docker-compose', 'yaml', 'custom'],
			registries: ['registries', 'docker', 'images', 'authentication', 'credentials', 'private'],
			variables: ['variables', 'environment', 'config', 'settings', 'secrets', 'parameters']
		};
		return keywordMap[categoryId] || [];
	}

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
		const results: CustomizationCategory[] = [];

		customizationCategories.forEach((category) => {
			// Check if category matches
			const categoryMatch =
				category.title.toLowerCase().includes(query) ||
				category.description.toLowerCase().includes(query) ||
				category.keywords.some((keyword) => keyword.toLowerCase().includes(query));

			// Check individual customizations with enhanced matching
			const matchingCustomizations = category.customizations.filter((customization) => {
				const keyMatch = customization.key.toLowerCase().includes(query);
				const labelMatch = customization.label.toLowerCase().includes(query);
				const descriptionMatch = customization.description?.toLowerCase().includes(query) || false;
				const keywordsMatch = customization.keywords?.some((keyword) => keyword.toLowerCase().includes(query)) || false;

				return keyMatch || labelMatch || descriptionMatch || keywordsMatch;
			});

			if (categoryMatch || matchingCustomizations.length > 0) {
				// Calculate relevance score based on match quality
				let relevanceScore = 0;

				if (categoryMatch) {
					// Category title/description match gets high score
					if (category.title.toLowerCase().includes(query)) relevanceScore += 20;
					if (category.description.toLowerCase().includes(query)) relevanceScore += 15;
					if (category.keywords.some((keyword) => keyword.toLowerCase() === query)) relevanceScore += 25;
					if (category.keywords.some((keyword) => keyword.toLowerCase().includes(query))) relevanceScore += 10;
				}

				// Add score for individual customization matches
				matchingCustomizations.forEach((customization) => {
					if (customization.key.toLowerCase() === query) relevanceScore += 30;
					else if (customization.key.toLowerCase().includes(query)) relevanceScore += 15;

					if (customization.label.toLowerCase().includes(query)) relevanceScore += 12;
					if (customization.description?.toLowerCase().includes(query)) relevanceScore += 8;

					if (customization.keywords?.some((keyword) => keyword.toLowerCase() === query)) relevanceScore += 20;
					else if (customization.keywords?.some((keyword) => keyword.toLowerCase().includes(query))) relevanceScore += 5;
				});

				const categoryResult: CustomizationCategory = {
					...category,
					matchingCustomizations: matchingCustomizations.length > 0 ? matchingCustomizations : category.customizations,
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
							<PaletteIcon class="size-4 sm:size-5" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex items-start justify-between gap-3">
								<h1 class="min-w-0 text-xl font-bold tracking-tight sm:text-2xl">{m.customize_title()}</h1>
								<div class="shrink-0">
									<UiConfigDisabledTag />
								</div>
							</div>
							<p class="text-muted-foreground mt-1 text-sm sm:text-base">{m.customize_subtitle()}</p>
						</div>
					</div>
				</div>

				<div class="relative mt-4 w-full sm:mt-6 sm:max-w-md">
					<SearchIcon class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
					<input
						type="text"
						placeholder={m.customize_search_placeholder()}
						bind:value={searchQuery}
						class="bg-background/50 border-input ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 pl-10 text-sm backdrop-blur-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					/>
					{#if showSearchResults}
						<Button variant="ghost" size="sm" onclick={clearSearch} class="absolute top-1/2 right-2 size-6 -translate-y-1/2 p-0">
							×
						</Button>
					{/if}
				</div>
			</div>
		</div>
	</div>

	{#if !showSearchResults}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
			{#each customizationCategories as category}
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
					{m.customize_search_results({ query: searchQuery })} ({searchResults.length}
					{searchResults.length === 1 ? m.customize_result() : m.customize_results()})
				</h2>
			</div>

			{#if searchResults.length === 0}
				<div class="py-8 text-center sm:py-12">
					<SearchIcon class="text-muted-foreground mx-auto mb-3 size-8 sm:mb-4 sm:size-12" />
					<h3 class="mb-2 text-base font-medium sm:text-lg">{m.customize_no_options()}</h3>
					<p class="text-muted-foreground text-sm sm:text-base">{m.customize_try_adjusting()}</p>
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
										{m.customize_button()}
									</Button>
								</div>
							</div>

							<!-- Show matching customizations with descriptions -->
							{#if result.matchingCustomizations && result.matchingCustomizations.length > 0}
								<div class="space-y-3 p-4 sm:p-6">
									<h4 class="text-muted-foreground mb-3 text-sm font-medium">{m.customize_available_options()}</h4>
									{#each result.matchingCustomizations as customization}
										<div class="bg-background/60 border-primary/20 rounded-md border-l-2 p-3">
											<div class="flex items-start justify-between gap-3">
												<div class="min-w-0 flex-1">
													<h5 class="text-sm font-medium">{customization.label}</h5>
													{#if customization.description}
														<p class="text-muted-foreground mt-1 text-xs">{customization.description}</p>
													{/if}
													{#if customization.keywords && customization.keywords.length > 0}
														<div class="mt-2 flex flex-wrap gap-1">
															{#each customization.keywords.slice(0, 6) as keyword}
																<span class="bg-muted/50 text-muted-foreground rounded px-2 py-0.5 text-xs">
																	{keyword}
																</span>
															{/each}
															{#if customization.keywords.length > 6}
																<span class="text-muted-foreground px-2 py-0.5 text-xs">
																	+{customization.keywords.length - 6}
																	{m.customize_more()}
																</span>
															{/if}
														</div>
													{/if}
												</div>
												<div class="bg-muted/30 text-muted-foreground shrink-0 rounded px-2 py-1 font-mono text-xs">
													{customization.type}
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
