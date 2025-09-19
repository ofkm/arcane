<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';

	let {
		id,
		name,
		value = $bindable(''),
		label,
		placeholder = '',
		description,
		helpText,
		disabled = false,
		type = 'text',
		autocomplete = 'off',
		required = false,
		onChange
	}: {
		id?: string;
		name?: string;
		value: string | number;
		label: string;
		placeholder?: string;
		description?: string;
		helpText?: string;
		disabled?: boolean;
		type?: 'text' | 'email' | 'password' | 'number' | 'url';
		autocomplete?: HTMLInputElement['autocomplete'];
		required?: boolean;
		onChange?: (value: string) => void;
	} = $props();

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		value = target.value;
		onChange?.(value);
	}
</script>

<div class="grid gap-2">
	<Label for={id} class="text-sm font-medium leading-none">
		{label}{#if required}<span class="text-destructive ml-0.5">*</span>{/if}
	</Label>

	<Input {id} {name} bind:value {placeholder} {disabled} {type} {autocomplete} {required} oninput={handleInput} />

	{#if description}
		<p class="text-muted-foreground text-[0.8rem]">{description}</p>
	{/if}
	{#if helpText}
		<p class="text-muted-foreground text-[0.7rem]">{helpText}</p>
	{/if}
</div>
