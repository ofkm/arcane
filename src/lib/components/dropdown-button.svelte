<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { ChevronDown, Loader2 } from '@lucide/svelte';

	interface DropdownOption {
		id: string;
		label: string;
		disabled?: boolean;
	}

	interface Props {
		buttonText: string;
		icon?: any;
		options: DropdownOption[];
		selectedId?: string;
		disabled?: boolean;
		loading?: boolean;
		onButtonClick?: () => void;
		onOptionSelect?: (option: DropdownOption) => void;
		buttonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
		size?: 'sm' | 'default' | 'lg';
	}

	let { buttonText, icon, options = [], selectedId, disabled = false, loading = false, onButtonClick, onOptionSelect, buttonVariant = 'default', size = 'default' }: Props = $props();

	let isOpen = $state(false);

	function handleButtonClick() {
		if (onButtonClick && !disabled && !loading) {
			onButtonClick();
		}
	}

	function handleOptionSelect(option: DropdownOption) {
		if (onOptionSelect && !option.disabled) {
			onOptionSelect(option);
			isOpen = false;
		}
	}
</script>

<div class="flex">
	<!-- Main Button -->
	<Button variant={buttonVariant} {size} {disabled} onclick={handleButtonClick} class="rounded-r-none border-r-0">
		{#if loading}
			<Loader2 class="size-4 mr-2 animate-spin" />
		{:else if icon}
			{@render icon({ class: 'size-4 mr-2' })}
		{/if}
		{buttonText}
	</Button>

	<!-- Dropdown Button -->
	<DropdownMenu.Root bind:open={isOpen}>
		<DropdownMenu.Trigger>
			<Button variant={buttonVariant} {size} {disabled} class="rounded-l-none px-2 border-l border-l-background/20">
				<ChevronDown class="size-4" />
			</Button>
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end" class="min-w-[200px]">
			{#if options.length === 0}
				<DropdownMenu.Item disabled>No agents available</DropdownMenu.Item>
			{:else}
				{#each options as option}
					<DropdownMenu.Item disabled={option.disabled} onclick={() => handleOptionSelect(option)} class={selectedId === option.id ? 'bg-accent' : ''}>
						{option.label}
					</DropdownMenu.Item>
				{/each}
			{/if}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>
