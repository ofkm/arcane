<script lang="ts">
	import { cn } from '$lib/utils';
	import * as Separator from '$lib/components/ui/separator/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import type { AppVersionInformation } from '$lib/types/application-configuration';
	import { m } from '$lib/paraglide/messages';
	import { Button } from '$lib/components/ui/button/index.js';

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

	const shouldShowBanner = $derived(updateAvailable && versionInformation?.isSemverVersion);
</script>

{#if shouldShowBanner}
	<div class={cn('pb-2', isCollapsed ? 'px-1' : 'px-4')}>
		<Separator.Root class="mb-3 opacity-30" />

		{#if !isCollapsed}
			<div
				class="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-3 transition-all hover:scale-[1.02] hover:from-blue-500/15 hover:to-blue-600/10 hover:shadow-md"
			>
				<Button
					variant="link"
					href={versionInformation?.releaseUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="group flex items-center justify-between text-blue-600 transition-colors duration-200 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
				>
					<div class="flex flex-col gap-1">
						<span class="text-sm font-semibold">{m.sidebar_update_available()}</span>
						<span class="text-xs text-blue-500/80"
							>{m.sidebar_version({ version: versionInformation?.newestVersion ?? m.common_unknown() })}</span
						>
					</div>
					<ExternalLink size={16} class="transition-transform duration-200 group-hover:scale-110" />
				</Button>
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
					<Tooltip.Content side="right" align="center" hidden={sidebar.state !== 'collapsed' || sidebar.isHovered}>
						{m.sidebar_update_available_tooltip({ version: versionInformation?.newestVersion ?? m.common_unknown() })}
					</Tooltip.Content>
				</Tooltip.Root>
			</div>
		{/if}
	</div>
{/if}
