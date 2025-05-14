<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ArrowLeft, Loader2, AlertCircle, Save, FileStack, Layers, ArrowRight, ExternalLink } from '@lucide/svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import ActionButtons from '$lib/components/action-buttons.svelte';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { statusVariantMap } from '$lib/types/statuses';
	import { capitalizeFirstLetter } from '$lib/utils/string.utils';
	import { invalidateAll, goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import YamlEditor from '$lib/components/yaml-editor.svelte';
	import EnvEditor from '$lib/components/env-editor.svelte';
	import { tryCatch } from '$lib/utils/try-catch';
	import StackAPIService from '$lib/services/api/stack-api-service';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';

	const stackApi = new StackAPIService();

	let { data }: { data: PageData } = $props();
	let { stack, editorState, servicePorts, settings } = $derived(data);

	let isLoading = $state({
		deploying: false,
		stopping: false,
		restarting: false,
		removing: false,
		importing: false,
		redeploying: false,
		destroying: false,
		pulling: false,
		saving: false
	});

	let name = $derived(editorState.name);
	let composeContent = $derived(editorState.composeContent);
	let envContent = $derived(editorState.envContent || '');
	let originalName = $derived(editorState.originalName);
	let originalComposeContent = $derived(editorState.originalComposeContent);
	let originalEnvContent = $derived(editorState.originalEnvContent || '');

	let hasChanges = $derived(name !== originalName || composeContent !== originalComposeContent || envContent !== originalEnvContent);

	const baseServerUrl = $derived(settings?.baseServerUrl || 'localhost');

	$effect(() => {
		isLoading.deploying = false;
		isLoading.stopping = false;
		isLoading.restarting = false;
		isLoading.removing = false;
		isLoading.saving = false;
	});

	async function handleSaveChanges() {
		if (!stack || !hasChanges) return;

		// Store the original stack ID before saving, in case it changes
		const currentStackId = stack.id;

		handleApiResultWithCallbacks({
			result: await tryCatch(stackApi.save(currentStackId, name, composeContent, envContent)),
			message: 'Failed to Save Stack',
			setLoadingState: (value) => (isLoading.saving = value),
			onSuccess: async (updatedStack) => {
				console.log('Stack save successful', updatedStack);
				toast.success('Stack updated successfully!');

				// Update local state for "original" values to reset hasChanges
				originalName = updatedStack.name;
				originalComposeContent = composeContent;
				originalEnvContent = envContent;

				await new Promise((resolve) => setTimeout(resolve, 200));

				if (updatedStack && updatedStack.id !== currentStackId) {
					console.log(`Stack ID changed from ${currentStackId} to ${updatedStack.id}. Navigating...`);
					await goto(`/stacks/${name}`, { invalidateAll: true });
				} else {
					await invalidateAll();
				}
			}
		});
	}

	function getHostForService(service: any): string {
		if (!service || !service.networkSettings?.Networks) return baseServerUrl;

		const networks = service.networkSettings.Networks;
		for (const networkName in networks) {
			const network = networks[networkName];
			if (network.Driver === 'macvlan' || network.Driver === 'ipvlan') {
				if (network.IPAddress) return network.IPAddress;
			}
		}

		return baseServerUrl;
	}

	// Define a more specific interface for the port type
	interface Port {
		PublicPort?: number;
		PrivatePort?: number;
		Type?: string;
		[key: string]: any;
	}

	function getServicePortUrl(service: any, port: string | number | Port, protocol = 'http'): string {
		const host = getHostForService(service);

		if (typeof port === 'string') {
			const parts = port.split('/');
			const portNumber = parseInt(parts[0], 10);

			if (parts.length > 1 && parts[1] === 'udp') {
				protocol = 'udp';
			}

			return `${protocol}://${host}:${portNumber}`;
		}

		if (typeof port === 'number') {
			return `${protocol}://${host}:${port}`;
		}

		if (port && typeof port === 'object') {
			const portNumber = port.PublicPort || port.PrivatePort || 80;
			if (port.Type) {
				protocol = port.Type.toLowerCase() === 'tcp' ? 'http' : 'https';
			}
			return `${protocol}://${host}:${portNumber}`;
		}

		return `${protocol}://${host}:80`;
	}
</script>

<div class="space-y-6 pb-8">
	<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
		<div>
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/">Dashboard</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/stacks">Stacks</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Page>{stack?.name || 'Loading...'}</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>

			<div class="mt-2 flex items-center gap-2">
				<h1 class="text-2xl font-bold tracking-tight flex items-center gap-2">
					{stack?.name || 'Stack Details'}
					{#if stack && servicePorts && Object.keys(servicePorts).length > 0}
						{@const allUniquePorts = [...new Set(Object.values(servicePorts).flat())]}
						{#each allUniquePorts as port}
							<a href={getServicePortUrl(stack, port)} target="_blank" rel="noopener noreferrer" class="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-md hover:bg-blue-500/20 transition-colors flex items-center gap-1 self-start mt-1.5">
								{port}
								<ExternalLink class="size-3" />
							</a>
						{/each}
					{/if}
				</h1>
			</div>
		</div>

		{#if stack}
			<div class="flex gap-2 flex-wrap">
				<ActionButtons
					id={stack.id}
					type="stack"
					itemState={stack.status}
					loading={{
						start: isLoading.deploying,
						stop: isLoading.stopping,
						restart: isLoading.restarting,
						remove: isLoading.removing
					}}
				/>
			</div>
		{/if}
	</div>

	{#if data.error}
		<Alert.Root variant="destructive">
			<AlertCircle class="size-4" />
			<Alert.Title>Error Loading Stack</Alert.Title>
			<Alert.Description>{data.error}</Alert.Description>
		</Alert.Root>
	{/if}

	{#if stack}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
			<Card.Root>
				<Card.Content class="p-4 flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Services</p>
						<p class="text-2xl font-bold">{stack.serviceCount}</p>
					</div>
					<div class="bg-primary/10 p-2 rounded-full">
						<Layers class="text-primary size-5" />
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="p-4 flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Running Services</p>
						<p class="text-2xl font-bold">{stack.runningCount}</p>
					</div>
					<div class="bg-green-500/10 p-2 rounded-full">
						<Layers class="text-green-500 size-5" />
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="p-4 flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Created</p>
						<p class="text-lg font-medium">
							{new Date(stack.createdAt ?? '').toLocaleString()}
						</p>
					</div>
					<div class="bg-blue-500/10 p-2 rounded-full">
						<FileStack class="text-blue-500 size-5" />
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<div class="space-y-6">
			<Card.Root class="border shadow-sm">
				<Card.Header>
					<Card.Title>Stack Configuration</Card.Title>
					<Card.Description>Edit stack settings, compose file, and environment variables</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="space-y-4">
						<div class="grid w-full max-w-sm items-center gap-1.5">
							<Label for="name">Stack Name</Label>
							<Input type="text" id="name" name="name" bind:value={name} required disabled={isLoading.saving || stack?.status === 'running' || stack?.status === 'partially running'} />
							{#if stack?.status === 'running' || stack?.status === 'partially running'}
								<p class="text-xs text-muted-foreground">Stack name cannot be changed while the stack is running. Please stop the stack first.</p>
							{/if}
						</div>

						<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div class="md:col-span-2 space-y-2">
								<Label for="compose-editor" class="mb-2">Docker Compose File</Label>
								<div class="border rounded-md overflow-hidden mt-2 h-[550px]">
									<YamlEditor bind:value={composeContent} readOnly={isLoading.saving || isLoading.deploying || isLoading.stopping || isLoading.restarting || isLoading.removing} />
								</div>
								<p class="text-xs text-muted-foreground">
									Edit your <span class="font-bold">compose.yaml</span> file directly. Syntax errors will be highlighted.
								</p>
							</div>

							<div class="space-y-2">
								<Label for="env-editor" class="mb-2">Environment Configuration (.env)</Label>

								<div class="border rounded-md overflow-hidden mt-2 h-[550px]">
									<EnvEditor bind:value={envContent} readOnly={isLoading.saving || isLoading.deploying || isLoading.stopping || isLoading.restarting || isLoading.removing} />
								</div>
								<p class="text-xs text-muted-foreground">Define environment variables in KEY=value format. These will be saved as a .env file in the stack directory.</p>
							</div>
						</div>
					</div>
				</Card.Content>
				<Card.Footer class="flex justify-between">
					<Button variant="outline" type="button" onclick={() => window.history.back()} disabled={isLoading.saving}>
						<ArrowLeft class="mr-2 size-4" />
						Back
					</Button>
					<Button type="button" variant="default" onclick={handleSaveChanges} disabled={isLoading.saving || !hasChanges}>
						{#if isLoading.saving}
							<Loader2 class="mr-2 animate-spin size-4" /> Saving...
						{:else}
							<Save class="mr-2 size-4" /> Save Changes
						{/if}
					</Button>
				</Card.Footer>
			</Card.Root>
		</div>

		<Card.Root class="border shadow-sm">
			<Card.Header>
				<Card.Title>Services</Card.Title>
				<Card.Description>Containers in this stack</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="space-y-2">
					{#if stack.services && stack.services.length > 0}
						{#each stack.services as service (service.id || service.name)}
							{@const status = service.state?.Status || 'unknown'}
							{@const variant = statusVariantMap[status.toLowerCase()] || 'gray'}

							{#if service.id}
								<a href={`/containers/${service.id}`} class="flex flex-col p-3 border rounded-md hover:bg-muted/50 transition-colors">
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-3">
											<div class="bg-muted rounded-md p-1">
												<Layers class="size-4" />
											</div>
											<div>
												<p class="font-medium flex items-center gap-1">{service.name}</p>
												<p class="text-xs text-muted-foreground">{service.id.substring(0, 12)}</p>
											</div>
										</div>
										<div class="flex items-center gap-2">
											<StatusBadge {variant} text={capitalizeFirstLetter(status)} />
											<span class="text-xs text-blue-500 ml-2 flex items-center">
												<span class="hidden sm:inline">View details</span>
												<ArrowRight class="inline-block ml-1 size-3" />
											</span>
										</div>
									</div>
								</a>
							{:else}
								<div class="flex flex-col p-3 border rounded-md">
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-3">
											<div class="bg-muted rounded-md p-1">
												<Layers class="size-4" />
											</div>
											<div>
												<p class="font-medium flex items-center gap-1">{service.name}</p>
												<p class="text-xs text-muted-foreground">Not created</p>
											</div>
										</div>
										<div class="flex items-center gap-2">
											<StatusBadge {variant} text={capitalizeFirstLetter(status)} />
										</div>
									</div>
								</div>
							{/if}
						{/each}
					{:else}
						<div class="text-center py-6 text-muted-foreground">
							<p>No services defined in this stack</p>
						</div>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	{:else if !data.error}
		<div class="flex flex-col items-center justify-center py-12 border rounded-lg shadow-sm bg-card">
			<div class="rounded-full bg-muted/50 p-4 mb-4">
				<AlertCircle class="text-muted-foreground size-8" />
			</div>
			<h2 class="text-lg font-medium mb-2">Stack Not Found</h2>
			<p class="text-center text-muted-foreground max-w-md">Could not load stack data. It may have been removed or the Docker engine is not accessible.</p>
			<div class="flex gap-3 mt-6">
				<Button variant="outline" href="/stacks">
					<ArrowLeft class="mr-2 size-4" />
					Back to Stacks
				</Button>
			</div>
		</div>
	{/if}
</div>
