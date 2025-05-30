<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { ArrowLeft, Save, Play, StopCircle, RotateCcw, Loader2, FileStack, Layers, Activity, Users } from '@lucide/svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import StatusBadge from '$lib/components/badges/status-badge.svelte';
	import { statusVariantMap } from '$lib/types/statuses';
	import { capitalizeFirstLetter } from '$lib/utils/string.utils';

	let { data }: { data: PageData } = $props();
	let { agent, stack, stackName } = data;

	let composeContent = $state(stack.composeContent || '');
	let envContent = $state(stack.envContent || '');
	let isLoading = $state(false);
	let isActionLoading = $state<string | null>(null);

	// Check if there are changes
	let hasChanges = $derived(composeContent !== (stack.composeContent || '') || envContent !== (stack.envContent || ''));

	async function saveStack() {
		isLoading = true;
		try {
			const response = await fetch(`/api/agents/${agent.id}/tasks`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'stack_update',
					payload: {
						project_name: stackName,
						compose_content: composeContent,
						env_content: envContent
					}
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to save stack');
			}

			toast.success('Stack updated successfully');
			await invalidateAll();
		} catch (error) {
			console.error('Failed to save stack:', error);
			toast.error(`Failed to save stack: ${error instanceof Error ? error.message : 'Unknown error'}`);
		} finally {
			isLoading = false;
		}
	}

	async function handleStackAction(action: 'up' | 'down' | 'restart') {
		isActionLoading = action;
		try {
			let taskType: string;
			switch (action) {
				case 'up':
					taskType = 'compose_up';
					break;
				case 'down':
					taskType = 'compose_down';
					break;
				case 'restart':
					taskType = 'compose_restart';
					break;
			}

			const response = await fetch(`/api/agents/${agent.id}/tasks`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: taskType,
					payload: { project_name: stackName }
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Failed to ${action} stack`);
			}

			toast.success(`Stack ${action === 'up' ? 'started' : action === 'down' ? 'stopped' : 'restarted'} successfully`);
			await invalidateAll();
		} catch (error) {
			console.error(`Failed to ${action} stack:`, error);
			toast.error(`Failed to ${action} stack: ${error instanceof Error ? error.message : 'Unknown error'}`);
		} finally {
			isActionLoading = null;
		}
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-4">
		<Button variant="ghost" size="icon" onclick={() => goto('/stacks')}>
			<ArrowLeft class="size-4" />
		</Button>
		<div class="flex-1">
			<h1 class="text-3xl font-bold tracking-tight">Edit Agent Stack</h1>
			<p class="text-sm text-muted-foreground mt-1">
				Editing <span class="font-medium">{stackName}</span> on <span class="font-medium">{agent.hostname}</span>
			</p>
		</div>
		{#if hasChanges}
			<Button onclick={saveStack} disabled={isLoading} class="bg-green-600 hover:bg-green-700">
				{#if isLoading}
					<Loader2 class="size-4 mr-2 animate-spin" />
				{:else}
					<Save class="size-4 mr-2" />
				{/if}
				Save Changes
			</Button>
		{/if}
	</div>

	<!-- Summary Cards -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<Card.Root>
			<Card.Content class="p-6 flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Services</p>
					<p class="text-2xl font-bold">{stack.serviceCount || 0}</p>
				</div>
				<div class="bg-primary/10 p-3 rounded-full">
					<Layers class="text-primary size-5" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="p-6 flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Status</p>
					<StatusBadge variant={statusVariantMap[stack.status?.toLowerCase() || 'unknown']} text={capitalizeFirstLetter(stack.status || 'unknown')} />
				</div>
				<div class="bg-blue-500/10 p-3 rounded-full">
					<Activity class="text-blue-500 size-5" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="p-6 flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Agent</p>
					<p class="text-lg font-medium">{agent.hostname}</p>
				</div>
				<div class="bg-green-500/10 p-3 rounded-full">
					<Users class="text-green-500 size-5" />
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Quick Actions -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Quick Actions</Card.Title>
		</Card.Header>
		<Card.Content class="flex gap-3">
			<Button onclick={() => handleStackAction('up')} disabled={!!isActionLoading || stack.status === 'running'}>
				{#if isActionLoading === 'up'}
					<Loader2 class="size-4 mr-2 animate-spin" />
				{:else}
					<Play class="size-4 mr-2" />
				{/if}
				Start Stack
			</Button>

			<Button variant="outline" onclick={() => handleStackAction('restart')} disabled={!!isActionLoading}>
				{#if isActionLoading === 'restart'}
					<Loader2 class="size-4 mr-2 animate-spin" />
				{:else}
					<RotateCcw class="size-4 mr-2" />
				{/if}
				Restart Stack
			</Button>

			<Button variant="outline" onclick={() => handleStackAction('down')} disabled={!!isActionLoading || stack.status !== 'running'}>
				{#if isActionLoading === 'down'}
					<Loader2 class="size-4 mr-2 animate-spin" />
				{:else}
					<StopCircle class="size-4 mr-2" />
				{/if}
				Stop Stack
			</Button>
		</Card.Content>
	</Card.Root>

	<!-- File Editors -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Docker Compose -->
		<Card.Root>
			<Card.Header>
				<Card.Title>docker-compose.yml</Card.Title>
			</Card.Header>
			<Card.Content>
				<Textarea bind:value={composeContent} placeholder="Enter docker-compose.yml content..." class="font-mono text-sm min-h-[500px]" disabled={isLoading} />
				<p class="text-sm text-muted-foreground mt-2">Edit your compose file directly. Changes will be applied to the remote agent.</p>
			</Card.Content>
		</Card.Root>

		<!-- Environment Variables -->
		<Card.Root>
			<Card.Header>
				<Card.Title>.env</Card.Title>
			</Card.Header>
			<Card.Content>
				<Textarea bind:value={envContent} placeholder="Enter environment variables..." class="font-mono text-sm min-h-[500px]" disabled={isLoading} />
				<p class="text-sm text-muted-foreground mt-2">Define environment variables in KEY=value format. Variables will be applied on the remote agent.</p>
			</Card.Content>
		</Card.Root>
	</div>
</div>
