<script lang="ts">
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import CirclePlayIcon from '@lucide/svelte/icons/circle-play';
	import CircleStopIcon from '@lucide/svelte/icons/circle-stop';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';

	type IsLoadingFlags = {
		starting: boolean;
		stopping: boolean;
		pruning: boolean;
	};

	type DockerInfo = { containersRunning?: number } | null | undefined;

	let {
		dockerInfo,
		stoppedContainers,
		totalContainers,
		loadingDockerInfo = false,
		isLoading,
		onStartAll,
		onStopAll,
		onOpenPruneDialog,
		class: className
	}: {
		dockerInfo: DockerInfo;
		stoppedContainers: number;
		totalContainers: number;
		loadingDockerInfo?: boolean;
		isLoading: IsLoadingFlags;
		onStartAll: () => void;
		onStopAll: () => void;
		onOpenPruneDialog: () => void;
		class?: string;
	} = $props();
</script>

<section class={className}>
	<h2 class="mb-3 text-lg font-semibold tracking-tight">Quick Actions</h2>

	{#if loadingDockerInfo}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each Array(3) as _}
				<div class="bg-card flex items-center rounded-lg border p-3">
					<div class="bg-muted mr-3 size-6 animate-pulse rounded-full"></div>
					<div class="flex-1">
						<div class="bg-muted mb-1 h-3 w-16 animate-pulse rounded"></div>
						<div class="bg-muted h-2 w-12 animate-pulse rounded"></div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<div class="group rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/0 p-[1px]">
				<button
					class="bg-card/80 supports-[backdrop-filter]:bg-card/60 ring-offset-background focus-visible:ring-ring flex min-h-14 w-full items-center gap-3 rounded-xl border p-3 shadow-sm backdrop-blur transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
					disabled={!dockerInfo || stoppedContainers === 0 || isLoading.starting || isLoading.stopping || isLoading.pruning}
					onclick={onStartAll}
					aria-busy={isLoading.starting}
				>
					<div class="relative">
						<div class="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/30">
							{#if isLoading.starting}
								<LoaderCircleIcon class="size-4 text-emerald-400 motion-safe:animate-spin" />
							{:else}
								<CirclePlayIcon class="size-5 text-emerald-400" />
							{/if}
						</div>
						<div
							class="pointer-events-none absolute -inset-1 rounded-lg bg-emerald-500/20 opacity-0 blur-lg transition-opacity group-hover:opacity-40"
						></div>
					</div>
					<div class="flex-1 text-left">
						<div class="text-sm font-medium">Start All Stopped</div>
						<div class="text-muted-foreground text-xs">
							<span class="rounded-full border px-1.5 py-0.5">{stoppedContainers}</span> containers
						</div>
					</div>
				</button>
			</div>

			<div class="group rounded-xl bg-gradient-to-br from-sky-500/20 to-sky-500/0 p-[1px]">
				<button
					class="bg-card/80 supports-[backdrop-filter]:bg-card/60 ring-offset-background focus-visible:ring-ring flex min-h-14 w-full items-center gap-3 rounded-xl border p-3 shadow-sm backdrop-blur transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
					disabled={!dockerInfo ||
						(dockerInfo?.containersRunning ?? 0) === 0 ||
						isLoading.starting ||
						isLoading.stopping ||
						isLoading.pruning}
					onclick={onStopAll}
					aria-busy={isLoading.stopping}
				>
					<div class="relative">
						<div class="flex size-10 items-center justify-center rounded-lg bg-sky-500/10 ring-1 ring-sky-500/30">
							{#if isLoading.stopping}
								<LoaderCircleIcon class="size-4 text-sky-400 motion-safe:animate-spin" />
							{:else}
								<CircleStopIcon class="size-5 text-sky-400" />
							{/if}
						</div>
						<div
							class="pointer-events-none absolute -inset-1 rounded-lg bg-sky-500/20 opacity-0 blur-lg transition-opacity group-hover:opacity-40"
						></div>
					</div>
					<div class="flex-1 text-left">
						<div class="text-sm font-medium">Stop All Running</div>
						<div class="text-muted-foreground text-xs">
							<span class="rounded-full border px-1.5 py-0.5">{totalContainers}</span> containers
						</div>
					</div>
				</button>
			</div>

			<div class="group rounded-xl bg-gradient-to-br from-red-500/20 to-red-500/0 p-[1px]">
				<button
					class="bg-card/80 supports-[backdrop-filter]:bg-card/60 ring-offset-background focus-visible:ring-ring flex min-h-14 w-full items-center gap-3 rounded-xl border p-3 shadow-sm backdrop-blur transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
					disabled={!dockerInfo || isLoading.starting || isLoading.stopping || isLoading.pruning}
					onclick={onOpenPruneDialog}
					aria-busy={isLoading.pruning}
				>
					<div class="relative">
						<div class="flex size-10 items-center justify-center rounded-lg bg-red-500/10 ring-1 ring-red-500/30">
							{#if isLoading.pruning}
								<LoaderCircleIcon class="size-4 text-red-400 motion-safe:animate-spin" />
							{:else}
								<Trash2Icon class="size-5 text-red-400" />
							{/if}
						</div>
						<div
							class="pointer-events-none absolute -inset-1 rounded-lg bg-red-500/20 opacity-0 blur-lg transition-opacity group-hover:opacity-40"
						></div>
					</div>
					<div class="flex-1 text-left">
						<div class="text-sm font-medium">Prune System</div>
						<div class="text-muted-foreground text-xs">Clean unused resources</div>
					</div>
				</button>
			</div>
		</div>
	{/if}
</section>
