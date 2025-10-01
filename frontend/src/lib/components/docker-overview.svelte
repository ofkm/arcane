<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import InfoIcon from '@lucide/svelte/icons/info';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import DockerIcon from '$lib/icons/docker-icon.svelte';
	import BoxIcon from '@lucide/svelte/icons/box';
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import DockerInfoDialog from '$lib/components/dialogs/docker-info-dialog.svelte';
	import type { DockerInfo } from '$lib/types/docker-info.type';
	import { m } from '$lib/paraglide/messages';

	let {
		dockerInfo,
		containersRunning,
		containersStopped,
		totalContainers,
		totalImages,
		loading = false,
		class: className
	}: {
		dockerInfo: DockerInfo | null;
		containersRunning: number;
		containersStopped: number;
		totalContainers: number;
		totalImages: number;
		loading?: boolean;
		class?: string;
	} = $props();

	let dockerInfoDialogOpen = $state(false);
</script>

<div
	class="bg-card/80 supports-[backdrop-filter]:bg-card/60 ring-border/40 group relative isolate flex overflow-hidden rounded-xl border shadow-sm ring-1 ring-inset backdrop-blur-sm transition-all duration-300 hover:shadow-md dark:shadow-none {className}"
>
	<div
		class="flex flex-1 items-center gap-4 bg-gradient-to-br from-gray-50 to-slate-50/30 p-4 dark:from-gray-900/20 dark:to-slate-900/10"
	>
		<div
			class="from-primary to-primary/80 shadow-primary/25 flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br shadow-lg"
		>
			{#if loading}
				<LoaderCircleIcon class="size-5 animate-spin text-white" />
			{:else}
				<DockerIcon class="size-5 text-white" />
			{/if}
		</div>

		{#if loading}
			<div class="flex flex-1 flex-col gap-2">
				<Skeleton class="h-4 w-32" />
				<Skeleton class="h-3 w-48" />
			</div>
		{:else}
			<div class="flex flex-1 flex-col gap-1.5">
				<div class="flex items-center gap-2">
					<span class="text-foreground text-sm font-semibold">{m.docker_engine_title()}</span>
					<Badge variant="outline" class="text-xs">{dockerInfo?.version ?? '-'}</Badge>
				</div>
				<div class="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
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
			</div>
		{/if}

		{#if !loading && dockerInfo}
			<Button
				variant="ghost"
				size="icon"
				class="text-muted-foreground hover:text-foreground size-8 shrink-0"
				onclick={() => (dockerInfoDialogOpen = true)}
			>
				<InfoIcon class="size-4" />
			</Button>
		{/if}
	</div>
</div>

<DockerInfoDialog bind:open={dockerInfoDialogOpen} {dockerInfo} />
