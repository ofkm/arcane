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

<Card.Root class="flex flex-col gap-6 py-3">
	<Card.Header
		class="@container/card-header grid cursor-pointer auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-2 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6"
		onclick={toggleExpanded}
	>
		<div class="flex items-center justify-between">
			<div>
				<Card.Title class="my-2 flex items-center">
					{#if icon}{@const Icon = icon}
						<Icon class="text-primary/80 size-6" />
					{/if}
					{title}
				</Card.Title>
				{#if description}
					<Card.Description class="mt-1">{description}</Card.Description>
				{/if}
			</div>
			<Button class="ml-10 h-8 p-3" variant="ghost" aria-label="Expand Card">
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
