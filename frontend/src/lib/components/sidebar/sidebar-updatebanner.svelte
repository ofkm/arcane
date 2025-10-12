<script lang="ts">
	import * as Item from '$lib/components/ui/item';
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

	console.log(versionInformation);

	const sidebar = useSidebar();
</script>

{#if updateAvailable}
	<div class={cn('pb-2', isCollapsed ? 'px-1' : 'px-4')}>
		<Separator.Root class="mb-3 opacity-30" />

		{#if !isCollapsed}
			<a
				href={versionInformation?.releaseUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="block transition-transform hover:scale-[1.02]"
			>
				<Item.Root
					variant="default"
					size="sm"
					class="border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-600/5 hover:from-blue-500/15 hover:to-blue-600/10 hover:shadow-md"
				>
					<Item.Header>
						<Item.Content>
							<Item.Title class="text-blue-600 dark:text-blue-400">{m.sidebar_update_available()}</Item.Title>
							<Item.Description class="text-blue-500/80"
								>{m.sidebar_version({ version: versionInformation?.newestVersion ?? m.common_unknown() })}</Item.Description
							>
						</Item.Content>
						<ExternalLink size={16} class="text-blue-600 transition-transform duration-200 hover:scale-110 dark:text-blue-400" />
					</Item.Header>
				</Item.Root>
			</a>
		{:else}
			<div class="flex justify-center">
				<Tooltip.Root>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<a
								href={versionInformation?.releaseUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="block transition-transform hover:scale-[1.02]"
								{...props}
							>
								<Item.Root
									variant="default"
									size="sm"
									class="border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-2 hover:from-blue-500/15 hover:to-blue-600/10 hover:shadow-md"
								>
									<Item.Header>
										<ExternalLink size={14} class="text-blue-600 dark:text-blue-400" />
									</Item.Header>
								</Item.Root>
							</a>
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
