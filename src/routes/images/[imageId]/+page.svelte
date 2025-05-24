<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ArrowLeft, HardDrive, Clock, Tag, Layers, Hash, Trash2, Loader2, Cpu } from '@lucide/svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { goto } from '$app/navigation';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { formatDate } from '$lib/utils/string.utils';
	import { formatBytes } from '$lib/utils/bytes.util';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import ImageAPIService from '$lib/services/api/image-api-service';
	import { toast } from 'svelte-sonner';
	import ArcaneButton from '$lib/components/arcane-button.svelte';

	let { data }: { data: PageData } = $props();
	let { image } = $derived(data);
	const imageApi = new ImageAPIService();

	let isLoading = $state({
		pulling: false,
		removing: false,
		refreshing: false
	});

	const shortId = $derived(image?.Id.split(':')[1].substring(0, 12) || 'N/A');
	const createdDate = $derived(image?.Created ? formatDate(image.Created) : 'N/A');
	const imageSize = $derived(formatBytes(image?.Size || 0));

	async function handleImageRemove(id: string) {
		openConfirmDialog({
			title: 'Delete Image',
			message: `Are you sure you want to delete this image? This action cannot be undone.`,
			confirm: {
				label: 'Delete',
				destructive: true,
				action: async () => {
					await handleApiResultWithCallbacks({
						result: await tryCatch(imageApi.remove(id)),
						message: 'Failed to Remove Image',
						setLoadingState: (value) => (isLoading.removing = value),
						onSuccess: async () => {
							toast.success('Image Removed Successfully.');
							goto('/images');
						}
					});
				}
			}
		});
	}
</script>

<div class="min-h-screen bg-background">
	<!-- Header Section -->
	<div class="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
		<div class="container mx-auto px-4 py-4">
			<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
				<div class="space-y-2">
					<Breadcrumb.Root>
						<Breadcrumb.List>
							<Breadcrumb.Item>
								<Breadcrumb.Link href="/" class="text-muted-foreground hover:text-foreground transition-colors">Dashboard</Breadcrumb.Link>
							</Breadcrumb.Item>
							<Breadcrumb.Separator />
							<Breadcrumb.Item>
								<Breadcrumb.Link href="/images" class="text-muted-foreground hover:text-foreground transition-colors">Images</Breadcrumb.Link>
							</Breadcrumb.Item>
							<Breadcrumb.Separator />
							<Breadcrumb.Item>
								<Breadcrumb.Page class="font-medium">{shortId}</Breadcrumb.Page>
							</Breadcrumb.Item>
						</Breadcrumb.List>
					</Breadcrumb.Root>

					<div class="flex flex-col sm:flex-row sm:items-center gap-3">
						<h1 class="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text break-all">
							{image?.RepoTags?.[0] || shortId}
						</h1>
						{#if image?.RepoTags?.[0]}
							<Badge variant="outline" class="font-mono text-xs">
								{shortId}
							</Badge>
						{/if}
					</div>
				</div>

				{#if image}
					<div class="flex gap-2 flex-wrap">
						<Button variant="outline" size="sm" href="/images" class="gap-2 shadow-sm hover:shadow-md transition-all">
							<ArrowLeft class="size-4" />
							Back
						</Button>
						<ArcaneButton action="remove" onClick={() => handleImageRemove(image.Id)} loading={isLoading.removing} disabled={isLoading.removing} size="sm" />
					</div>
				{/if}
			</div>
		</div>
	</div>

	<div class="container mx-auto px-4 py-6">
		{#if image}
			<div class="space-y-6">
				<!-- Overview Cards -->
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
					<!-- ID Card -->
					<Card.Root class="group hover:shadow-lg transition-all duration-200 border-l-4 border-l-gray-500">
						<Card.Content class="p-6">
							<div class="flex items-start gap-4">
								<div class="bg-gray-500/10 p-3 rounded-xl group-hover:bg-gray-500/20 transition-colors shrink-0">
									<Hash class="text-gray-500 size-5" />
								</div>
								<div class="min-w-0 flex-1">
									<p class="text-sm font-medium text-muted-foreground mb-1">Image ID</p>
									<p class="text-sm font-semibold font-mono truncate" title={image.Id}>{shortId}</p>
								</div>
							</div>
						</Card.Content>
					</Card.Root>

					<!-- Size Card -->
					<Card.Root class="group hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
						<Card.Content class="p-6">
							<div class="flex items-start gap-4">
								<div class="bg-blue-500/10 p-3 rounded-xl group-hover:bg-blue-500/20 transition-colors shrink-0">
									<HardDrive class="text-blue-500 size-5" />
								</div>
								<div class="min-w-0 flex-1">
									<p class="text-sm font-medium text-muted-foreground mb-1">Size</p>
									<p class="text-lg font-bold">{imageSize}</p>
								</div>
							</div>
						</Card.Content>
					</Card.Root>

					<!-- Created Card -->
					<Card.Root class="group hover:shadow-lg transition-all duration-200 border-l-4 border-l-green-500">
						<Card.Content class="p-6">
							<div class="flex items-start gap-4">
								<div class="bg-green-500/10 p-3 rounded-xl group-hover:bg-green-500/20 transition-colors shrink-0">
									<Clock class="text-green-500 size-5" />
								</div>
								<div class="min-w-0 flex-1">
									<p class="text-sm font-medium text-muted-foreground mb-1">Created</p>
									<p class="text-sm font-semibold">{createdDate}</p>
								</div>
							</div>
						</Card.Content>
					</Card.Root>

					<!-- Architecture Card -->
					<Card.Root class="group hover:shadow-lg transition-all duration-200 border-l-4 border-l-orange-500">
						<Card.Content class="p-6">
							<div class="flex items-start gap-4">
								<div class="bg-orange-500/10 p-3 rounded-xl group-hover:bg-orange-500/20 transition-colors shrink-0">
									<Cpu class="text-orange-500 size-5" />
								</div>
								<div class="min-w-0 flex-1">
									<p class="text-sm font-medium text-muted-foreground mb-1">Architecture</p>
									<p class="text-sm font-semibold">{image.Architecture || 'N/A'}</p>
								</div>
							</div>
						</Card.Content>
					</Card.Root>

					<!-- OS Card -->
					<Card.Root class="group hover:shadow-lg transition-all duration-200 border-l-4 border-l-purple-500">
						<Card.Content class="p-6">
							<div class="flex items-start gap-4">
								<div class="bg-purple-500/10 p-3 rounded-xl group-hover:bg-purple-500/20 transition-colors shrink-0">
									<Layers class="text-purple-500 size-5" />
								</div>
								<div class="min-w-0 flex-1">
									<p class="text-sm font-medium text-muted-foreground mb-1">Operating System</p>
									<p class="text-sm font-semibold">{image.Os || 'N/A'}</p>
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				</div>

				<!-- Tags Section -->
				{#if image.RepoTags && image.RepoTags.length > 0}
					<Card.Root class="shadow-sm hover:shadow-md transition-shadow">
						<Card.Header class="pb-4">
							<Card.Title class="text-lg flex items-center gap-2">
								<div class="bg-blue-500/10 p-2 rounded-lg">
									<Tag class="text-blue-500 size-4" />
								</div>
								Repository Tags
							</Card.Title>
							<Card.Description>All tags associated with this image</Card.Description>
						</Card.Header>
						<Card.Content>
							<div class="flex flex-wrap gap-3">
								{#each image.RepoTags as tag (tag)}
									<div class="bg-muted/30 hover:bg-muted/50 transition-colors rounded-lg px-3 py-2 border">
										<span class="font-mono text-sm font-medium">{tag}</span>
									</div>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				{/if}

				<!-- Detailed Information -->
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<!-- Image Layers -->
					{#if image.RootFS?.Layers && image.RootFS.Layers.length > 0}
						<Card.Root class="shadow-sm hover:shadow-md transition-shadow">
							<Card.Header class="pb-4">
								<Card.Title class="text-lg flex items-center gap-2">
									<div class="bg-purple-500/10 p-2 rounded-lg">
										<Layers class="text-purple-500 size-4" />
									</div>
									Image Layers
								</Card.Title>
								<Card.Description>Filesystem layers ({image.RootFS.Layers.length} total)</Card.Description>
							</Card.Header>
							<Card.Content class="max-h-[400px] overflow-y-auto">
								<div class="space-y-2">
									{#each image.RootFS.Layers as layer, index (layer)}
										<div class="bg-muted/30 rounded-lg p-3 hover:bg-muted/40 transition-colors">
											<div class="flex items-center justify-between">
												<span class="text-xs font-medium text-muted-foreground">Layer {index + 1}</span>
												<Badge variant="outline" class="text-xs">
													{layer.split(':')[0]}
												</Badge>
											</div>
											<div class="font-mono text-xs mt-2 break-all text-muted-foreground">
												{layer.split(':')[1]?.substring(0, 64) || layer}
											</div>
										</div>
									{/each}
								</div>
							</Card.Content>
						</Card.Root>
					{/if}

					<!-- Configuration -->
					{#if image.Config}
						<Card.Root class="shadow-sm hover:shadow-md transition-shadow">
							<Card.Header class="pb-4">
								<Card.Title class="text-lg flex items-center gap-2">
									<div class="bg-amber-500/10 p-2 rounded-lg">
										<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-500">
											<path
												d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
											></path>
											<circle cx="12" cy="12" r="3"></circle>
										</svg>
									</div>
									Image Configuration
								</Card.Title>
								<Card.Description>Container runtime configuration</Card.Description>
							</Card.Header>
							<Card.Content class="space-y-4">
								{#if image.Config.Cmd || image.Config.Entrypoint}
									<div class="bg-muted/30 rounded-lg p-4">
										<h4 class="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Execution</h4>
										<div class="space-y-3">
											{#if image.Config.Entrypoint}
												<div>
													<span class="text-xs font-medium text-muted-foreground">Entrypoint</span>
													<div class="font-mono text-sm mt-1 bg-muted/50 px-2 py-1 rounded">
														{Array.isArray(image.Config.Entrypoint) ? image.Config.Entrypoint.join(' ') : image.Config.Entrypoint}
													</div>
												</div>
											{/if}
											{#if image.Config.Cmd}
												<div>
													<span class="text-xs font-medium text-muted-foreground">Command</span>
													<div class="font-mono text-sm mt-1 bg-muted/50 px-2 py-1 rounded">
														{Array.isArray(image.Config.Cmd) ? image.Config.Cmd.join(' ') : image.Config.Cmd}
													</div>
												</div>
											{/if}
										</div>
									</div>
								{/if}

								{#if image.Config.WorkingDir || image.Config.User}
									<div class="bg-muted/30 rounded-lg p-4">
										<h4 class="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Runtime Environment</h4>
										<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
											{#if image.Config.WorkingDir}
												<div>
													<span class="text-xs font-medium text-muted-foreground">Working Directory</span>
													<div class="text-sm mt-1">{image.Config.WorkingDir}</div>
												</div>
											{/if}
											{#if image.Config.User}
												<div>
													<span class="text-xs font-medium text-muted-foreground">User</span>
													<div class="text-sm mt-1">{image.Config.User}</div>
												</div>
											{/if}
										</div>
									</div>
								{/if}

								{#if image.Config.ExposedPorts && Object.keys(image.Config.ExposedPorts).length > 0}
									<div class="bg-muted/30 rounded-lg p-4">
										<h4 class="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Exposed Ports</h4>
										<div class="flex flex-wrap gap-2">
											{#each Object.keys(image.Config.ExposedPorts) as port}
												<Badge variant="outline" class="font-mono text-xs">{port}</Badge>
											{/each}
										</div>
									</div>
								{/if}
							</Card.Content>
						</Card.Root>
					{/if}
				</div>

				<!-- Labels Section -->
				{#if image.Config?.Labels && Object.keys(image.Config.Labels).length > 0}
					<Card.Root class="shadow-sm hover:shadow-md transition-shadow">
						<Card.Header class="pb-4">
							<Card.Title class="text-lg flex items-center gap-2">
								<div class="bg-green-500/10 p-2 rounded-lg">
									<Badge class="text-green-500 size-4" />
								</div>
								Image Labels
							</Card.Title>
							<Card.Description>Metadata and annotations ({Object.keys(image.Config.Labels).length} labels)</Card.Description>
						</Card.Header>
						<Card.Content class="max-h-[400px] overflow-y-auto">
							<div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
								{#each Object.entries(image.Config.Labels) as [key, value] (key)}
									<div class="bg-muted/30 rounded-lg p-3 hover:bg-muted/40 transition-colors">
										<div class="text-xs font-semibold text-muted-foreground mb-1 break-all">{key}</div>
										<div class="text-sm font-mono break-all">{value?.toString() || ''}</div>
									</div>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				{/if}

				<!-- Environment Variables -->
				{#if image.Config?.Env && image.Config.Env.length > 0}
					<Card.Root class="shadow-sm hover:shadow-md transition-shadow">
						<Card.Header class="pb-4">
							<Card.Title class="text-lg flex items-center gap-2">
								<div class="bg-red-500/10 p-2 rounded-lg">
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-500">
										<polyline points="4 17 10 11 4 5"></polyline>
										<line x1="12" x2="20" y1="19" y2="19"></line>
									</svg>
								</div>
								Environment Variables
							</Card.Title>
							<Card.Description>Default environment configuration ({image.Config.Env.length} variables)</Card.Description>
						</Card.Header>
						<Card.Content class="max-h-[400px] overflow-y-auto">
							<div class="space-y-2">
								{#each image.Config.Env as env, index (index)}
									<div class="bg-muted/30 rounded-lg p-3 hover:bg-muted/40 transition-colors">
										{#if env.includes('=')}
											{@const [key, ...valueParts] = env.split('=')}
											{@const value = valueParts.join('=')}
											<div class="flex flex-col gap-1">
												<span class="font-semibold text-sm text-foreground">{key}</span>
												<span class="text-muted-foreground font-mono text-xs break-all">{value}</span>
											</div>
										{:else}
											<span class="font-mono text-xs">{env}</span>
										{/if}
									</div>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				{/if}
			</div>
		{:else}
			<div class="flex flex-col items-center justify-center py-20 text-center">
				<div class="bg-muted/50 p-6 rounded-full mb-6">
					<HardDrive class="text-muted-foreground size-12" />
				</div>
				<h2 class="text-2xl font-bold mb-2">Image Not Found</h2>
				<p class="text-muted-foreground max-w-md mb-8">Could not load image data. It may have been removed or the Docker engine is not accessible.</p>
				<div class="flex gap-3">
					<Button variant="outline" href="/images" class="gap-2">
						<ArrowLeft class="size-4" />
						Back to Images
					</Button>
					<ArcaneButton action="cancel" customLabel="Refresh" onClick={() => window.location.reload()} size="sm" />
				</div>
			</div>
		{/if}
	</div>
</div>
