<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { AlertTriangle } from '@lucide/svelte';

	type ButtonVariant = 'destructive' | 'link' | 'default' | 'outline' | 'secondary' | 'ghost';

	let { title = $bindable('Confirm Action'), description = $bindable('Are you sure you want to proceed?'), confirmLabel = $bindable('Confirm'), cancelLabel = $bindable('Cancel'), variant = $bindable<ButtonVariant>('destructive' as ButtonVariant), open = $bindable(false), onConfirm = $bindable(() => {}) } = $props();

	function handleConfirm() {
		onConfirm();
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<AlertTriangle class="h-5 w-5 text-destructive" />
				{title}
			</Dialog.Title>
			<Dialog.Description>
				{description}
			</Dialog.Description>
		</Dialog.Header>

		<Dialog.Footer>
			<div class="flex justify-end gap-2">
				<Button variant="outline" onclick={() => (open = false)}>
					{cancelLabel}
				</Button>
				<Button {variant} onclick={handleConfirm}>
					{confirmLabel}
				</Button>
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
