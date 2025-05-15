<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { CircleCheck, CircleFadingArrowUp, CircleArrowUp, Loader2 } from '@lucide/svelte';

	interface Props {
		maturity?:
			| {
					updatesAvailable: boolean;
					status: string;
					version?: string;
					date?: string;
			  }
			| undefined;
		isLoadingInBackground?: boolean;
	}

	let { maturity = undefined, isLoadingInBackground = false }: Props = $props();
</script>

{#if maturity}
	<Tooltip.Provider>
		<Tooltip.Root>
			<Tooltip.Trigger>
				<span class="inline-flex items-center justify-center align-middle mr-2 size-4">
					{#if !maturity.updatesAvailable}
						<CircleCheck class="text-green-500 size-4" fill="none" stroke="currentColor" strokeWidth="2" />
					{:else if maturity.status === 'Not Matured'}
						<CircleFadingArrowUp class="text-yellow-500 size-4" fill="none" stroke="currentColor" stroke-width="2" />
					{:else}
						<CircleArrowUp class="text-blue-500 size-4" fill="none" stroke="currentColor" stroke-width="2" />
					{/if}
				</span>
			</Tooltip.Trigger>
			<Tooltip.Content side="right" class="p-3 max-w-[200px] relative tooltip-with-arrow" align="center">
				<div class="space-y-2">
					<div class="flex items-center gap-2">
						{#if !maturity.updatesAvailable}
							<CircleCheck class="text-green-500 size-5" fill="none" stroke="currentColor" strokeWidth="2" />
							<span class="font-medium">Image Up to Date</span>
						{:else if maturity.status === 'Not Matured'}
							<CircleFadingArrowUp class="text-yellow-500 size-5" fill="none" stroke="currentColor" stroke-width="2" />
							<span class="font-medium">Update Available (Not Matured)</span>
						{:else}
							<CircleArrowUp class="text-blue-500 size-5" fill="none" stroke="currentColor" stroke-width="2" />
							<span class="font-medium">Matured Update Available</span>
						{/if}
					</div>

					<div class="pt-1 border-t border-gray-200 dark:border-gray-700 justify-between">
						<div class="flex justify-between text-xs">
							<span class="text-muted-foreground">Version:</span>
							<span class="font-medium">{maturity.version || 'N/A'}</span>
						</div>

						<div class="flex justify-between text-xs mt-1">
							<span class="text-muted-foreground">Released:</span>
							<span>{maturity.date || 'Unknown'}</span>
						</div>

						<div class="flex justify-between text-xs mt-1">
							<span class="text-muted-foreground">Status:</span>
							<span class={maturity.status === 'Matured' ? 'text-green-500' : 'text-amber-500'}>
								{maturity.status || 'Unknown'}
							</span>
						</div>
					</div>
				</div>
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
{:else if isLoadingInBackground}
	<Tooltip.Provider>
		<Tooltip.Root>
			<Tooltip.Trigger>
				<span class="inline-flex items-center justify-center align-middle mr-2 size-4">
					<Loader2 class="text-blue-400 size-4 animate-spin" />
				</span>
			</Tooltip.Trigger>
			<Tooltip.Content side="right" class="p-2 relative tooltip-with-arrow" align="center">
				<span class="text-xs">Checking maturity status...</span>
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
{:else}
	<Tooltip.Provider>
		<Tooltip.Root>
			<Tooltip.Trigger>
				<span class="inline-flex items-center justify-center mr-2 opacity-30 size-4">
					<svg class="text-gray-500 size-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
						<circle cx="12" cy="12" r="10" />
						<path d="M9 12l2 2 4-4" />
					</svg>
				</span>
			</Tooltip.Trigger>
			<Tooltip.Content side="right" class="p-2 relative tooltip-with-arrow" align="center">
				<span class="text-xs">Maturity status not available.</span>
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
{/if}
