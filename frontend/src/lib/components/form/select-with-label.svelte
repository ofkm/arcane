<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select/index.js';

	let {
		id,
		value = $bindable(),
		label,
		description,
		disabled = false,
		placeholder = 'Select an option',
		options = [],
		onValueChange
	}: {
		id: string;
		value: string;
		label: string;
		description?: string;
		disabled?: boolean;
		placeholder?: string;
		options: { label: string; value: string }[];
		onValueChange?: (value: string) => void;
	} = $props();
</script>

<div class="grid gap-2">
	<Label for={id} class="text-sm font-medium leading-none">
		{label}
	</Label>
	<Select.Root type="single" bind:value {disabled} onValueChange={(v) => onValueChange && onValueChange(v)}>
		<Select.Trigger class="w-full" {id}>
			<span>{options.find((option) => option.value === value)?.label || placeholder}</span>
		</Select.Trigger>
		<Select.Content>
			{#each options as option (option.value)}
				<Select.Item value={option.value}>
					{option.label}
				</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>
	{#if description}
		<p class="text-muted-foreground text-[0.8rem]">
			{description}
		</p>
	{/if}
</div>
