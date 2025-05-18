<script lang="ts">
	import { openConfirmDialog } from './confirm-dialog';
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import type { LoadingStates } from '$lib/types/loading-states.type';
	import ContainerAPIService from '$lib/services/api/container-api-service';
	import StackAPIService from '$lib/services/api/stack-api-service';
	import { tryCatch } from '$lib/utils/try-catch';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import ArcaneButton from './arcane-button.svelte';

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
				title: `Confirm ${type === 'stack' ? 'Destroy' : 'Removal'}`,
				message: `Are you sure you want to ${type === 'stack' ? 'destroy' : 'remove'} this ${type}? This action cannot be undone.`,
				confirm: {
					label: type === 'stack' ? 'Destroy' : 'Remove',
					destructive: true,
					action: async () => {
						isLoading.remove = true;
						handleApiResultWithCallbacks({
							result: await tryCatch(type === 'container' ? containerApi.remove(id) : stackApi.destroy(id)),
							message: `Failed to ${type === 'stack' ? 'Destroy' : 'Removal'} ${type}`,
							setLoadingState: (value) => (isLoading.remove = value),
							onSuccess: async () => {
								toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} ${type === 'stack' ? 'Destroyed' : 'Removed'} Successfully`);
								await invalidateAll();
								goto(`/${type}s`);
							}
						});
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
						handleApiResultWithCallbacks({
							result: await tryCatch(stackApi.redeploy(id)),
							message: `Failed to Redeploy ${type}`,
							setLoadingState: (value) => (isLoading.redeploy = value),
							onSuccess: async () => {
								toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} Redeployed Successfully`);
								await invalidateAll();
							}
						});
					}
				}
			});
		}
	}

	async function handleStart() {
		isLoading.start = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(type === 'container' ? containerApi.start(id) : stackApi.start(id)),
			message: `Failed to Start ${type}`,
			setLoadingState: (value) => (isLoading.start = value),
			onSuccess: async () => {
				toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} Started Successfully`);
				await invalidateAll();
			}
		});
	}

	async function handleStop() {
		isLoading.stop = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(type === 'container' ? containerApi.stop(id) : stackApi.down(id)),
			message: `Failed to Stop ${type}`,
			setLoadingState: (value) => (isLoading.stop = value),
			onSuccess: async () => {
				toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} Stopped Successfully`);
				await invalidateAll();
			}
		});
	}

	async function handleRestart() {
		isLoading.restart = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(type === 'container' ? containerApi.restart(id) : stackApi.restart(id)),
			message: `Failed to Restart ${type}`,
			setLoadingState: (value) => (isLoading.restart = value),
			onSuccess: async () => {
				toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} Restarted Successfully`);
				await invalidateAll();
			}
		});
	}

	async function handlePull() {
		isLoading.pulling = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(type === 'container' ? containerApi.pull(id) : stackApi.pull(id)),
			message: 'Failed to Pull Image(s)',
			setLoadingState: (value) => (isLoading.pulling = value),
			onSuccess: async () => {
				toast.success('Image(s) Pulled Successfully.');
				await invalidateAll();
			}
		});
	}
</script>

<div class="flex items-center gap-2">
	{#if !isRunning}
		<ArcaneButton action={type === 'container' ? 'start' : 'deploy'} onClick={() => handleStart()} loading={isLoading.start} />
	{:else}
		<ArcaneButton label={type === 'stack' ? 'Down' : 'Stop'} action="stop" onClick={() => handleStop()} loading={isLoading.stop} />
		<ArcaneButton action="restart" onClick={() => handleRestart()} loading={isLoading.restart} />
	{/if}

	{#if type === 'container'}
		<ArcaneButton action="remove" onClick={() => confirmAction('remove')} loading={isLoading.remove} />
	{:else}
		<ArcaneButton action="redeploy" onClick={() => confirmAction('redeploy')} loading={isLoading.redeploy} />
		<ArcaneButton action="pull" onClick={handlePull} loading={isLoading.pulling} />
		<ArcaneButton label={type === 'stack' ? 'Destroy' : 'Remove'} action="remove" onClick={() => confirmAction('remove')} loading={isLoading.remove} />
	{/if}
</div>
