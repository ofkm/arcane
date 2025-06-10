<script lang="ts">
	import { cn } from '$lib/utils';
	import * as Separator from '$lib/components/ui/separator/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import type { AppVersionInformation } from '$lib/types/application-configuration';

	let {
		isCollapsed,
		versionInformation,
		updateAvailable = false
	}: {
		isCollapsed: boolean;
		versionInformation?: AppVersionInformation;
		updateAvailable?: boolean;
	} = $props();

	const sidebar = useSidebar();
</script>

{#if updateAvailable}
	<div class={cn('pb-2', isCollapsed ? 'px-1' : 'px-4')}>
		<Separator.Root class="mb-3 opacity-30" />

		{#if !isCollapsed}
			<div
				class="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-3 transition-all hover:scale-[1.02] hover:from-blue-500/15 hover:to-blue-600/10 hover:shadow-md"
			>
				<a
					href={versionInformation?.releaseUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="group flex items-center justify-between text-blue-600 transition-colors duration-200 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
				>
					<div class="flex flex-col gap-1">
						<span class="text-sm font-semibold">Update available</span>
						<span class="text-xs text-blue-500/80">v{versionInformation?.newestVersion}</span>
					</div>
					<ExternalLink size={16} class="transition-transform duration-200 group-hover:scale-110" />
				</a>
			</div>
		{:else}
			<div class="flex justify-center">
				<Tooltip.Root>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<div
								class="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-600/5 transition-all hover:scale-[1.02] hover:from-blue-500/15 hover:to-blue-600/10 hover:shadow-md"
								{...props}
							>
								<a
									href={versionInformation?.releaseUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="flex h-full w-full items-center justify-center text-blue-600 transition-all duration-200 hover:scale-110 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
								>
									<ExternalLink size={14} />
								</a>
							</div>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content
						side="right"
						align="center"
						hidden={sidebar.state !== 'collapsed' || sidebar.isMobile}
					>
						Update available: v{versionInformation?.newestVersion}
					</Tooltip.Content>
				</Tooltip.Root>
			</div>
		{/if}
	</div>
{/if}
