<script lang="ts">
	import { openConfirmDialog } from './confirm-dialog';
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import type { LoadingStates } from '$lib/types/loading-states.type';
	import { environmentAPI } from '$lib/services/api';
	import { tryCatch } from '$lib/utils/try-catch';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import ArcaneButton from './arcane-button.svelte';

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
		redeploy: false,
		validating: false
	});

	const isRunning = $derived(itemState === 'running' || (type === 'stack' && itemState === 'partially running'));

	$effect(() => {
		isLoading.start = loading.start ?? false;
		isLoading.stop = loading.stop ?? false;
		isLoading.pulling = loading.pull ?? false;
		isLoading.remove = loading.remove ?? false;
		isLoading.restart = loading.restart ?? false;
		isLoading.redeploy = loading.redeploy ?? false;
		isLoading.validating = loading.validating ?? false;
	});

	function confirmAction(action: string) {
		if (action === 'remove') {
			openConfirmDialog({
				title: `Confirm ${type === 'stack' ? 'Destroy' : 'Removal'}`,
				message: `Are you sure you want to ${type === 'stack' ? 'destroy' : 'remove'} this ${type}? This action is DESTRUCTIVE and cannot be undone.`,
				confirm: {
					label: type === 'stack' ? 'Destroy' : 'Remove',
					destructive: true,
					action: async (checkboxStates) => {
						console.log('Debug - received checkbox states:', checkboxStates);

						// Ensure these are proper booleans
						const removeFiles = checkboxStates['removeFiles'] === true;
						const removeVolumes = checkboxStates['removeVolumes'] === true;

						console.log('Debug - removeFiles:', removeFiles, 'removeVolumes:', removeVolumes);

						isLoading.remove = true;
						handleApiResultWithCallbacks({
							result: await tryCatch(type === 'container' ? environmentAPI.deleteContainer(id) : environmentAPI.destroyStack(id, removeVolumes, removeFiles)),
							message: `Failed to ${type === 'stack' ? 'Destroy' : 'Remove'} ${type}`,
							setLoadingState: (value) => (isLoading.remove = value),
							onSuccess: async () => {
								toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} ${type === 'stack' ? 'Destroyed' : 'Removed'} Successfully`);
								await invalidateAll();
								goto(`/${type}s`);
							}
						});
					}
				},
				checkboxes: [
					{ id: 'removeFiles', label: 'Remove stack files', initialState: false },
					{
						id: 'removeVolumes',
						label: 'Remove volumes (Warning: Data will be lost)',
						initialState: false
					}
				]
			});
		} else if (action === 'redeploy') {
			openConfirmDialog({
				title: `Confirm Redeploy`,
				message: `Are you sure you want to redeploy this stack? This will STOP, PULL, and START the Stack.`,
				confirm: {
					label: 'Redeploy',
					action: async () => {
						isLoading.redeploy = true;
						handleApiResultWithCallbacks({
							result: await tryCatch(environmentAPI.redeployStack(id)),
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
			result: await tryCatch(type === 'container' ? environmentAPI.startContainer(id) : environmentAPI.startStack(id)),
			message: `Failed to Start ${type}`,
			setLoadingState: (value) => (isLoading.start = value),
			onSuccess: async () => {
				toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} Started Successfully`);
				await invalidateAll();
			}
		});
	}

	async function handleDeploy() {
		isLoading.start = true;
		handleApiResultWithCallbacks({
			result: await tryCatch(environmentAPI.startStack(id)),
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
			result: await tryCatch(type === 'container' ? environmentAPI.stopContainer(id) : environmentAPI.stopStack(id)),
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
			result: await tryCatch(type === 'container' ? environmentAPI.restartContainer(id) : environmentAPI.restartStack(id)),
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
			result: await tryCatch(type === 'container' ? environmentAPI.pullContainerImage(id) : environmentAPI.pullStackImages(id)),
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
		<ArcaneButton action={type === 'container' ? 'start' : 'deploy'} onClick={type === 'container' ? () => handleStart() : () => handleDeploy()} loading={isLoading.start} />
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
