<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Play, StopCircle, RotateCcw, Download, Trash2, Loader2, RefreshCcwDot } from '@lucide/svelte';
	import ConfirmDialog from './confirm-dialog.svelte';
	import { invalidateAll } from '$app/navigation';
	import type { ApiResponse } from '$lib/types/api-response.type';
	import { toast } from 'svelte-sonner';

	type TargetType = 'container' | 'stack';
	type LoadingStates = {
		start?: boolean;
		stop?: boolean;
		restart?: boolean;
		pull?: boolean;
		deploy?: boolean;
		redeploy?: boolean;
		remove?: boolean;
	};

	let {
		id,
		type = 'container',
		itemState = 'stopped',
		loading = {},
		onActionComplete = $bindable(() => {})
	}: {
		id: string;
		type?: TargetType;
		itemState?: string;
		loading?: LoadingStates;
		onActionComplete?: () => void;
	} = $props();

	// Track dialog states
	let showRemoveDialog = $state(false);
	let showRedeployDialog = $state(false);

	// Track loading states for each action
	let isStarting = $state(false);
	let isStopping = $state(false);
	let isRestarting = $state(false);
	let isRedeploying = $state(false);
	let isRemoving = $state(false);
	let isPulling = $state(false);

	const isRunning = $derived(itemState === 'running' || (type === 'stack' && itemState === 'partially running'));

	// Handle showing confirmation dialogs
	function confirmAction(action: string) {
		if (action === 'remove') {
			showRemoveDialog = true;
		} else if (action === 'redeploy') {
			showRedeployDialog = true;
		}
	}

	// Generic API call function
	async function callApi(action: string, loadingStateSetter: (value: boolean) => void) {
		loadingStateSetter(true);

		// Different endpoint format for stacks vs containers
		let endpoint;
		if (type === 'stack') {
			endpoint = `/api/stacks/${id}/${action}`; // No plural, no separator between "stack" and ID
		} else {
			endpoint = `/api/${type}s/${id}/${action}`; // Plural with separator for containers
		}

		const method = action === 'remove' ? 'DELETE' : 'POST';

		try {
			const response = await fetch(endpoint, { method });
			// Gracefully fallback when there is no JSON body
			let result: ApiResponse = {};
			if (response.headers.get('content-type')?.includes('application/json')) {
				result = await response.json();
			}
			if (!response.ok) {
				throw new Error(result.error ?? `Failed to ${action} ${type}`);
			}
			toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} ${action}ed successfully`);
			await invalidateAll();
			onActionComplete();
		} catch (error: Error | unknown) {
			console.error(`Error ${action}ing ${type}:`, error);
			const errorMessage = error instanceof Error ? error.message : String(error);
			toast.error(`Failed to ${action} ${type}: ${errorMessage}`);
		} finally {
			loadingStateSetter(false);
		}
	}

	// Action handlers
	async function handleStart() {
		await callApi('start', (value) => (isStarting = value));
	}

	async function handleStop() {
		await callApi('stop', (value) => (isStopping = value));
	}

	async function handleRestart() {
		await callApi('restart', (value) => (isRestarting = value));
	}

	async function handleRedeploy() {
		showRedeployDialog = false;
		await callApi('redeploy', (value) => (isRedeploying = value));
	}

	async function handleRemove() {
		showRemoveDialog = false;
		await callApi('remove', (value) => (isRemoving = value));
	}

	async function handlePull() {
		await callApi('pull', (value) => (isPulling = value));
	}
</script>

<!-- Confirmation Dialogs -->
<ConfirmDialog bind:open={showRemoveDialog} title="Confirm Removal" description={`Are you sure you want to remove this ${type}? This action cannot be undone.`} confirmLabel="Remove" variant="destructive" onConfirm={handleRemove} />

<ConfirmDialog bind:open={showRedeployDialog} title="Confirm Redeploy" description={`Are you sure you want to redeploy this ${type}?`} confirmLabel="Redeploy" variant="default" onConfirm={handleRedeploy} />

<!-- Action buttons -->
<div class="flex items-center gap-2">
	{#if !isRunning}
		<Button type="button" variant="default" disabled={isStarting || loading.start} class="font-medium" onclick={handleStart}>
			{#if isStarting || loading.start}
				<Loader2 class="w-4 h-4 mr-2 animate-spin" />
			{:else}
				<Play class="w-4 h-4 mr-2" />
			{/if}
			{type === 'stack' ? 'Deploy' : 'Start'}
		</Button>
	{:else}
		<Button type="button" variant="secondary" disabled={isStopping || loading.stop} class="font-medium" onclick={handleStop}>
			{#if isStopping || loading.stop}
				<Loader2 class="w-4 h-4 animate-spin" />
			{:else}
				<StopCircle class="w-4 h-4" />
			{/if}
			Stop
		</Button>

		<Button type="button" variant="outline" disabled={isRestarting || loading.restart} class="font-medium" onclick={handleRestart}>
			{#if isRestarting || loading.restart}
				<Loader2 class="w-4 h-4 animate-spin" />
			{:else}
				<RotateCcw class="w-4 h-4" />
			{/if}
			Restart
		</Button>
	{/if}

	{#if type === 'container'}
		<Button type="button" variant="destructive" disabled={isRemoving || loading.remove} class="font-medium" onclick={() => confirmAction('remove')}>
			{#if isRemoving || loading.remove}
				<Loader2 class="w-4 h-4 animate-spin" />
			{:else}
				<Trash2 class="w-4 h-4" />
			{/if}
			Remove
		</Button>
	{:else}
		<Button type="button" variant="secondary" disabled={isRedeploying || loading.redeploy} class="font-medium" onclick={() => confirmAction('redeploy')}>
			{#if isRedeploying || loading.redeploy}
				<Loader2 class="w-4 h-4 animate-spin" />
			{:else}
				<RefreshCcwDot class="w-4 h-4" />
			{/if}
			Redeploy
		</Button>

		<Button type="button" variant="outline" disabled={isPulling || loading.pull} class="font-medium" onclick={handlePull}>
			{#if isPulling || loading.pull}
				<Loader2 class="w-4 h-4 animate-spin" />
			{:else}
				<Download class="w-4 h-4" />
			{/if}
			Pull
		</Button>

		<Button type="button" variant="destructive" disabled={isRemoving || loading.remove} class="font-medium" onclick={() => confirmAction('remove')}>
			{#if isRemoving || loading.remove}
				<Loader2 class="w-4 h-4 animate-spin" />
			{:else}
				<Trash2 class="w-4 h-4" />
			{/if}
			Remove
		</Button>
	{/if}
</div>
