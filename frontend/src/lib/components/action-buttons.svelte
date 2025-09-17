<script lang="ts">
	import { openConfirmDialog } from './confirm-dialog';
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { environmentAPI } from '$lib/services/api';
	import { tryCatch } from '$lib/utils/try-catch';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { ArcaneButton } from '$lib/components/arcane-button/index.js';
	import ProgressPopover from '$lib/components/progress-popover.svelte';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import { environmentStore, LOCAL_DOCKER_ENVIRONMENT_ID } from '$lib/stores/environment.store';
	import { get } from 'svelte/store';
	import { m } from '$lib/paraglide/messages';

	type TargetType = 'container' | 'project';
	type LoadingStates = {
		start?: boolean;
		stop?: boolean;
		restart?: boolean;
		pull?: boolean;
		deploy?: boolean;
		redeploy?: boolean;
		remove?: boolean;
		validating?: boolean;
	};

	let {
		id,
		type = 'container',
		itemState = 'stopped',
		loading = $bindable<LoadingStates>({}),
		onActionComplete = $bindable<(status?: string) => void>(() => {}),
		startLoading = $bindable(false),
		stopLoading = $bindable(false),
		restartLoading = $bindable(false),
		removeLoading = $bindable(false),
		redeployLoading = $bindable(false)
	}: {
		id: string;
		type?: TargetType;
		itemState?: string;
		loading?: LoadingStates;
		onActionComplete?: (status?: string) => void;
		startLoading?: boolean;
		stopLoading?: boolean;
		restartLoading?: boolean;
		removeLoading?: boolean;
		redeployLoading?: boolean;
	} = $props();

	let isLoading = $state<LoadingStates>({
		start: false,
		stop: false,
		restart: false,
		remove: false,
		pull: false,
		redeploy: false,
		validating: false
	});

	function setLoading<K extends keyof LoadingStates>(key: K, value: boolean) {
		isLoading[key] = value;
		loading = { ...loading, [key]: value };

		if (key === 'start') startLoading = value;
		if (key === 'stop') stopLoading = value;
		if (key === 'restart') restartLoading = value;
		if (key === 'remove') removeLoading = value;
		if (key === 'redeploy') redeployLoading = value;
	}

	const uiLoading = $derived({
		start: !!(isLoading.start || loading?.start || startLoading),
		stop: !!(isLoading.stop || loading?.stop || stopLoading),
		restart: !!(isLoading.restart || loading?.restart || restartLoading),
		remove: !!(isLoading.remove || loading?.remove || removeLoading),
		pulling: !!(isLoading.pull || loading?.pull),
		redeploy: !!(isLoading.redeploy || loading?.redeploy || redeployLoading),
		validating: !!(isLoading.validating || loading?.validating)
	});

	let pullPopoverOpen = $state(false);
	let pullProgress = $state(0);
	let pullStatusText = $state('');
	let pullError = $state('');
	let layerProgress = $state<Record<string, { current: number; total: number; status: string }>>({});

	const isRunning = $derived(itemState === 'running' || (type === 'project' && itemState === 'partially running'));

	function resetPullState() {
		pullProgress = 0;
		pullStatusText = '';
		pullError = '';
		layerProgress = {};
	}

	function calculateOverallProgress() {
		let totalCurrentBytes = 0;
		let totalExpectedBytes = 0;
		let activeLayers = 0;

		for (const id in layerProgress) {
			const layer = layerProgress[id];
			if (layer.total > 0) {
				totalCurrentBytes += layer.current;
				totalExpectedBytes += layer.total;
				activeLayers++;
			}
		}

		if (totalExpectedBytes > 0) {
			pullProgress = (totalCurrentBytes / totalExpectedBytes) * 100;
		} else if (activeLayers > 0 && totalCurrentBytes > 0) {
			pullProgress = 5;
		} else if (Object.keys(layerProgress).length > 0 && activeLayers === 0) {
			const allDone = Object.values(layerProgress).every(
				(l) => l.status && (l.status.toLowerCase().includes('pull complete') || l.status.toLowerCase().includes('already exists'))
			);
			if (allDone) pullProgress = 100;
		}
	}

	function buildPullApiUrl(): string {
		const envId = getCurrentEnvironmentId();
		return `/api/environments/${envId}/projects/${id}/pull`;
	}

	function getCurrentEnvironmentId(): string {
		const env = get(environmentStore.selected);
		return env?.id || LOCAL_DOCKER_ENVIRONMENT_ID;
	}

	function confirmAction(action: string) {
		if (action === 'remove') {
			openConfirmDialog({
				title: type === 'project' ? m.compose_destroy() : m.action_confirm_removal_title(),
				message:
					type === 'project'
						? m.action_confirm_destroy_message({ type: m.project() })
						: m.action_confirm_removal_message({ type: m.container() }),
				confirm: {
					label: type === 'project' ? m.compose_destroy() : m.common_remove(),
					destructive: true,
					action: async (checkboxStates) => {
						const removeFiles = checkboxStates['removeFiles'] === true;
						const removeVolumes = checkboxStates['removeVolumes'] === true;

						setLoading('remove', true);
						handleApiResultWithCallbacks({
							result: await tryCatch(
								type === 'container'
									? environmentAPI.deleteContainer(id)
									: environmentAPI.destroyProject(id, removeVolumes, removeFiles)
							),
							message: m.action_failed_generic({
								action: type === 'project' ? m.compose_destroy() : m.common_remove(),
								type: type
							}),
							setLoadingState: (value) => setLoading('remove', value),
							onSuccess: async () => {
								toast.success(
									type === 'project'
										? m.action_destroyed_success({ type: m.project() })
										: m.action_removed_success({ type: m.container() })
								);
								await invalidateAll();
								goto(type === 'project' ? '/compose' : '/containers');
							}
						});
					}
				},
				checkboxes: [
					{ id: 'removeFiles', label: m.confirm_remove_project_files(), initialState: false },
					{
						id: 'removeVolumes',
						label: m.confirm_remove_volumes_warning(),
						initialState: false
					}
				]
			});
		} else if (action === 'redeploy') {
			openConfirmDialog({
				title: m.action_confirm_redeploy_title(),
				message: m.action_confirm_redeploy_message(),
				confirm: {
					label: m.action_redeploy(),
					action: async () => {
						setLoading('redeploy', true);
						handleApiResultWithCallbacks({
							result: await tryCatch(environmentAPI.redeployProject(id)),
							message: m.action_failed_generic({ action: m.action_redeploy(), type }),
							setLoadingState: (value) => setLoading('redeploy', value),
							onSuccess: async () => {
								toast.success(m.action_redeploy_success({ type }));
								onActionComplete('running');
							}
						});
					}
				}
			});
		}
	}

	async function handleStart() {
		setLoading('start', true);
		await handleApiResultWithCallbacks({
			result: await tryCatch(type === 'container' ? environmentAPI.startContainer(id) : environmentAPI.deployProject(id)),
			message: m.action_failed_generic({ action: m.common_start(), type }),
			setLoadingState: (value) => setLoading('start', value),
			onSuccess: async () => {
				itemState = 'running';
				toast.success(m.action_started_success({ type }));
				onActionComplete('running');
			}
		});
	}

	async function handleDeploy() {
		setLoading('start', true);
		await handleApiResultWithCallbacks({
			result: await tryCatch(environmentAPI.deployProject(id)),
			message: m.action_failed_generic({ action: m.common_start(), type }),
			setLoadingState: (value) => setLoading('start', value),
			onSuccess: async () => {
				itemState = 'running';
				toast.success(m.action_started_success({ type }));
				onActionComplete('running');
			}
		});
	}

	async function handleStop() {
		setLoading('stop', true);
		await handleApiResultWithCallbacks({
			result: await tryCatch(type === 'container' ? environmentAPI.stopContainer(id) : environmentAPI.downProject(id)),
			message: m.action_failed_generic({ action: m.common_stop(), type }),
			setLoadingState: (value) => setLoading('stop', value),
			onSuccess: async () => {
				itemState = 'stopped';
				toast.success(m.action_stopped_success({ type }));
				onActionComplete('stopped');
			}
		});
	}

	async function handleRestart() {
		setLoading('restart', true);
		await handleApiResultWithCallbacks({
			result: await tryCatch(type === 'container' ? environmentAPI.restartContainer(id) : environmentAPI.restartProject(id)),
			message: m.action_failed_generic({ action: m.common_restart(), type }),
			setLoadingState: (value) => setLoading('restart', value),
			onSuccess: async () => {
				itemState = 'running';
				toast.success(m.action_restarted_success({ type }));
				onActionComplete('running');
			}
		});
	}

	async function handlePull() {
		if (type === 'container') {
			isLoading.pull = true;
			await handleApiResultWithCallbacks({
				result: await tryCatch(environmentAPI.pullContainerImage(id)),
				message: m.images_pull_failed(),
				setLoadingState: (value) => (isLoading.pull = value),
				onSuccess: async () => {
					toast.success(m.images_pulled_success());
					onActionComplete();
				}
			});
		} else {
			await handleProjectPull();
		}
	}

	async function handleProjectPull() {
		resetPullState();
		isLoading.pull = true;
		pullPopoverOpen = true;
		pullStatusText = m.images_pull_initiating();

		let wasSuccessful = false;

		try {
			const response = await fetch(buildPullApiUrl(), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok || !response.body) {
				const errorData = await response.json().catch(() => ({
					error: m.images_pull_server_error()
				}));
				const errorMessage =
					typeof errorData.error === 'string'
						? errorData.error
						: errorData.message || `${m.images_pull_server_error()}: HTTP ${response.status}`;
				throw new Error(errorMessage);
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) {
					pullStatusText = m.images_pull_processing_final_layers();
					break;
				}

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					if (line.trim() === '') continue;
					try {
						const data = JSON.parse(line);

						if (data.error) {
							console.error('Error in stream:', data.error);
							pullError = typeof data.error === 'string' ? data.error : data.error.message || m.images_pull_stream_error();
							pullStatusText = m.images_pull_failed_with_error({ error: pullError });
							continue;
						}

						pullStatusText = data.status || pullStatusText;
						if (data.id) {
							const currentLayer = layerProgress[data.id] || { current: 0, total: 0, status: '' };
							currentLayer.status = data.status || currentLayer.status;

							if (data.progressDetail) {
								currentLayer.current = data.progressDetail.current || currentLayer.current;
								currentLayer.total = data.progressDetail.total || currentLayer.total;
							}
							layerProgress[data.id] = currentLayer;
						}
						calculateOverallProgress();
					} catch (e: any) {
						console.warn('Failed to parse stream line or process data:', line, e);
					}
				}
			}

			calculateOverallProgress();
			if (!pullError && pullProgress < 100) {
				const allLayersCompleteOrExisting = Object.values(layerProgress).every(
					(l) =>
						l.status &&
						(l.status.toLowerCase().includes('complete') ||
							l.status.toLowerCase().includes('already exists') ||
							l.status.toLowerCase().includes('downloaded newer image'))
				);
				if (allLayersCompleteOrExisting && Object.keys(layerProgress).length > 0) {
					pullProgress = 100;
				}
			}

			if (pullError) {
				throw new Error(pullError);
			}

			wasSuccessful = true;
			pullProgress = 100;
			pullStatusText = m.images_pulled_success();
			toast.success(m.images_pulled_success());
			await invalidateAll();

			setTimeout(() => {
				pullPopoverOpen = false;
				isLoading.pull = false;
				resetPullState();
			}, 2000);
		} catch (error: any) {
			console.error('Pull images error:', error);
			const message = error.message || m.images_pull_failed();
			pullError = message;
			pullStatusText = m.images_pull_failed_with_error({ error: message });
			toast.error(message);
		} finally {
			if (!wasSuccessful) {
				isLoading.pull = false;
			}
		}
	}
</script>

<div class="flex items-center gap-2">
	{#if !isRunning}
		<ArcaneButton
			action={type === 'container' ? 'start' : 'deploy'}
			onclick={type === 'container' ? () => handleStart() : () => handleDeploy()}
			loading={uiLoading.start}
		/>
	{/if}

	{#if isRunning}
		<ArcaneButton
			action="stop"
			customLabel={type === 'project' ? (m.action_down ? m.action_down() : 'Down') : undefined}
			onclick={() => handleStop()}
			loading={uiLoading.stop}
		/>
		<ArcaneButton action="restart" onclick={() => handleRestart()} loading={uiLoading.restart} />
	{/if}

	{#if type === 'container'}
		<ArcaneButton action="remove" onclick={() => confirmAction('remove')} loading={uiLoading.remove} />
	{:else}
		<ArcaneButton action="redeploy" onclick={() => confirmAction('redeploy')} loading={uiLoading.redeploy} />

		{#if type === 'project'}
			<ProgressPopover
				bind:open={pullPopoverOpen}
				bind:progress={pullProgress}
				title={m.progress_pulling_images()}
				statusText={pullStatusText}
				error={pullError}
				loading={uiLoading.pulling}
				icon={DownloadIcon}
			>
				<ArcaneButton action="pull" onclick={() => handlePull()} loading={uiLoading.pulling} />
			</ProgressPopover>
		{:else}
			<ArcaneButton action="pull" onclick={() => handlePull()} loading={uiLoading.pulling} />
		{/if}

		<ArcaneButton
			customLabel={type === 'project' ? m.compose_destroy() : m.common_remove()}
			action="remove"
			onclick={() => confirmAction('remove')}
			loading={uiLoading.remove}
		/>
	{/if}
</div>
