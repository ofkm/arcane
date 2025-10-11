<script lang="ts">
	import ArcaneTable from '$lib/components/arcane-table/arcane-table.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import ScanSearchIcon from '@lucide/svelte/icons/scan-search';
	import FolderOpenIcon from '@lucide/svelte/icons/folder-open';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import PlusCircleIcon from '@lucide/svelte/icons/plus-circle';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { openConfirmDialog } from '$lib/components/confirm-dialog';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';
	import UniversalMobileCard from '$lib/components/arcane-table/cards/universal-mobile-card.svelte';
	import type { Paginated, SearchPaginationSortRequest } from '$lib/types/pagination.type';
	import type { Template } from '$lib/types/template.type';
	import type { ColumnSpec } from '$lib/components/arcane-table';
	import { m } from '$lib/paraglide/messages';
	import { templateService } from '$lib/services/template-service';
	import TagIcon from '@lucide/svelte/icons/tag';
	import { truncateString } from '$lib/utils/string.utils';

	let {
		templates = $bindable(),
		selectedIds = $bindable(),
		requestOptions = $bindable()
	}: {
		templates: Paginated<Template>;
		selectedIds: string[];
		requestOptions: SearchPaginationSortRequest;
	} = $props();

	let isLoading = $state({
		deleting: false,
		downloading: false
	});

	async function handleDeleteTemplate(id: string, name: string) {
		openConfirmDialog({
			title: m.templates_delete_confirm_title(),
			message: m.templates_delete_confirm_message({ name }),
			confirm: {
				label: m.templates_delete_template(),
				destructive: true,
				action: async () => {
					isLoading.deleting = true;

					const result = await tryCatch(templateService.deleteTemplate(id));
					handleApiResultWithCallbacks({
						result,
						message: m.templates_delete_failed(),
						setLoadingState: (value) => (isLoading.deleting = value),
						onSuccess: async () => {
							toast.success(m.templates_delete_success());
							templates = await templateService.getTemplates(requestOptions);
						}
					});
				}
			}
		});
	}

	async function handleDownloadTemplate(id: string, name: string) {
		isLoading.downloading = true;

		const result = await tryCatch(templateService.download(id));
		handleApiResultWithCallbacks({
			result,
			message: m.templates_download_failed(),
			setLoadingState: (value) => (isLoading.downloading = value),
			onSuccess: async () => {
				toast.success(m.templates_downloaded_success({ name }));
				templates = await templateService.getTemplates(requestOptions);
			}
		});
	}

	const isAnyLoading = $derived(Object.values(isLoading).some((loading) => loading));

	const columns = [
		{
			accessorKey: 'name',
			title: m.common_name(),
			sortable: true,
			cell: NameCell
		},
		{
			accessorKey: 'description',
			title: m.common_description(),
			cell: DescriptionCell
		},
		{
			id: 'type',
			accessorFn: (row) => row.isRemote,
			title: m.templates_type(),
			sortable: true,
			cell: TypeCell
		},
		{
			accessorKey: 'metadata',
			title: m.templates_tags(),
			cell: TagsCell
		}
	] satisfies ColumnSpec<Template>[];

	const mobileFields = [
		{ id: 'description', label: m.common_description(), defaultVisible: true },
		{ id: 'type', label: m.templates_type(), defaultVisible: true },
		{ id: 'tags', label: m.templates_tags(), defaultVisible: true }
	];

	let mobileFieldVisibility = $state<Record<string, boolean>>({});
	let customSettings = $state<Record<string, unknown>>({});
</script>

{#snippet NameCell({ item }: { item: Template })}
	<a class="font-medium hover:underline" href="/customize/templates/{item.id}">
		{item.name}
	</a>
{/snippet}

{#snippet DescriptionCell({ item }: { item: Template })}
	<span class="text-muted-foreground line-clamp-2 text-sm">
		{truncateString(item.description, 80)}
	</span>
{/snippet}

{#snippet TypeCell({ item }: { item: Template })}
	{#if item.isRemote}
		<Badge variant="secondary" class="gap-1">
			<GlobeIcon class="size-3" />
			{m.templates_remote()}
		</Badge>
	{:else}
		<Badge variant="secondary" class="gap-1">
			<FolderOpenIcon class="size-3" />
			{m.templates_local()}
		</Badge>
	{/if}
{/snippet}

{#snippet TagsCell({ item }: { item: Template })}
	{#if item.metadata?.tags}
		{@const tagsStr = item.metadata.tags}
		{@const tagsArray =
			typeof tagsStr === 'string'
				? tagsStr
						.split(',')
						.map((t) => t.trim())
						.filter(Boolean)
				: []}
		{#if tagsArray.length > 0}
			<div class="flex flex-wrap gap-1">
				{#each tagsArray.slice(0, 3) as tag}
					<Badge variant="outline" class="text-xs">{tag}</Badge>
				{/each}
				{#if tagsArray.length > 3}
					<Badge variant="outline" class="text-xs">+{tagsArray.length - 3}</Badge>
				{/if}
			</div>
		{/if}
	{/if}
{/snippet}

{#snippet TemplateMobileCardSnippet({
	row,
	item,
	mobileFieldVisibility
}: {
	row: any;
	item: Template;
	mobileFieldVisibility: Record<string, boolean>;
})}
	<UniversalMobileCard
		{item}
		icon={(item) => ({
			component: item.isRemote ? GlobeIcon : FolderOpenIcon,
			variant: item.isRemote ? 'emerald' : 'blue'
		})}
		title={(item) => item.name}
		subtitle={(item) => ((mobileFieldVisibility.description ?? true) ? item.description : null)}
		badges={[
			(item) =>
				(mobileFieldVisibility.type ?? true)
					? {
							variant: item.isRemote ? 'green' : 'blue',
							text: item.isRemote ? m.templates_remote() : m.templates_local()
						}
					: null
		]}
		fields={[]}
		rowActions={RowActions}
		onclick={(item: Template) => goto(`/customize/templates/${item.id}`)}
	>
		{#snippet children()}
			{#if (mobileFieldVisibility.tags ?? true) && item.metadata?.tags}
				{@const tagsStr = item.metadata.tags}
				{@const tagsArray =
					typeof tagsStr === 'string'
						? tagsStr
								.split(',')
								.map((t) => t.trim())
								.filter(Boolean)
						: []}
				{#if tagsArray.length > 0}
					<div class="flex items-start gap-2.5 border-t pt-3">
						<div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
							<TagIcon class="size-3.5 text-purple-500" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
								{m.templates_tags()}
							</div>
							<div class="mt-1 flex flex-wrap gap-1">
								{#each tagsArray.slice(0, 3) as tag}
									<Badge variant="outline" class="text-xs">{tag}</Badge>
								{/each}
								{#if tagsArray.length > 3}
									<Badge variant="outline" class="text-xs">+{tagsArray.length - 3}</Badge>
								{/if}
							</div>
						</div>
					</div>
				{/if}
			{/if}
		{/snippet}
	</UniversalMobileCard>
{/snippet}

{#snippet RowActions({ item }: { item: Template })}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="ghost" size="icon" class="relative size-8 p-0">
					<span class="sr-only">{m.common_open_menu()}</span>
					<EllipsisIcon />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end">
			<DropdownMenu.Group>
				<DropdownMenu.Item onclick={() => goto(`/customize/templates/${item.id}`)} disabled={isAnyLoading}>
					<ScanSearchIcon class="size-4" />
					{m.templates_view_details()}
				</DropdownMenu.Item>

				<DropdownMenu.Item onclick={() => goto(`/projects/new?templateId=${item.id}`)} disabled={isAnyLoading}>
					<PlusCircleIcon class="size-4" />
					{m.compose_create_project()}
				</DropdownMenu.Item>

				{#if item.isRemote}
					<DropdownMenu.Item
						onclick={() => handleDownloadTemplate(item.id, item.name)}
						disabled={isLoading.downloading || isAnyLoading}
					>
						{#if isLoading.downloading}
							<Spinner class="size-4" />
						{:else}
							<DownloadIcon class="size-4" />
						{/if}
						{m.templates_download()}
					</DropdownMenu.Item>
				{:else}
					<DropdownMenu.Separator />
					<DropdownMenu.Item
						variant="destructive"
						onclick={() => handleDeleteTemplate(item.id, item.name)}
						disabled={isLoading.deleting || isAnyLoading}
					>
						{#if isLoading.deleting}
							<Spinner class="size-4" />
						{:else}
							<Trash2Icon class="size-4" />
						{/if}
						{m.templates_delete_template()}
					</DropdownMenu.Item>
				{/if}
			</DropdownMenu.Group>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/snippet}

<Card.Root class="flex flex-col gap-6 py-3">
	<Card.Content class="px-6 py-5">
		<ArcaneTable
			persistKey="arcane-template-table"
			items={templates}
			bind:requestOptions
			bind:selectedIds
			bind:mobileFieldVisibility
			bind:customSettings
			onRefresh={async (options) => (templates = await templateService.getTemplates(options))}
			{columns}
			{mobileFields}
			rowActions={RowActions}
			mobileCard={TemplateMobileCardSnippet}
			selectionDisabled
		/>
	</Card.Content>
</Card.Root>
