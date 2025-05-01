<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ArrowLeft, Loader2, AlertCircle, Save, FileStack, Layers, ArrowRight } from '@lucide/svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import ActionButtons from '$lib/components/action-buttons.svelte';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { statusVariantMap } from '$lib/types/statuses';
	import { capitalizeFirstLetter } from '$lib/utils';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import YamlEditor from '$lib/components/yaml-editor.svelte';
	import { Switch } from '$lib/components/ui/switch/index.js';

	let { data }: { data: PageData } = $props();
	let { stack, editorState } = $derived(data);

	let depoloying = $state(false);
	let stopping = $state(false);
	let restarting = $state(false);
	let removing = $state(false);
	let saving = $state(false);

	let name = $derived(editorState.name);
	let composeContent = $derived(editorState.composeContent);
	let originalName = $derived(editorState.originalName);
	let originalComposeContent = $derived(editorState.originalComposeContent);
	let originalAutoUpdate = $derived(editorState.autoUpdate);

	let hasChanges = $derived(name !== originalName || composeContent !== originalComposeContent || editorState.autoUpdate !== originalAutoUpdate);

	$effect(() => {
		depoloying = false;
		stopping = false;
		restarting = false;
		removing = false;
		saving = false;
	});

	async function handleSaveChanges() {
		if (!stack || !hasChanges) return;

		saving = true;
		console.log('Saving stack via API...');

		try {
			const response = await fetch(`/api/stacks/${stack.id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name,
					composeContent,
					autoUpdate: editorState.autoUpdate
				})
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || `HTTP error! status: ${response.status}`);
			}

			console.log('Stack save successful:', result);
			toast.success('Stack updated successfully!');

			originalName = name;
			originalComposeContent = composeContent;
			originalAutoUpdate = editorState.autoUpdate;

			await invalidateAll();
		} catch (error: unknown) {
			console.error('Error saving stack:', error);
			const message = error instanceof Error ? error.message : String(error);
			toast.error(`Failed to update stack: ${message}`);
		} finally {
			saving = false;
		}
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
				<h1 class="text-2xl font-bold tracking-tight">
					{stack?.name || 'Stack Details'}
				</h1>
			</div>
		</div>

		{#if stack}
			<div class="flex gap-2 flex-wrap">
				<form
					method="POST"
					action={stack.status === 'running' || stack.status === 'partially running' ? '?/stop' : '?/start'}
					use:enhance={() => {
						const isStarting = stack.status !== 'running' && stack.status !== 'partially running';
						if (isStarting) depoloying = true;
						else stopping = true;
						return async ({ update }) => {
							await update({ reset: false });
						};
					}}
				>
					<input type="hidden" name="action" value={stack.status === 'running' || stack.status === 'partially running' ? 'stop' : 'start'} />
					<ActionButtons
						id={stack.id}
						type="stack"
						itemState={stack.status}
						loading={{
							start: depoloying,
							stop: stopping,
							restart: restarting,
							remove: removing
						}}
					/>
				</form>
			</div>
		{/if}
	</div>

	{#if data.error}
		<Alert.Root variant="destructive">
			<AlertCircle class="h-4 w-4" />
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
						<Layers class="h-5 w-5 text-primary" />
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
						<Layers class="h-5 w-5 text-green-500" />
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="p-4 flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Created</p>
						<p class="text-lg font-medium">
							{new Date(stack.createdAt).toLocaleString()}
						</p>
					</div>
					<div class="bg-blue-500/10 p-2 rounded-full">
						<FileStack class="h-5 w-5 text-blue-500" />
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<div class="space-y-6">
			<Card.Root class="border shadow-sm">
				<Card.Header>
					<Card.Title>Stack Configuration</Card.Title>
					<Card.Description>Edit stack settings and compose file</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="space-y-4">
						<div class="grid w-full max-w-sm items-center gap-1.5">
							<Label for="name">Stack Name</Label>
							<Input type="text" id="name" name="name" bind:value={name} required disabled={saving} />
						</div>

						<div class="grid w-full items-center gap-1.5">
							<Label for="compose-editor">Docker Compose File</Label>
							<div class="border rounded-md overflow-hidden">
								<YamlEditor bind:value={composeContent} readOnly={saving || depoloying || stopping || restarting || removing} />
							</div>
							<p class="text-xs text-muted-foreground">
								Edit your <span class="font-bold">compose.yaml</span> file directly. Syntax errors will be highlighted.
							</p>
						</div>

						<div class="flex items-center space-x-2 mt-4">
							<Switch id="auto-update" name="autoUpdate" bind:checked={editorState.autoUpdate} />
							<Label for="auto-update" class="font-medium">Enable auto-update</Label>
							<div class="inline-block">
								<p class="text-xs text-muted-foreground">When enabled, Arcane will periodically check for newer versions of all images in this stack and automatically redeploy it.</p>
							</div>
						</div>
					</div>
				</Card.Content>
				<Card.Footer class="flex justify-between">
					<Button variant="outline" type="button" onclick={() => window.history.back()} disabled={saving}>
						<ArrowLeft class="w-4 h-4 mr-2" />
						Back
					</Button>
					<Button type="button" variant="default" onclick={handleSaveChanges} disabled={saving || !hasChanges}>
						{#if saving}
							<Loader2 class="w-4 h-4 mr-2 animate-spin" /> Saving...
						{:else}
							<Save class="w-4 h-4 mr-2" /> Save Changes
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
							<a href={service.id ? `/containers/${service.id}` : undefined} class={`flex items-center justify-between p-3 border rounded-md ${service.id ? 'hover:bg-muted/50 transition-colors cursor-pointer' : 'cursor-default'}`}>
								<div class="flex items-center gap-3">
									<div class="bg-muted rounded-md p-1">
										<Layers class="h-4 w-4" />
									</div>
									<div>
										<p class="font-medium">{service.name}</p>
										<p class="text-xs text-muted-foreground">
											{service.id ? service.id.substring(0, 12) : 'Not created'}
										</p>
									</div>
								</div>
								<div class="flex items-center gap-2">
									<StatusBadge {variant} text={capitalizeFirstLetter(status)} />
									{#if service.id}
										<div class="text-xs text-blue-500 ml-2">
											<span class="hidden sm:inline">View details</span>
											<ArrowRight class="inline-block ml-1 h-3 w-3" />
										</div>
									{/if}
								</div>
							</a>
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
				<AlertCircle class="h-8 w-8 text-muted-foreground" />
			</div>
			<h2 class="text-lg font-medium mb-2">Stack Not Found</h2>
			<p class="text-center text-muted-foreground max-w-md">Could not load stack data. It may have been removed or the Docker engine is not accessible.</p>
			<div class="flex gap-3 mt-6">
				<Button variant="outline" href="/stacks">
					<ArrowLeft class="h-4 w-4 mr-2" />
					Back to Stacks
				</Button>
			</div>
		</div>
	{/if}
</div>
