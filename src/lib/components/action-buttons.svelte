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
	import { handleApiReponse } from '$lib/utils/api.util';

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
		loading: LoadingStates;
		onActionComplete?: () => void;
	} = $props();

	let isLoading = $state({
		start: false,
		stop: false,
		restart: false,
		remove: false,
		pulling: false,
		redeploy: false
	});

	const isRunning = $derived(itemState === 'running' || (type === 'stack' && itemState === 'partially running'));

	$effect(() => {
		isLoading.start = loading.start ?? false;
		isLoading.stop = loading.stop ?? false;
		isLoading.pulling = loading.pull ?? false;
		isLoading.remove = loading.remove ?? false;
		isLoading.restart = loading.restart ?? false;
		isLoading.redeploy = loading.redeploy ?? false;
	});

	function confirmAction(action: string) {
		if (action === 'remove') {
			openConfirmDialog({
				title: `Confirm Removal`,
				message: `Are you sure you want to remove this ${type}? This action cannot be undone.`,
				confirm: {
					label: 'Remove',
					destructive: true,
					action: async () => {
						isLoading.remove = true;
						handleApiReponse(
							await tryCatch(type === 'container' ? containerApi.remove(id) : stackApi.remove(id)),
							`Failed to Remove ${type}`,
							(value) => (isLoading.remove = value),
							async () => {
								toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} Removed Successfully`);
								await invalidateAll();
							}
						);
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
						isLoading.redeploy = true;
						handleApiReponse(
							await tryCatch(stackApi.redeploy(id)),
							`Failed to Redeploy ${type}`,
							(value) => (isLoading.redeploy = value),
							async () => {
								toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} Redeployed Successfully`);
								await invalidateAll();
							}
						);
					}
				}
			});
		}
	}

	async function handleStart() {
		isLoading.start = true;
		handleApiReponse(
			await tryCatch(type === 'container' ? containerApi.start(id) : stackApi.start(id)),
			`Failed to Start ${type}`,
			(value) => (isLoading.start = value),
			async () => {
				toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} Started Successfully`);
				await invalidateAll();
			}
		);
	}

	async function handleStop() {
		isLoading.stop = true;
		handleApiReponse(
			await tryCatch(type === 'container' ? containerApi.stop(id) : stackApi.stop(id)),
			`Failed to Stop ${type}`,
			(value) => (isLoading.stop = value),
			async () => {
				toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} Stopped Successfully`);
				await invalidateAll();
			}
		);
	}

	async function handleRestart() {
		isLoading.restart = true;
		handleApiReponse(
			await tryCatch(type === 'container' ? containerApi.restart(id) : stackApi.restart(id)),
			`Failed to Restart ${type}`,
			(value) => (isLoading.restart = value),
			async () => {
				toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} Restarted Successfully`);
				await invalidateAll();
			}
		);
	}

	async function handlePull() {
		isLoading.pulling = true;
		handleApiReponse(
			await tryCatch(type === 'container' ? containerApi.pull(id) : stackApi.pull(id)),
			'Failed to Pull Image(s)',
			(value) => (isLoading.pulling = value),
			async () => {
				toast.success('Image(s) Pulled Successfully.');
				await invalidateAll();
			}
		);
	}
</script>

<div class="flex items-center gap-2">
	{#if !isRunning}
		<Button type="button" variant="default" disabled={isLoading.start || loading.start} class="font-medium" onclick={() => handleStart()}>
			{#if isLoading.start || loading.start}
				<Loader2 class="w-4 h-4 mr-2 animate-spin" />
			{:else}
				<Play class="w-4 h-4 mr-2" />
			{/if}
			{type === 'stack' ? 'Deploy' : 'Start'}
		</Button>
	{:else}
		<Button type="button" variant="secondary" disabled={isLoading.stop || loading.stop} class="font-medium" onclick={() => handleStop()}>
			{#if isLoading.stop || loading.stop}
				<Loader2 class="w-4 h-4 animate-spin" />
			{:else}
				<StopCircle class="w-4 h-4" />
			{/if}
			Stop
		</Button>

		<Button type="button" variant="outline" disabled={isLoading.restart || loading.restart} class="font-medium" onclick={() => handleRestart()}>
			{#if isLoading.restart || loading.restart}
				<Loader2 class="w-4 h-4 animate-spin" />
			{:else}
				<RotateCcw class="w-4 h-4" />
			{/if}
			Restart
		</Button>
	{/if}

	{#if type === 'container'}
		<Button type="button" variant="destructive" disabled={isLoading.remove || loading.remove} class="font-medium" onclick={() => confirmAction('remove')}>
			{#if isLoading.remove || loading.remove}
				<Loader2 class="w-4 h-4 animate-spin" />
			{:else}
				<Trash2 class="w-4 h-4" />
			{/if}
			Remove
		</Button>
	{:else}
		<Button type="button" variant="secondary" disabled={isLoading.redeploy || loading.redeploy} class="font-medium" onclick={() => confirmAction('redeploy')}>
			{#if isLoading.redeploy || loading.redeploy}
				<Loader2 class="w-4 h-4 animate-spin" />
			{:else}
				<RefreshCcwDot class="w-4 h-4" />
			{/if}
			Redeploy
		</Button>

		<Button type="button" variant="outline" disabled={isLoading.pulling || loading.pull} class="font-medium" onclick={() => handlePull()}>
			{#if isLoading.pulling || loading.pull}
				<Loader2 class="w-4 h-4 animate-spin" />
			{:else}
				<Download class="w-4 h-4" />
			{/if}
			Pull
		</Button>

		<Button type="button" variant="destructive" disabled={isLoading.remove || loading.remove} class="font-medium" onclick={() => confirmAction('remove')}>
			{#if isLoading.remove || loading.remove}
				<Loader2 class="w-4 h-4 animate-spin" />
			{:else}
				<Trash2 class="w-4 h-4" />
			{/if}
			Remove
		</Button>
	{/if}
</div>
