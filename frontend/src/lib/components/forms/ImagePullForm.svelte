<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { toast } from 'svelte-sonner';
	import { Loader2 } from '@lucide/svelte';

	interface Props {
		agentId: string;
		onClose: () => void;
		onPull: (imageName: string) => Promise<void>;
	}

	let { agentId, onClose, onPull }: Props = $props();

	let pulling = $state(false);
	let imageRef = $state('');
	let tag = $state('latest');

	function buildFullImageName(imageRef: string, tag: string): string {
		const trimmedImageRef = imageRef.trim();
		const trimmedTag = tag.trim();

		// If the image already includes a tag (contains ':'), use it as-is
		if (trimmedImageRef.includes(':')) {
			return trimmedImageRef;
		}

		// If no tag specified or tag is 'latest', append ':latest'
		if (!trimmedTag || trimmedTag === 'latest') {
			return `${trimmedImageRef}:latest`;
		}

		// Otherwise, append the specified tag
		return `${trimmedImageRef}:${trimmedTag}`;
	}

	async function handlePull() {
		if (!imageRef.trim()) {
			toast.error('Please enter an image name');
			return;
		}

		pulling = true;
		try {
			const fullImageName = buildFullImageName(imageRef, tag);

			await onPull(fullImageName);
			onClose();
			toast.success(`Started pulling image: ${fullImageName}`);
		} catch (err) {
			console.error('Pull error:', err);
			toast.error(err instanceof Error ? err.message : 'Failed to pull image');
		} finally {
			pulling = false;
		}
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter' && !pulling) {
			handlePull();
		}
	}
</script>

<div class="space-y-4">
	<div class="space-y-2">
		<Label for="imageRef">Image Name</Label>
		<Input id="imageRef" bind:value={imageRef} placeholder="nginx, redis, ubuntu, etc." disabled={pulling} onkeypress={handleKeyPress} />
		<p class="text-muted-foreground text-xs">Enter the image name (e.g., nginx, redis, ubuntu)</p>
	</div>

	<div class="space-y-2">
		<Label for="tag">Tag (Optional)</Label>
		<Input id="tag" bind:value={tag} placeholder="latest" disabled={pulling} onkeypress={handleKeyPress} />
		<p class="text-muted-foreground text-xs">Specify a tag version (defaults to 'latest')</p>
	</div>

	<div class="flex justify-end space-x-2">
		<Button variant="outline" onclick={onClose} disabled={pulling}>Cancel</Button>
		<Button onclick={handlePull} disabled={pulling || !imageRef.trim()}>
			{#if pulling}
				<Loader2 class="mr-2 size-4 animate-spin" />
			{/if}
			Pull Image
		</Button>
	</div>
</div>
