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
			<div class="transition-all rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 hover:shadow-md hover:scale-[1.02] hover:from-blue-500/15 hover:to-blue-600/10 p-3">
				<a href={versionInformation?.releaseUrl} target="_blank" rel="noopener noreferrer" class="flex items-center justify-between text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200 group">
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
							<div class="w-8 h-8 transition-all rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 hover:shadow-md hover:scale-[1.02] hover:from-blue-500/15 hover:to-blue-600/10 flex items-center justify-center" {...props}>
								<a href={versionInformation?.releaseUrl} target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-200 hover:scale-110 flex items-center justify-center w-full h-full">
									<ExternalLink size={14} />
								</a>
							</div>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="right" align="center" hidden={sidebar.state !== 'collapsed' || sidebar.isMobile}>
						Update available: v{versionInformation?.newestVersion}
					</Tooltip.Content>
				</Tooltip.Root>
			</div>
		{/if}
	</div>
{/if}
