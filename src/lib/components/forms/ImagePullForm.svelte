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

	async function handlePull() {
		if (!imageRef.trim()) {
			toast.error('Please enter an image name');
			return;
		}

		pulling = true;
		try {
			// Combine image name and tag
			const fullImageName = tag && tag !== 'latest' ? `${imageRef.trim()}:${tag.trim()}` : imageRef.trim().includes(':') ? imageRef.trim() : `${imageRef.trim()}:latest`;

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
		<p class="text-xs text-muted-foreground">Enter the image name (e.g., nginx, redis, ubuntu)</p>
	</div>

	<div class="space-y-2">
		<Label for="tag">Tag (Optional)</Label>
		<Input id="tag" bind:value={tag} placeholder="latest" disabled={pulling} onkeypress={handleKeyPress} />
		<p class="text-xs text-muted-foreground">Specify a tag version (defaults to 'latest')</p>
	</div>

	<div class="flex justify-end space-x-2">
		<Button variant="outline" onclick={onClose} disabled={pulling}>Cancel</Button>
		<Button onclick={handlePull} disabled={pulling || !imageRef.trim()}>
			{#if pulling}
				<Loader2 class="size-4 mr-2 animate-spin" />
			{/if}
			Pull Image
		</Button>
	</div>
</div>
