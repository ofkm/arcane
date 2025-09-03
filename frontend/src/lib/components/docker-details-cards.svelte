<script lang="ts">
	import GradientFrameCard from '$lib/components/gradient-frame-card.svelte';
	import BoxIcon from '@lucide/svelte/icons/box';
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import DockerIcon from '$lib/icons/docker-icon.svelte';
	import type { Component } from 'svelte';
	import type { IconProps } from '@lucide/svelte';
	const DockerIconTyped = DockerIcon as unknown as Component<IconProps, {}, ''>;

	type DockerInfo =
		| {
				version?: string;
				os?: string;
				architecture?: string;
		  }
		| null
		| undefined;

	let {
		title = 'Docker Details',
		isLoadingDockerInfo = false,
		isLoadingStats = false,
		isLoadingImages = false,
		dockerInfo,
		totalContainers,
		stoppedContainers,
		containersRunning,
		imagesTotal,
		class: className
	}: {
		title?: string;
		isLoadingDockerInfo?: boolean;
		isLoadingStats?: boolean;
		isLoadingImages?: boolean;
		dockerInfo: DockerInfo;
		totalContainers: number;
		stoppedContainers: number;
		containersRunning: number;
		imagesTotal: number;
		class?: string;
	} = $props();
</script>

<section class={className}>
	<h2 class="mb-4 text-lg font-semibold tracking-tight">{title}</h2>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
		<GradientFrameCard
			class="w-full"
			title="Docker Engine"
			icon={DockerIconTyped}
			color="blue"
			loading={isLoadingDockerInfo}
			rightBadge={dockerInfo?.version ?? null}
			subtitle={!isLoadingDockerInfo ? `${dockerInfo?.os || 'Unknown OS'} • ${dockerInfo?.architecture || 'Unknown arch'}` : null}
		/>

		<GradientFrameCard
			class="w-full"
			title="Containers"
			icon={BoxIcon}
			color="emerald"
			loading={isLoadingStats}
			rightBadge={!isLoadingStats ? `${containersRunning} running` : null}
		>
			{#if !isLoadingStats}
				<div class="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
					<span class="bg-muted rounded-md px-1.5 py-0.5">total {totalContainers}</span>
					<span class="bg-muted rounded-md px-1.5 py-0.5">stopped {stoppedContainers}</span>
				</div>
			{/if}
		</GradientFrameCard>

		<GradientFrameCard
			class="w-full"
			title="Images"
			icon={HardDriveIcon}
			color="purple"
			loading={isLoadingImages}
			rightBadge={!isLoadingImages ? imagesTotal : null}
			subtitle={!isLoadingImages ? 'Total images discovered' : null}
		/>
	</div>
</section>
