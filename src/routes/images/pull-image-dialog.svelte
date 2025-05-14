<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Loader2 } from '@lucide/svelte';
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import * as Select from '$lib/components/ui/select/index.js';

	function preventDefault(handler: (event: SubmitEvent) => void) {
		return (event: SubmitEvent) => {
			event.preventDefault();
			handler(event);
		};
	}

	export function onClose() {
		open = false;
	}

	interface Props {
		open?: boolean;
		isPulling?: boolean;
		pullProgress?: number;
		onSubmit?: (data: { imageRef: string; tag?: string; platform?: string; registryUrl?: string }) => void;
	}

	let { open = $bindable(false), isPulling = false, pullProgress = 0, onSubmit = (data) => console.log('Pull submitted:', data) }: Props = $props();

	let imageRef = $state('');
	let tag = $state('latest');
	let platform = $state('');
	let selectedRegistryUrl = $state('');

	// Available platforms
	const platforms = [
		{ label: 'Default', value: '' },
		{ label: 'linux/amd64', value: 'linux/amd64' },
		{ label: 'linux/arm64', value: 'linux/arm64' },
		{ label: 'linux/arm/v7', value: 'linux/arm/v7' },
		{ label: 'windows/amd64', value: 'windows/amd64' }
	];

	function handleSubmit() {
		if (!imageRef.trim()) return;

		let imageName = imageRef.trim();
		let imageTag = tag.trim();

		if (imageName.includes(':')) {
			const parts = imageName.split(':');
			imageName = parts[0];
			if (parts.length > 1 && parts[1].trim() !== '') {
				imageTag = parts[1].trim();
			}
		}
		if (!imageTag) {
			imageTag = 'latest';
		}

		onSubmit({
			imageRef: imageName,
			tag: imageTag,
			platform: platform || undefined,
			registryUrl: selectedRegistryUrl || undefined
		});
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[500px]">
		<Dialog.Header data-testid="pull-docker-image-header">
			<Dialog.Title data-testid="pull-docker-image-header">Pull Docker Image</Dialog.Title>
			<Dialog.Description>Enter the image reference you want to pull from a registry.</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={preventDefault(handleSubmit)} class="grid gap-4 py-4">
			<!-- Basic image settings -->
			<div class="flex flex-col gap-2">
				<Label for="image-ref">Image</Label>
				<div class="flex items-center gap-2">
					<div class="flex-1">
						<Input id="image-ref" bind:value={imageRef} placeholder="e.g., nginx or myregistry.com/ubuntu" required disabled={isPulling} />
					</div>
					<div class="flex items-center">
						<span class="text-lg font-medium text-muted-foreground">:</span>
					</div>
					<div class="w-1/3">
						<Input id="image-tag" bind:value={tag} placeholder="latest" disabled={isPulling} />
					</div>
				</div>
			</div>

			<!-- Advanced settings -->
			<Accordion.Root type="single" class="w-full">
				<Accordion.Item value="advanced">
					<Accordion.Trigger>Advanced Settings</Accordion.Trigger>
					<Accordion.Content>
						<div class="grid gap-4 pt-2">
							<div class="flex flex-col gap-2">
								<Label for="platform">Platform</Label>
								<Select.Root type="single" bind:value={platform} disabled={isPulling}>
									<Select.Trigger class="w-full" id="platform">
										<span>
											{platforms.find((p) => p.value === platform)?.label || 'Select platform'}
										</span>
									</Select.Trigger>
									<Select.Content>
										{#each platforms as platformOption}
											<Select.Item value={platformOption.value}>
												{platformOption.label}
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
								<p class="text-xs text-muted-foreground mt-1">Specifies architecture/OS for multi-arch images. Default uses your system's platform.</p>
							</div>
						</div>
					</Accordion.Content>
				</Accordion.Item>
			</Accordion.Root>
		</form>

		{#if isPulling}
			<div class="mt-4">
				<div class="flex justify-between text-xs mb-1">
					<span>Pulling image...</span>
					<span>{Math.round(pullProgress)}%</span>
				</div>
				<div class="w-full bg-secondary rounded-full overflow-hidden size-2">
					<div class="bg-primary h-full transition-all duration-300 ease-in-out" style="width: {pullProgress}%"></div>
				</div>
				<p class="text-xs text-muted-foreground mt-1">This may take a while depending on the image size and your internet connection.</p>
			</div>
		{/if}

		<Dialog.Footer>
			<Button variant="outline" onclick={onClose} disabled={isPulling}>Cancel</Button>
			<Button type="submit" onclick={handleSubmit} disabled={isPulling || !imageRef.trim()} class="relative">
				{#if isPulling}
					<div class="absolute inset-0 flex items-center justify-center">
						<svg class="absolute w-full h-full" viewBox="0 0 100 100">
							<circle class="text-primary-400/20" cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="8" />
							<circle class="text-primary-500" cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-dasharray={283} stroke-dashoffset={283 * (1 - pullProgress / 100)} transform="rotate(-90 50 50)" />
						</svg>
						<Loader2 class="animate-spin size-4" />
					</div>
					<span class="opacity-0">Pull Image</span>
				{:else}
					Pull Image
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
