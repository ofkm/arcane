<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Loader2 } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	function preventDefault(handler: (event: SubmitEvent) => void) {
		return (event: SubmitEvent) => {
			event.preventDefault();
			handler(event);
		};
	}

	interface Props {
		open?: boolean;
		onPullFinished?: (success: boolean, imageName?: string, error?: string) => void;
	}

	let { open = $bindable(false), onPullFinished = () => {} }: Props = $props();

	let imageRef = $state('');
	let tag = $state('latest');

	let isPulling = $state(false);
	let pullProgress = $state(0);
	let pullStatusText = $state('');
	let pullError = $state('');
	let layerProgress = $state<Record<string, { current: number; total: number; status: string }>>(
		{}
	);

	export function onClose() {
		if (isPulling) {
			toast.info('Pull operation is in progress.');
			return;
		}
		resetState();
		open = false;
	}

	function resetState() {
		isPulling = false;
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
			} else if (
				layer.status &&
				(layer.status.toLowerCase().includes('pull complete') ||
					layer.status.toLowerCase().includes('already exists'))
			) {
			}
		}

		if (totalExpectedBytes > 0) {
			pullProgress = (totalCurrentBytes / totalExpectedBytes) * 100;
		} else if (activeLayers > 0 && totalCurrentBytes > 0) {
			pullProgress = 5;
		} else if (Object.keys(layerProgress).length > 0 && activeLayers === 0) {
			const allDone = Object.values(layerProgress).every(
				(l) =>
					l.status &&
					(l.status.toLowerCase().includes('pull complete') ||
						l.status.toLowerCase().includes('already exists'))
			);
			if (allDone) pullProgress = 100;
		}
	}

	async function handleSubmit() {
		if (!imageRef.trim()) {
			pullError = 'Image name cannot be empty.';
			return;
		}

		resetState();
		isPulling = true;
		pullStatusText = 'Initiating pull...';

		let imageName = imageRef.trim();
		let imageTag = tag.trim() || 'latest';

		if (imageName.includes(':')) {
			const parts = imageName.split(':');
			imageName = parts[0];
			if (parts.length > 1 && parts[1].trim() !== '') {
				imageTag = parts[1].trim();
			}
		}
		const fullImageName = `${imageName}:${imageTag}`;
		pullStatusText = `Pulling ${fullImageName}...`;

		try {
			const response = await fetch('/api/images/pull', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ imageName: fullImageName })
			});

			if (!response.ok || !response.body) {
				const errorData = await response
					.json()
					.catch(() => ({ error: 'Failed to pull image. Server returned an error.' }));
				const errorMessage =
					typeof errorData.error === 'string'
						? errorData.error
						: errorData.message || `HTTP error ${response.status}`;
				throw new Error(errorMessage);
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) {
					pullStatusText = 'Processing final layers...';
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
							pullError =
								typeof data.error === 'string'
									? data.error
									: data.error.message || 'An error occurred during pull.';
							pullStatusText = `Error: ${pullError}`;
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

			pullStatusText = `Image ${fullImageName} pulled successfully.`;
			toast.success(pullStatusText);
			onPullFinished(true, fullImageName);
			open = false;
		} catch (error: any) {
			console.error('Pull image error:', error);
			const message = error.message || 'An unexpected error occurred while pulling the image.';
			pullError = message;
			pullStatusText = `Failed: ${message}`;
			toast.error(message);
			onPullFinished(false, fullImageName, message);
		} finally {
			isPulling = false;
		}
	}
</script>

<Dialog.Root
	bind:open
	onOpenChange={(o) => {
		if (!o && !isPulling) resetState();
		else if (!o && isPulling) open = true;
	}}
>
	<Dialog.Content class="sm:max-w-[500px]">
		<Dialog.Header data-testid="pull-docker-image-header">
			<Dialog.Title>Pull Docker Image</Dialog.Title>
			<Dialog.Description>
				Enter the image reference you want to pull from a registry.
				{#if pullError}
					<p class="text-destructive mt-2 text-sm">{pullError}</p>
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={preventDefault(handleSubmit)} class="grid gap-4 py-4">
			<div class="flex flex-col gap-2">
				<Label for="image-ref">Image</Label>
				<div class="flex items-center gap-2">
					<div class="flex-1">
						<Input
							id="image-ref"
							bind:value={imageRef}
							placeholder="e.g., nginx or myregistry.com/ubuntu"
							required
							disabled={isPulling}
						/>
					</div>
					<div class="flex items-center">
						<span class="text-muted-foreground text-lg font-medium">:</span>
					</div>
					<div class="w-1/3">
						<Input id="image-tag" bind:value={tag} placeholder="latest" disabled={isPulling} />
					</div>
				</div>
			</div>

			{#if isPulling || pullStatusText}
				<div class="mt-4">
					{#if isPulling}
						<div class="mb-1 flex justify-between text-xs">
							<span>{pullStatusText || 'Pulling image...'}</span>
							<span>{Math.round(pullProgress)}%</span>
						</div>
						<div class="bg-secondary h-2 w-full overflow-hidden rounded-full">
							<div
								class="bg-primary h-full transition-all duration-150 ease-linear"
								style="width: {pullProgress}%"
							></div>
						</div>
					{:else if pullStatusText && !pullError}
						<p class="mt-1 text-xs text-green-600">{pullStatusText}</p>
					{/if}
					{#if !isPulling && pullError}{/if}
					{#if isPulling}
						<p class="text-muted-foreground mt-1 text-xs">
							This may take a while depending on the image size and your internet connection.
						</p>
					{/if}
				</div>
			{/if}

			<Dialog.Footer>
				<Button variant="outline" onclick={onClose} disabled={isPulling}>Cancel</Button>
				<Button
					type="submit"
					disabled={isPulling || !imageRef.trim()}
					class="relative min-w-[100px]"
				>
					{#if isPulling}
						<div class="absolute inset-0 flex items-center justify-center">
							<Loader2 class="size-4 animate-spin" />
						</div>
						<span class="opacity-0">Pull Image</span>
					{:else}
						Pull Image
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
