<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ArrowLeft, AlertCircle, RefreshCw, HardDrive, Clock, Tag, Layers, Trash2, Loader2, Database, Globe, Info } from '@lucide/svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { formatDate } from '$lib/utils/string.utils';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let { volume, inUse } = $derived(data);

	let isRefreshing = $state(false);
	let isRemoving = $state(false);
	let showRemoveConfirm = $state(false);
	let forceRemove = $state(false);
	const createdDate = $derived(volume?.CreatedAt ? formatDate(volume.CreatedAt) : 'N/A');

	async function refreshData() {
		isRefreshing = true;
		await invalidateAll();
		setTimeout(() => {
			isRefreshing = false;
		}, 500);
	}

	function triggerRemove() {
		forceRemove = false;
		showRemoveConfirm = true;
	}
</script>

<div class="space-y-6 pb-8">
	<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
		<div>
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/volumes">Volumes</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Page>{volume?.Name || 'Details'}</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
			<div class="mt-2 flex items-center gap-2">
				<h1 class="text-2xl font-bold tracking-tight break-all">
					{volume?.Name || 'Volume Details'}
				</h1>
				{#if inUse}
					<Badge variant="outline"><Info class="mr-1 size-3" /> In Use</Badge>
				{/if}
			</div>
		</div>

		<div class="flex gap-2 flex-wrap">
			<Button variant="outline" size="sm" onclick={refreshData} disabled={isRefreshing}>
				<RefreshCw class={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
			</Button>
			<Button variant="destructive" size="sm" onclick={triggerRemove} disabled={isRemoving}>
				{#if isRemoving}
					<Loader2 class="mr-2 animate-spin size-4" />
				{:else}
					<Trash2 class="mr-2 size-4" />
				{/if} Remove
			</Button>
			<form
				id="remove-volume-form"
				method="POST"
				action="?/remove"
				use:enhance={() => {
					isRemoving = true;
					return async ({ update }) => {
						await update({ reset: false });
					};
				}}
				class="hidden"
			>
				<input type="hidden" name="volumeName" value={volume?.Name} />
				<button type="submit">Submit</button>
			</form>
		</div>
	</div>

	{#if form?.error}
		<Alert.Root variant="destructive">
			<AlertCircle class="mr-2 size-4" />
			<Alert.Title>Action Failed</Alert.Title>
			<Alert.Description>{form.error}</Alert.Description>
		</Alert.Root>
	{/if}

	{#if volume}
		<div class="space-y-6">
			<Card.Root class="border shadow-sm">
				<Card.Header>
					<Card.Title>Volume Details</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
						<div class="flex items-start gap-3">
							<div class="bg-gray-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">
								<Database class="text-gray-500 size-5" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Name</p>
								<p class="text-base font-semibold mt-1 break-all">{volume.Name}</p>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div class="bg-blue-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">
								<HardDrive class="text-blue-500 size-5" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Driver</p>
								<p class="text-base font-semibold mt-1">{volume.Driver}</p>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div class="bg-green-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">
								<Clock class="text-green-500 size-5" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Created</p>
								<p class="text-base font-semibold mt-1">{createdDate}</p>
							</div>
						</div>

						<div class="flex items-start gap-3">
							<div class="bg-purple-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">
								<Globe class="text-purple-500 size-5" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Scope</p>
								<p class="text-base font-semibold mt-1 capitalize">{volume.Scope}</p>
							</div>
						</div>

						<div class="flex items-start gap-3 col-span-1 sm:col-span-2">
							<div class="bg-teal-500/10 p-2 rounded-full flex items-center justify-center shrink-0 size-10">
								<Layers class="text-teal-500 size-5" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">Mountpoint</p>
								<p class="text-sm font-mono mt-1 break-all">{volume.Mountpoint}</p>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			{#if volume.Labels && Object.keys(volume.Labels).length > 0}
				<Card.Root class="border shadow-sm">
					<Card.Header>
						<Card.Title class="flex items-center gap-2"><Tag class="text-muted-foreground size-5" /> Labels</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-2">
						{#each Object.entries(volume.Labels) as [key, value] (key)}
							<div class="text-sm flex flex-col sm:flex-row sm:items-center">
								<span class="font-medium text-muted-foreground w-full sm:w-1/4 break-all">{key}:</span>
								<span class="font-mono text-xs sm:text-sm break-all w-full sm:w-3/4">{value}</span>
							</div>
							{#if !Object.is(Object.keys(volume.Labels).length - 1, Object.keys(volume.Labels).indexOf(key))}
								<Separator class="my-2" />
							{/if}
						{/each}
					</Card.Content>
				</Card.Root>
			{/if}

			{#if volume.Options && Object.keys(volume.Options).length > 0}
				<Card.Root class="border shadow-sm">
					<Card.Header>
						<Card.Title>Driver Options</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-2">
						{#each Object.entries(volume.Options) as [key, value] (key)}
							<div class="text-sm flex flex-col sm:flex-row sm:items-center">
								<span class="font-medium text-muted-foreground w-full sm:w-1/4 break-all">{key}:</span>
								<span class="font-mono text-xs sm:text-sm break-all w-full sm:w-3/4">{value}</span>
							</div>
							{#if !Object.is(Object.keys(volume.Options).length - 1, Object.keys(volume.Options).indexOf(key))}
								<Separator class="my-2" />
							{/if}
						{/each}
					</Card.Content>
				</Card.Root>
			{/if}
		</div>
	{:else}
		<div class="text-center py-12">
			<p class="text-lg font-medium text-muted-foreground">Volume not found.</p>
			<Button href="/volumes" variant="outline" size="sm" class="mt-4">
				<ArrowLeft class="mr-2 size-4" /> Back to Volumes
			</Button>
		</div>
	{/if}
</div>
