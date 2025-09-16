<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import InfoIcon from '@lucide/svelte/icons/info';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import { tick } from 'svelte';
	import { m } from '$lib/paraglide/messages';

	let {
		value = $bindable(),
		ref = $bindable(),
		error,
		originalValue,
		canEdit = true,
		onCommit
	}: {
		value: string;
		ref: HTMLInputElement | null;
		error?: string;
		originalValue: string;
		canEdit?: boolean;
		onCommit?: () => void;
	} = $props();

	let isEditing = $state(false);

	async function beginEdit() {
		if (!canEdit) return;
		isEditing = true;
		await tick();
		ref?.focus();
	}
</script>

<div class="group flex items-center gap-1">
	{#if isEditing}
		<Input
			bind:ref
			bind:value
			class="h-8 max-w-[360px] px-2 text-lg font-semibold {error ? 'border-destructive' : ''}"
			autofocus
			onkeydown={(e) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					onCommit?.();
					isEditing = false;
				}
				if (e.key === 'Escape') {
					value = originalValue;
					isEditing = false;
				}
			}}
			onblur={() => {
				if (!isEditing) return;
				onCommit?.();
				isEditing = false;
			}}
			disabled={!canEdit}
		/>
	{:else}
		<h1 class="m-0 max-w-[360px]">
			<button
				type="button"
				class="w-full truncate bg-transparent px-0 py-0 text-left text-lg font-semibold leading-none"
				title={value}
				onclick={beginEdit}
				disabled={!canEdit}
			>
				{value}
			</button>
		</h1>
		{#if canEdit}
			<Button
				variant="ghost"
				size="icon"
				class="size-6 opacity-0 transition-opacity group-hover:opacity-100"
				aria-label="Edit name"
				title="Edit name"
				onclick={beginEdit}
			>
				<PencilIcon class="size-3.5" />
			</Button>
		{:else}
			<Tooltip.Root>
				<Tooltip.Trigger>
					<span class="text-muted-foreground inline-flex cursor-help items-center leading-none">
						<InfoIcon class="relative top-0.5 size-4 shrink-0" />
					</span>
				</Tooltip.Trigger>
				<Tooltip.Content>{m.compose_name_change_not_allowed()}</Tooltip.Content>
			</Tooltip.Root>
		{/if}
	{/if}
</div>

{#if isEditing && error}
	<p class="text-destructive mt-1 text-xs">{error}</p>
{/if}
