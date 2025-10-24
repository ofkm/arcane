<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import InfoIcon from '@lucide/svelte/icons/info';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import XCircleIcon from '@lucide/svelte/icons/x-circle';
	import UserIcon from '@lucide/svelte/icons/user';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import ServerIcon from '@lucide/svelte/icons/server';
	import TagIcon from '@lucide/svelte/icons/tag';
	import type { Event } from '$lib/types/event.type';
	import { UseClipboard } from '$lib/hooks/use-clipboard.svelte';
	import { m } from '$lib/paraglide/messages';

	type Severity = 'success' | 'warning' | 'error' | 'info';

	interface Props {
		open: boolean;
		event: Event | null;
	}

	let { open = $bindable(), event }: Props = $props();

	const clipboard = new UseClipboard();

	const hasMetadata = $derived(!!event?.metadata && Object.keys(event.metadata ?? {}).length > 0);
	const eventJson = $derived.by(() => JSON.stringify(event ?? {}, null, 2));
	const metadataJson = $derived.by(() => JSON.stringify(event?.metadata ?? {}, null, 2));
	const formattedTimestamp = $derived(event?.timestamp ? formatDate(event.timestamp) : null);
	const severity = $derived((event?.severity ?? 'info') as Severity);

	function formatDate(timestamp: string): string {
		try {
			return new Date(timestamp).toLocaleString();
		} catch {
			return timestamp;
		}
	}

	function getSeverityIconClass(sev: Severity): string {
		const baseClasses: Record<Severity, string> = {
			success: 'text-emerald-600 dark:text-emerald-400',
			warning: 'text-amber-600 dark:text-amber-400',
			error: 'text-red-600 dark:text-red-400',
			info: 'text-blue-600 dark:text-blue-400'
		};
		return baseClasses[sev];
	}

	function getSeverityBadgeClass(sev: Severity): string {
		const baseClasses: Record<Severity, string> = {
			success: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-300',
			warning: 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300',
			error: 'bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-300',
			info: 'bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300'
		};
		return baseClasses[sev];
	}

	function handleCopy(text?: string) {
		if (!text) return;
		clipboard.copy(text);
	}

	function handleClose() {
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="glass flex max-h-[90vh] flex-col rounded-xl border shadow-xl sm:max-w-[980px]">
		<Dialog.Header class="shrink-0 border-b p-4">
			{@render headerContent()}
		</Dialog.Header>

		<div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
			{@render infoCards()}
			{@render metadataSection()}
			{@render rawEventSection()}
		</div>

		<Dialog.Footer class="flex shrink-0 items-center justify-end gap-2 border-t p-3">
			<Button variant="outline" onclick={handleClose}>
				{m.common_close()}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

{#snippet headerContent()}
	<div class="flex items-start gap-3">
		<div class="mt-0.5">
			{#if severity === 'success'}
				<CheckCircle2Icon class={getSeverityIconClass(severity) + ' size-6'} />
			{:else if severity === 'warning'}
				<TriangleAlertIcon class={getSeverityIconClass(severity) + ' size-6'} />
			{:else if severity === 'error'}
				<XCircleIcon class={getSeverityIconClass(severity) + ' size-6'} />
			{:else}
				<InfoIcon class={getSeverityIconClass(severity) + ' size-6'} />
			{/if}
		</div>
		<div class="min-w-0 flex-1">
			<Dialog.Title class="text-xl font-semibold">
				{event?.title ?? m.events_details_title()}
			</Dialog.Title>
			{#if event?.description}
				<Dialog.Description class="text-muted-foreground mt-1 text-sm">
					{event.description}
				</Dialog.Description>
			{/if}
			<div class="mt-3 flex flex-wrap items-center gap-2">
				<Badge class={`border ${getSeverityBadgeClass(severity)}`}>
					{event?.severity ?? m.common_unknown()}
				</Badge>
				<Badge variant="outline" class="gap-1">
					<TagIcon class="size-3" />
					{event?.type ?? m.common_unknown()}
				</Badge>
				{#if event?.environmentId}
					<Badge variant="outline" class="gap-1">
						<ServerIcon class="size-3" />
						{m.events_environment_label()}: {event.environmentId}
					</Badge>
				{/if}
				{#if formattedTimestamp}
					<span class="text-muted-foreground inline-flex items-center gap-1 text-xs">
						<ClockIcon class="size-3" />
						{formattedTimestamp}
					</span>
				{/if}
			</div>
		</div>
	</div>
{/snippet}

{#snippet infoCards()}
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
		{@render infoCard(m.events_resource_id_label(), event?.resourceId, m.events_copy_resource_id_title())}
		{@render infoCard(m.events_resource_name_label(), event?.resourceName, m.events_copy_resource_name_title())}

		<div class="rounded-lg border p-3">
			<div class="text-muted-foreground text-xs">{m.common_user()}</div>
			<div class="mt-1 flex items-center gap-2 text-sm">
				<UserIcon class="text-muted-foreground size-4" />
				{event?.username ?? m.common_unknown()}
			</div>
		</div>
	</div>
{/snippet}

{#snippet infoCard(label: string, value: string | undefined, copyTitle: string)}
	<div class="rounded-lg border p-3">
		<div class="text-muted-foreground text-xs">{label}</div>
		<div class="mt-1 flex items-center justify-between gap-2">
			<div class="text-sm break-all">{value || '-'}</div>
			<Button variant="ghost" size="icon" class="size-7" onclick={() => handleCopy(value)} title={copyTitle}>
				<CopyIcon class="size-4" />
			</Button>
		</div>
	</div>
{/snippet}

{#snippet metadataSection()}
	<div class="rounded-lg border">
		<div class="flex items-center justify-between border-b px-3 py-2">
			<h3 class="text-sm font-medium">{m.events_metadata_title()}</h3>
			<Button
				variant="outline"
				size="sm"
				onclick={() => handleCopy(metadataJson)}
				disabled={!hasMetadata}
				title="Copy metadata JSON"
			>
				<CopyIcon class="mr-2 size-3" />
				{m.common_copy_json()}
			</Button>
		</div>
		{#if hasMetadata}
			<pre class="bg-muted/40 max-h-[40vh] overflow-auto p-3 text-xs leading-relaxed"><code class="font-mono">{metadataJson}</code
				></pre>
		{:else}
			<div class="text-muted-foreground p-3 text-xs">{m.events_no_metadata_provided()}</div>
		{/if}
	</div>
{/snippet}

{#snippet rawEventSection()}
	<div class="rounded-lg border">
		<div class="flex items-center justify-between border-b px-3 py-2">
			<h3 class="text-sm font-medium">{m.events_raw_event_title()}</h3>
			<Button variant="outline" size="sm" onclick={() => handleCopy(eventJson)} title={m.events_copy_full_event_json_title()}>
				<CopyIcon class="mr-2 size-3" />
				{m.common_copy_json()}
			</Button>
		</div>
		<pre class="bg-muted/40 max-h-[40vh] overflow-auto p-3 text-xs leading-relaxed"><code class="font-mono">{eventJson}</code
			></pre>
	</div>
{/snippet}

<style>
	/* Lock background scroll while dialog is open; no animations/effects */
	:global(html:has([data-slot='dialog-overlay'][data-state='open'])) {
		overflow: hidden;
	}
	:global(body:has([data-slot='dialog-overlay'][data-state='open'])) {
		overflow: hidden;
	}
</style>
