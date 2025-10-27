<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Drawer from '$lib/components/ui/drawer/index.js';
	import type { ResponsiveDialogProps } from './responsive-dialog.type.js';

	let {
		open = $bindable(false),
		onOpenChange,
		trigger,
		title,
		description,
		children,
		footer,
		class: className,
		contentClass
	}: ResponsiveDialogProps = $props();

	const isDesktop = new MediaQuery('(min-width: 768px)');

	function handleOpenChange(newOpen: boolean) {
		open = newOpen;
		onOpenChange?.(newOpen);
	}
</script>

{#if isDesktop.current}
	<Dialog.Root bind:open onOpenChange={handleOpenChange}>
		{#if trigger}
			<Dialog.Trigger>
				{@render trigger()}
			</Dialog.Trigger>
		{/if}
		<Dialog.Content class={contentClass ?? 'sm:max-w-[425px]'}>
			{#if title || description}
				<Dialog.Header>
					{#if title}
						<Dialog.Title>{title}</Dialog.Title>
					{/if}
					{#if description}
						<Dialog.Description>{description}</Dialog.Description>
					{/if}
				</Dialog.Header>
			{/if}
			<div class={className ?? ''}>
				{@render children()}
			</div>
			{#if footer}
				<Dialog.Footer>
					{@render footer()}
				</Dialog.Footer>
			{/if}
		</Dialog.Content>
	</Dialog.Root>
{:else}
	<Drawer.Root bind:open onOpenChange={handleOpenChange}>
		{#if trigger}
			<Drawer.Trigger>
				{@render trigger()}
			</Drawer.Trigger>
		{/if}
		<Drawer.Content>
			{#if title || description}
				<Drawer.Header class="text-left">
					{#if title}
						<Drawer.Title>{title}</Drawer.Title>
					{/if}
					{#if description}
						<Drawer.Description>{description}</Drawer.Description>
					{/if}
				</Drawer.Header>
			{/if}
			<div class={className ?? 'px-4 pb-4'}>
				{@render children()}
			</div>
			{#if footer}
				<Drawer.Footer class="pt-2">
					{@render footer()}
				</Drawer.Footer>
			{/if}
		</Drawer.Content>
	</Drawer.Root>
{/if}

<style>
	:global(html:has([data-slot='dialog-overlay'][data-state='open'])),
	:global(body:has([data-slot='dialog-overlay'][data-state='open'])) {
		overflow: hidden !important;
	}

	:global(html:has([data-vaul-drawer])),
	:global(body:has([data-vaul-drawer])) {
		overflow: hidden !important;
	}
</style>
