<script lang="ts" generics="TData">
	import Settings2Icon from '@lucide/svelte/icons/settings-2';
	import type { Table } from '@tanstack/table-core';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { m } from '$lib/paraglide/messages';

	let {
		table,
		fields,
		onToggleField
	}: {
		table?: Table<TData>;
		fields?: { id: string; label: string; visible: boolean }[];
		onToggleField?: (fieldId: string) => void;
	} = $props();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		class={buttonVariants({
			variant: 'outline',
			size: 'sm',
			class: 'h-8'
		})}
	>
		<Settings2Icon />
		{m.common_view()}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end">
		<DropdownMenu.Group>
			<DropdownMenu.Label>{m.common_toggle_columns()}</DropdownMenu.Label>
			<DropdownMenu.Separator />

			{#if table}
				{#each table
					.getAllColumns()
					.filter((col) => typeof col.accessorFn !== 'undefined' && col.getCanHide()) as column (column)}
					<DropdownMenu.CheckboxItem
						bind:checked={() => column.getIsVisible(), (v) => column.toggleVisibility(!!v)}
						class="capitalize"
					>
						{column.id}
					</DropdownMenu.CheckboxItem>
				{/each}
			{:else if fields && onToggleField}
				{#each fields as field (field.id)}
					<DropdownMenu.CheckboxItem bind:checked={() => field.visible, (v) => onToggleField(field.id)} class="capitalize">
						{field.label}
					</DropdownMenu.CheckboxItem>
				{/each}
			{/if}
		</DropdownMenu.Group>
	</DropdownMenu.Content>
</DropdownMenu.Root>
