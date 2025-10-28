<script lang="ts">
	import { cn } from '$lib/utils';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import type { Icon as IconType } from '@lucide/svelte';
	import { onMount, type Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	import { Button } from './ui/button';
	import * as Card from './ui/card';

	let {
		id,
		title,
		description,
		defaultExpanded = false,
		icon,
		children
	}: {
		id: string;
		title: string;
		description?: string;
		defaultExpanded?: boolean;
		icon?: typeof IconType;
		children: Snippet;
	} = $props();

	let expanded = $state(defaultExpanded);

	function loadExpandedState() {
		const state = JSON.parse(localStorage.getItem('collapsible-cards-expanded') || '{}');
		expanded = state[id] || false;
	}

	function saveExpandedState() {
		const state = JSON.parse(localStorage.getItem('collapsible-cards-expanded') || '{}');
		state[id] = expanded;
		localStorage.setItem('collapsible-cards-expanded', JSON.stringify(state));
	}

	function toggleExpanded() {
		expanded = !expanded;
		saveExpandedState();
	}

	onMount(() => {
		if (defaultExpanded) {
			saveExpandedState();
		}
		loadExpandedState();
	});
</script>

<Card.Root class="flex flex-col">
	<Card.Header
		class="cursor-pointer py-6"
		onclick={toggleExpanded}
		{icon}
	>
		<div class="flex items-center justify-between w-full">
			<div>
				<Card.Title>{title}</Card.Title>
				{#if description}
					<Card.Description>{description}</Card.Description>
				{/if}
			</div>
			<Button class="ml-4 h-8 p-2" variant="ghost" aria-label="Expand Card">
				<ChevronDownIcon class={cn('size-5 transition-transform duration-200', expanded && 'rotate-180 transform')} />
			</Button>
		</div>
	</Card.Header>
	{#if expanded}
		<div transition:slide={{ duration: 200 }}>
			<Card.Content class="bg-muted/20 px-6 pt-5">
				{@render children()}
			</Card.Content>
		</div>
	{/if}
</Card.Root>
