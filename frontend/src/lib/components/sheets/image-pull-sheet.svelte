<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import FormInput from '$lib/components/form/form-input.svelte';
	import { Loader2, Download } from '@lucide/svelte';
	import { z } from 'zod/v4';
	import { createForm, preventDefault } from '$lib/utils/form.utils';
	import { toast } from 'svelte-sonner';

	type ImagePullFormProps = {
		open: boolean;
		onPullFinished?: (success: boolean, imageName?: string, error?: string) => void;
	};

	let { open = $bindable(false), onPullFinished = () => {} }: ImagePullFormProps = $props();

	const formSchema = z.object({
		imageRef: z.string().min(1, 'Image name is required'),
		tag: z.string().optional().default('latest')
	});

	let formData = $derived({
		imageRef: '',
		tag: 'latest'
	});

	let { inputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, formData));

	let isPulling = $state(false);
	let pullProgress = $state(0);
	let pullStatusText = $state('');
	let pullError = $state('');
	let layerProgress = $state<Record<string, { current: number; total: number; status: string }>>({});

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
			}
		}

		if (totalExpectedBytes > 0) {
			pullProgress = (totalCurrentBytes / totalExpectedBytes) * 100;
		} else if (activeLayers > 0 && totalCurrentBytes > 0) {
			pullProgress = 5;
		} else if (Object.keys(layerProgress).length > 0 && activeLayers === 0) {
			const allDone = Object.values(layerProgress).every((l) => l.status && (l.status.toLowerCase().includes('pull complete') || l.status.toLowerCase().includes('already exists')));
			if (allDone) pullProgress = 100;
		}
	}

	async function handleSubmit() {
		const data = form.validate();
		if (!data) return;

		resetState();
		isPulling = true;
		pullStatusText = 'Initiating pull...';

		let imageName = data.imageRef.trim();
		let imageTag = data.tag?.trim() || 'latest';

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
				const errorData = await response.json().catch(() => ({
					error: 'Failed to pull image. Server returned an error.'
				}));
				const errorMessage = typeof errorData.error === 'string' ? errorData.error : errorData.message || `HTTP error ${response.status}`;
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
							pullError = typeof data.error === 'string' ? data.error : data.error.message || 'An error occurred during pull.';
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
				const allLayersCompleteOrExisting = Object.values(layerProgress).every((l) => l.status && (l.status.toLowerCase().includes('complete') || l.status.toLowerCase().includes('already exists') || l.status.toLowerCase().includes('downloaded newer image')));
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

			// Reset form and close sheet
			$inputs.imageRef.value = '';
			$inputs.tag.value = 'latest';
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

	function handleOpenChange(newOpenState: boolean) {
		if (!newOpenState && isPulling) {
			toast.info('Pull operation is in progress.');
			open = true; // Keep it open
			return;
		}

		open = newOpenState;
		if (!newOpenState && !isPulling) {
			resetState();
			$inputs.imageRef.value = '';
			$inputs.tag.value = 'latest';
		}
	}
</script>

<Sheet.Root bind:open onOpenChange={handleOpenChange}>
	<Sheet.Content class="p-6">
		<Sheet.Header class="space-y-3 pb-6 border-b">
			<div class="flex items-center gap-3">
				<div class="flex size-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
					<Download class="size-5 text-primary" />
				</div>
				<div>
					<Sheet.Title class="text-xl font-semibold">Pull Docker Image</Sheet.Title>
					<Sheet.Description class="text-sm text-muted-foreground mt-1">
						Enter the image reference you want to pull from a registry.
						{#if pullError}
							<p class="text-destructive mt-2 text-sm">{pullError}</p>
						{/if}
					</Sheet.Description>
				</div>
			</div>
		</Sheet.Header>

		<form onsubmit={preventDefault(handleSubmit)} class="grid gap-4 py-4">
			<FormInput label="Image Name *" type="text" placeholder="nginx, redis, ubuntu, etc." description="Enter the image name from Docker Hub or other registries" disabled={isPulling} bind:input={$inputs.imageRef} />
			<FormInput label="Tag" type="text" placeholder="latest" description="Specify a tag version (defaults to 'latest')" disabled={isPulling} bind:input={$inputs.tag} />

			{#if isPulling || pullStatusText}
				<div class="mt-4">
					{#if isPulling}
						<div class="mb-1 flex justify-between text-xs">
							<span>{pullStatusText || 'Pulling image...'}</span>
							<span>{Math.round(pullProgress)}%</span>
						</div>
						<div class="bg-secondary h-2 w-full overflow-hidden rounded-full">
							<div class="bg-primary h-full transition-all duration-150 ease-linear" style="width: {pullProgress}%"></div>
						</div>
					{:else if pullStatusText && !pullError}
						<p class="mt-1 text-xs text-green-600">{pullStatusText}</p>
					{/if}
					{#if isPulling}
						<p class="text-muted-foreground mt-1 text-xs">This may take a while depending on the image size and your internet connection.</p>
					{/if}
				</div>
			{/if}

			<Sheet.Footer class="flex flex-row gap-2">
				<Button type="button" class="arcane-button-cancel flex-1" variant="outline" onclick={() => (open = false)} disabled={isPulling}>Cancel</Button>
				<Button type="submit" class="arcane-button-create flex-1" disabled={isPulling}>
					{#if isPulling}
						<Loader2 class="mr-2 size-4 animate-spin" />
						<span class="opacity-0">Pull Image</span>
					{:else}
						<Download class="mr-2 size-4" />
						Pull Image
					{/if}
				</Button>
			</Sheet.Footer>
		</form>
	</Sheet.Content>
</Sheet.Root>
