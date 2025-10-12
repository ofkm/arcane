<script lang="ts">
	import * as Item from '$lib/components/ui/item';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import InfoIcon from '@lucide/svelte/icons/info';
	import DockerIcon from '$lib/icons/docker-icon.svelte';
	import BoxIcon from '@lucide/svelte/icons/box';
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import DockerInfoDialog from '$lib/components/dialogs/docker-info-dialog.svelte';
	import type { DockerInfo } from '$lib/types/docker-info.type';
	import { m } from '$lib/paraglide/messages';

	let {
		dockerInfo,
		containersRunning,
		totalContainers,
		totalImages,
		loading = false,
		class: className
	}: {
		dockerInfo: DockerInfo | null;
		containersRunning: number;
		totalContainers: number;
		totalImages: number;
		loading?: boolean;
		class?: string;
	} = $props();

	let dockerInfoDialogOpen = $state(false);
</script>

<Item.Root variant="outline" class={className}>
	<Item.Header>
		<Item.Media variant="icon">
			{#if loading}
				<div class="bg-muted size-4 animate-pulse rounded"></div>
			{:else}
				<DockerIcon class="text-primary" />
			{/if}
		</Item.Media>

		{#if loading}
			<Item.Content>
				<Skeleton class="h-4 w-32" />
				<Skeleton class="mt-1.5 h-3 w-48" />
			</Item.Content>
		{:else}
			<Item.Content>
				<div class="flex items-center gap-2">
					<Item.Title>{m.docker_engine_title()}</Item.Title>
					<Badge variant="outline" class="text-xs">{dockerInfo?.version ?? '-'}</Badge>
				</div>
				<Item.Description>
					<div class="flex flex-wrap items-center gap-3">
						<span class="flex items-center gap-1.5">
							<BoxIcon class="size-3" />
							<span class="font-medium text-emerald-600">{containersRunning}</span>
							<span class="text-muted-foreground/70">/</span>
							<span>{totalContainers}</span>
						</span>
						<span class="text-muted-foreground/50">•</span>
						<span class="flex items-center gap-1.5">
							<HardDriveIcon class="size-3" />
							<span>{totalImages}</span>
							<span class="text-muted-foreground/70">{m.images_title().toLowerCase()}</span>
						</span>
						<span class="text-muted-foreground/50">•</span>
						<span class="font-mono">
							{dockerInfo?.os ?? '-'} / {dockerInfo?.architecture ?? '-'}
						</span>
					</div>
				</Item.Description>
			</Item.Content>

			{#if dockerInfo}
				<Button
					variant="ghost"
					size="icon"
					class="text-muted-foreground hover:text-foreground size-8 shrink-0"
					onclick={() => (dockerInfoDialogOpen = true)}
				>
					<InfoIcon class="size-4" />
				</Button>
			{/if}
		{/if}
	</Item.Header>
</Item.Root>

<DockerInfoDialog bind:open={dockerInfoDialogOpen} {dockerInfo} />
