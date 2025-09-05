<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select/index.js';

	let {
		id,
		name,
		value = $bindable<string>(),
		label,
		description,
		disabled = false,
		placeholder = 'Select an option',
		options = [],
		groupLabel,
		onValueChange
	}: {
		id: string;
		name?: string;
		value: string;
		label: string;
		description?: string;
		disabled?: boolean;
		placeholder?: string;
		options: { label: string; value: string; description?: string }[];
		groupLabel?: string;
		onValueChange?: (value: string) => void;
	} = $props();

	const selectedLabel = $derived(options.find((o) => o.value === value)?.label ?? placeholder);
</script>

<div class="grid gap-2">
	<Label for={id} class="text-sm font-medium leading-none">
		{label}
	</Label>

	<Select.Root type="single" bind:value {name} {disabled} onValueChange={(v) => onValueChange?.(v)}>
		<Select.Trigger class="w-full" {id}>
			<span>{selectedLabel}</span>
		</Select.Trigger>

		<Select.Content>
			{#if groupLabel}
				<Select.Group>
					<Select.Label>{groupLabel}</Select.Label>
					{#each options as option (option.value)}
						<Select.Item value={option.value}>
							<div class="flex flex-col items-start gap-1">
								<span class="font-medium">{option.label}</span>
								{#if option.description}
									<span class="text-muted-foreground text-xs">{option.description}</span>
								{/if}
							</div>
						</Select.Item>
					{/each}
				</Select.Group>
			{:else}
				{#each options as option (option.value)}
					<Select.Item value={option.value}>
						{option.label}
					</Select.Item>
				{/each}
			{/if}
		</Select.Content>
	</Select.Root>

	{#if description}
		<p class="text-muted-foreground text-[0.8rem]">{description}</p>
	{/if}
</div>
