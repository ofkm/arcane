<script lang="ts">
	import { Play, StopCircle, RotateCcw, Download, Trash2, Loader2, RefreshCcwDot } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { openConfirmDialog } from './confirm-dialog';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import type { LoadingStates } from '$lib/types/loading-states.type';
	import ContainerAPIService from '$lib/services/api/container-api-service';
	import StackAPIService from '$lib/services/api/stack-api-service';
	import { tryCatch } from '$lib/utils/try-catch';

	const containerApi = new ContainerAPIService();
	const stackApi = new StackAPIService();

	type TargetType = 'container' | 'stack';

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
			openConfirmDialog({
				title: `Confirm Removal`,
				message: `Are you sure you want to remove this ${type}? This action cannot be undone.`,
				confirm: {
					label: 'Remove',
					destructive: true,
					action: async () => {
						isRemoving = true;
						const result = await tryCatch(type === 'container' ? containerApi.remove(id) : stackApi.remove(id));
						if (result.error) {
							console.error(`Failed to remove container ${id}:`, result.error);
							toast.error(`Failed to remove container: ${result.error.message}`);
							isRemoving = false;
							return;
						}

						toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} removed successfully`);
						await invalidateAll();
						onActionComplete();
						isRemoving = false;

						toast.success(`${type} removed successfully.`);
					}
				}
			});
		} else if (action === 'redeploy') {
			openConfirmDialog({
				title: `Confirm Redeploy`,
				message: `Are you sure you want to redeploy this ${type}?`,
				confirm: {
					label: 'Redeploy',
					action: async () => {
						isRedeploying = true;
						const result = await tryCatch(stackApi.redeploy(id));
						if (result.error) {
							isRedeploying = false;
							console.error(`Error Redeploying ${type}:`, result.error);
							toast.error(`Failed to Redeploy ${type}: ${result.error.message}`);
							return;
						}

						toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} redeployed successfully`);
						await invalidateAll();
						onActionComplete();
						isRedeploying = false;
					}
				}
			});
		}
	}

	// Action handlers
	async function handleStart() {
		isStarting = true;
		const result = await tryCatch(type === 'container' ? containerApi.start(id) : stackApi.start(id));
		if (result.error) {
			isStarting = false;
			console.error(`Error startinging ${type}:`, result.error);
			toast.error(`Failed to Start ${type}: ${result.error.message}`);
			return;
		}

		toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} started successfully`);
		await invalidateAll();
		onActionComplete();
		isStarting = false;
	}

	async function handleStop() {
		isStopping = true;
		const result = await tryCatch(type === 'container' ? containerApi.stop(id) : stackApi.stop(id));
		if (result.error) {
			isStopping = false;
			console.error(`Error Stopping ${type}:`, result.error);
			toast.error(`Failed to Stop ${type}: ${result.error.message}`);
			return;
		}

		toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} stopped successfully`);
		await invalidateAll();
		onActionComplete();
		isStopping = false;
	}

	async function handleRestart() {
		isRestarting = true;
		const result = await tryCatch(type === 'container' ? containerApi.restart(id) : stackApi.restart(id));
		if (result.error) {
			isRestarting = false;
			console.error(`Error Restarting ${type}:`, result.error);
			toast.error(`Failed to Restart ${type}: ${result.error.message}`);
			return;
		}

		toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} restarted successfully`);
		await invalidateAll();
		onActionComplete();
		isRestarting = false;
	}

	async function handlePull() {
		isPulling = true;
		const result = await tryCatch(type === 'container' ? containerApi.pull(id) : stackApi.pull(id));
		if (result.error) {
			isPulling = false;
			console.error(`Error Pulling Images for ${type}:`, result.error);
			toast.error(`Failed to Pull Images for ${type}: ${result.error.message}`);
			return;
		}

		toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} images pulled successfully`);
		await invalidateAll();
		onActionComplete();
		isPulling = false;
	}
</script>

<!-- Action buttons -->
<div class="flex items-center gap-2">
	{#if !isRunning}
		<Button type="button" variant="default" disabled={isStarting || loading.start} class="font-medium" onclick={() => handleStart()}>
			{#if isStarting || loading.start}
				<Loader2 class="w-4 h-4 mr-2 animate-spin" />
			{:else}
				<Play class="w-4 h-4 mr-2" />
			{/if}
			{type === 'stack' ? 'Deploy' : 'Start'}
		</Button>
	{:else}
		<Button type="button" variant="secondary" disabled={isStopping || loading.stop} class="font-medium" onclick={() => handleStop()}>
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
