<!-- Originally From  https://github.com/pocket-id/pocket-id/blob/main/frontend/src/lib/components/form/form-input.svelte -->
<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { FormInput } from '$lib/types/form.type';

	let {
		input = $bindable(),
		label,
		description,
		helpText,
		warningText,
		placeholder,
		disabled = false,
		type = 'text',
		children,
		...restProps
	}: HTMLAttributes<HTMLDivElement> & {
		input?: FormInput<string | boolean | number | Date | undefined>;
		label?: string;
		description?: string;
		helpText?: string;
		warningText?: string;
		placeholder?: string;
		disabled?: boolean;
		type?: 'text' | 'password' | 'email' | 'number' | 'checkbox' | 'date';
		children?: Snippet;
	} = $props();

	const id = label?.toLowerCase().replace(/ /g, '-');
</script>

<div {...restProps}>
	{#if label}
		<Label class="mb-0" for={id}>{label}</Label>
	{/if}
	{#if description}
		<p class="text-muted-foreground mt-1 text-xs">{description}</p>
	{/if}
	<div class={label || description ? 'mt-2' : ''}>
		{#if children}
			{@render children()}
		{:else if input}
			<Input {id} {placeholder} {type} bind:value={input.value} {disabled} />
		{/if}
		{#if input?.error}
			<p class="mt-1 text-sm text-red-500">{input.error}</p>
		{/if}
		{#if helpText}
			<p class="mt-1 text-xs text-muted-foreground">{helpText}</p>
		{/if}
		{#if warningText}
			<p class="mt-1 text-xs font-bold text-destructive">{warningText}</p>
		{/if}
	</div>
</div>
