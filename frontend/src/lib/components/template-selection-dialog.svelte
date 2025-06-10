<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { FileText, Globe, FolderOpen, Settings, Download, Loader2 } from '@lucide/svelte';
	import type { ComposeTemplate } from '$lib/services/template-service';
	import TemplateAPIService from '$lib/services/api/template-api-service';
	import { toast } from 'svelte-sonner';

	interface Props {
		open: boolean;
		templates: ComposeTemplate[];
		onSelect: (template: ComposeTemplate) => void;
	}

	let { open = $bindable(), templates, onSelect }: Props = $props();

	const templateAPI = new TemplateAPIService();

	// Loading states for individual templates
	let loadingStates = $state(new Map<string, boolean>());

	async function handleSelect(template: ComposeTemplate) {
		// Set loading state
		loadingStates.set(template.id, true);
		loadingStates = new Map(loadingStates);

		try {
			let finalTemplate = template;

			// If it's a remote template, fetch the actual content via API
			if (template.isRemote) {
				const templateContent = await templateAPI.getContent(template.id);

				if (!templateContent.content) {
					toast.error('Failed to load template content');
					return;
				}

				// Create the final template with actual content
				finalTemplate = {
					...template,
					content: templateContent.content,
					envContent: templateContent.envContent || template.envContent
				};
			}

			onSelect(finalTemplate);
			open = false;
			toast.success(`Template "${template.name}" loaded successfully!`);
		} catch (error) {
			console.error('Error loading template:', error);
			toast.error('Failed to load template content');
		} finally {
			// Clear loading state
			loadingStates.delete(template.id);
			loadingStates = new Map(loadingStates);
		}
	}

	async function handleDownload(template: ComposeTemplate) {
		if (!template.isRemote) return;

		const templateId = template.id;
		loadingStates.set(`download-${templateId}`, true);
		loadingStates = new Map(loadingStates);

		try {
			const result = await templateAPI.download(templateId);

			if (result.success) {
				toast.success(`Template "${template.name}" downloaded successfully!`);
			} else {
				toast.error(result.message || 'Failed to download template');
			}
		} catch (error) {
			console.error('Error downloading template:', error);

			// Extract the actual error message from the API response
			let errorMessage = 'Failed to download template';
			if (error instanceof Error) {
				errorMessage = error.message;
			} else if (error && typeof error === 'object' && 'message' in error) {
				errorMessage = String(error.message);
			}

			toast.error(errorMessage);
		} finally {
			loadingStates.delete(`download-${templateId}`);
			loadingStates = new Map(loadingStates);
		}
	}

	const localTemplates = $derived(templates.filter((t) => !t.isRemote));
	const remoteTemplates = $derived(templates.filter((t) => t.isRemote));
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-screen overflow-y-auto sm:max-w-[900px]">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<FileText class="size-5" />
				Choose a Template
			</Dialog.Title>
			<Dialog.Description
				>Select a Docker Compose template to get started quickly, or download remote templates for
				local use.</Dialog.Description
			>
		</Dialog.Header>

		<div class="space-y-6 py-4">
			{#if templates.length === 0}
				<div class="text-muted-foreground py-8 text-center">
					<FileText class="mx-auto mb-4 size-12 opacity-50" />
					<p class="mb-2">No templates available</p>
					<p class="text-sm">
						Configure remote registries in <a
							href="/settings/templates"
							class="text-primary hover:underline">Template Settings</a
						> to access community templates
					</p>
				</div>
			{:else}
				<!-- Local Templates -->
				{#if localTemplates.length > 0}
					<div>
						<h3 class="mb-3 flex items-center gap-2 text-lg font-semibold">
							<FolderOpen class="size-5 text-blue-500" />
							Local Templates ({localTemplates.length})
						</h3>
						<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
							{#each localTemplates as template}
								<Card
									class="hover:bg-muted/50 hover:border-primary/20 cursor-pointer border-2 transition-colors"
								>
									<div class="p-4">
										<div class="mb-2 flex items-start justify-between">
											<h4 class="truncate pr-2 font-semibold">{template.name}</h4>
											<div class="ml-2 flex flex-shrink-0 gap-1">
												<Badge variant="outline" class="text-xs">
													<FolderOpen class="mr-1 size-3" />
													Local
												</Badge>
												{#if template.envContent}
													<Badge variant="secondary" class="text-xs">
														<Settings class="mr-1 size-3" />
														ENV
													</Badge>
												{/if}
											</div>
										</div>
										<p class="text-muted-foreground mb-3 line-clamp-2 text-sm">
											{template.description}
										</p>
										<div class="flex items-center justify-between">
											<div class="text-muted-foreground text-xs">
												{template.envContent ? 'Includes environment variables' : 'Ready to use'}
											</div>
											<Button
												size="sm"
												onclick={() => handleSelect(template)}
												disabled={loadingStates.get(template.id)}
											>
												{#if loadingStates.get(template.id)}
													<Loader2 class="mr-1 size-3 animate-spin" />
													Loading...
												{:else}
													Use Template
												{/if}
											</Button>
										</div>
									</div>
								</Card>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Remote Templates -->
				{#if remoteTemplates.length > 0}
					<div>
						<h3 class="mb-3 flex items-center gap-2 text-lg font-semibold">
							<Globe class="size-5 text-green-500" />
							Remote Templates ({remoteTemplates.length})
						</h3>
						<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
							{#each remoteTemplates as template}
								<Card class="hover:bg-muted/50 hover:border-primary/20 border-2 transition-colors">
									<div class="p-4">
										<div class="mb-2 flex items-start justify-between">
											<h4 class="truncate pr-2 font-semibold">{template.name}</h4>
											<div class="ml-2 flex flex-shrink-0 gap-1">
												<Badge variant="secondary" class="text-xs">
													<Globe class="mr-1 size-3" />
													{template.metadata?.registry || 'Remote'}
												</Badge>
												{#if template.metadata?.envUrl}
													<Badge variant="secondary" class="text-xs">
														<Settings class="mr-1 size-3" />
														ENV
													</Badge>
												{/if}
											</div>
										</div>
										<p class="text-muted-foreground mb-2 line-clamp-2 text-sm">
											{template.description}
										</p>
										{#if template.metadata?.author}
											<p class="text-muted-foreground mb-3 text-xs">
												by {template.metadata.author}
											</p>
										{/if}
										<div class="flex items-center justify-between gap-2">
											<div class="text-muted-foreground flex-1 text-xs">
												{#if template.metadata?.version}
													<Badge variant="outline" class="text-xs">
														v{template.metadata.version}
													</Badge>
												{/if}
											</div>
											<div class="flex gap-2">
												<Button
													variant="outline"
													size="sm"
													onclick={() => handleDownload(template)}
													disabled={loadingStates.get(`download-${template.id}`)}
												>
													{#if loadingStates.get(`download-${template.id}`)}
														<Loader2 class="mr-1 size-3 animate-spin" />
														Downloading...
													{:else}
														<Download class="mr-1 size-3" />
														Download
													{/if}
												</Button>
												<Button
													size="sm"
													onclick={() => handleSelect(template)}
													disabled={loadingStates.get(template.id)}
												>
													{#if loadingStates.get(template.id)}
														<Loader2 class="mr-1 size-3 animate-spin" />
														Loading...
													{:else}
														Use Now
													{/if}
												</Button>
											</div>
										</div>
									</div>
								</Card>
							{/each}
						</div>
					</div>
				{/if}
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
