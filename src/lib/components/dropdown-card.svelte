<script lang="ts">
	import { cn } from '$lib/utils';
	import { LucideChevronDown, type Icon as IconType } from '@lucide/svelte';
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

<Card.Root>
	<Card.Header class="cursor-pointer p-5" onclick={toggleExpanded}>
		<div class="flex items-center justify-between">
			<div>
				<Card.Title class="flex items-center gap-2 text-xl font-semibold mb-2">
					{#if icon}{@const Icon = icon}
						<Icon class="text-primary/80 size-5" />
					{/if}
					{title}
				</Card.Title>
				{#if description}
					<Card.Description class="mt-1">{description}</Card.Description>
				{/if}
			</div>
			<Button class="ml-10 h-8 p-3" variant="ghost" aria-label="Expand Card">
				<LucideChevronDown class={cn('size-5 transition-transform duration-200', expanded && 'rotate-180 transform')} />
			</Button>
		</div>
	</Card.Header>
	{#if expanded}
		<div transition:slide={{ duration: 200 }}>
			<Card.Content class="bg-muted/20 pt-5">
				{@render children()}
			</Card.Content>
		</div>
	{/if}
</Card.Root>
