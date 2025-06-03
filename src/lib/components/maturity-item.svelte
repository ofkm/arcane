<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { CircleCheck, CircleFadingArrowUp, CircleArrowUp, Loader2, Clock, Package, Calendar, AlertTriangle } from '@lucide/svelte';

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

	// Helper function to format the date more nicely
	function formatDate(dateString: string | undefined): string {
		if (!dateString || dateString === 'Unknown date' || dateString === 'Invalid date') {
			return 'Unknown';
		}

		try {
			const date = new Date(dateString);
			if (isNaN(date.getTime())) return 'Unknown';

			const now = new Date();
			const diffTime = Math.abs(now.getTime() - date.getTime());
			const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

			if (diffDays === 0) return 'Today';
			if (diffDays === 1) return 'Yesterday';
			if (diffDays < 7) return `${diffDays} days ago`;
			if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
			if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
			return `${Math.floor(diffDays / 365)} years ago`;
		} catch {
			return 'Unknown';
		}
	}

	// Helper function to get status color
	function getStatusColor(status: string): string {
		switch (status) {
			case 'Matured':
				return 'text-green-500';
			case 'Not Matured':
				return 'text-amber-500';
			case 'Unknown':
				return 'text-gray-500';
			default:
				return 'text-gray-500';
		}
	}

	// Helper function to get update priority level
	function getUpdatePriority(maturity: any): { level: string; color: string; description: string } {
		if (!maturity.updatesAvailable) {
			return { level: 'None', color: 'text-green-500', description: 'Image is up to date' };
		}

		if (maturity.status === 'Matured') {
			return { level: 'Recommended', color: 'text-blue-500', description: 'Stable update available' };
		}

		if (maturity.status === 'Not Matured') {
			return { level: 'Optional', color: 'text-yellow-500', description: 'Recent update, may be unstable' };
		}

		return { level: 'Unknown', color: 'text-gray-500', description: 'Update status unclear' };
	}
</script>

{#if maturity}
	{@const priority = getUpdatePriority(maturity)}
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
			<Tooltip.Content side="right" class="bg-popover text-popover-foreground border border-border shadow-lg p-4 max-w-[280px] relative tooltip-with-arrow maturity-tooltip" align="center">
				<div class="space-y-3">
					<!-- Header with icon and status -->
					<div class="flex items-center gap-3 pb-2 border-b border-border">
						{#if !maturity.updatesAvailable}
							<div class="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20">
								<CircleCheck class="text-green-500 size-5" fill="none" stroke="currentColor" strokeWidth="2" />
							</div>
							<div>
								<div class="font-semibold text-sm">Up to Date</div>
								<div class="text-xs text-muted-foreground">No updates available</div>
							</div>
						{:else if maturity.status === 'Not Matured'}
							<div class="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/10 border border-yellow-500/20">
								<CircleFadingArrowUp class="text-yellow-500 size-5" fill="none" stroke="currentColor" stroke-width="2" />
							</div>
							<div>
								<div class="font-semibold text-sm">Update Available</div>
								<div class="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
									<AlertTriangle class="size-3" />
									Not yet matured
								</div>
							</div>
						{:else}
							<div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20">
								<CircleArrowUp class="text-blue-500 size-5" fill="none" stroke="currentColor" stroke-width="2" />
							</div>
							<div>
								<div class="font-semibold text-sm">Stable Update</div>
								<div class="text-xs text-blue-600 dark:text-blue-400">Recommended for update</div>
							</div>
						{/if}
					</div>

					<!-- Details grid -->
					<div class="grid gap-2 text-xs">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-1.5 text-muted-foreground">
								<Package class="size-3" />
								<span>Version</span>
							</div>
							<span class="font-mono font-medium">{maturity.version || 'Unknown'}</span>
						</div>

						<div class="flex items-center justify-between">
							<div class="flex items-center gap-1.5 text-muted-foreground">
								<Calendar class="size-3" />
								<span>Released</span>
							</div>
							<span class="font-medium">{formatDate(maturity.date)}</span>
						</div>

						<div class="flex items-center justify-between">
							<div class="flex items-center gap-1.5 text-muted-foreground">
								<Clock class="size-3" />
								<span>Status</span>
							</div>
							<span class="font-medium {getStatusColor(maturity.status)}">
								{maturity.status || 'Unknown'}
							</span>
						</div>

						<div class="flex items-center justify-between">
							<div class="flex items-center gap-1.5 text-muted-foreground">
								<span>Priority</span>
							</div>
							<span class="font-medium {priority.color}">
								{priority.level}
							</span>
						</div>
					</div>

					<!-- Update recommendation -->
					<div class="pt-2 border-t border-border">
						<div class="text-xs text-muted-foreground leading-relaxed">
							{priority.description}
						</div>
						{#if maturity.updatesAvailable && maturity.status === 'Not Matured'}
							<div class="mt-1 text-xs text-amber-600 dark:text-amber-400 leading-relaxed">Consider waiting for the update to mature before upgrading.</div>
						{/if}
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
			<Tooltip.Content side="right" class="bg-popover text-popover-foreground border border-border shadow-lg p-3 max-w-[220px] relative tooltip-with-arrow" align="center">
				<div class="flex items-center gap-2">
					<Loader2 class="text-blue-400 size-4 animate-spin" />
					<div>
						<div class="text-sm font-medium">Checking Updates</div>
						<div class="text-xs text-muted-foreground">Querying registry for latest version...</div>
					</div>
				</div>
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
{:else}
	<Tooltip.Provider>
		<Tooltip.Root>
			<Tooltip.Trigger>
				<span class="inline-flex items-center justify-center mr-2 opacity-30 size-4">
					<div class="w-4 h-4 rounded-full border-2 border-gray-400 border-dashed flex items-center justify-center">
						<div class="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
					</div>
				</span>
			</Tooltip.Trigger>
			<Tooltip.Content side="right" class="bg-popover text-popover-foreground border border-border shadow-lg p-3 max-w-[240px] relative tooltip-with-arrow" align="center">
				<div class="flex items-center gap-2">
					<div class="flex items-center justify-center w-6 h-6 rounded-full bg-muted border border-border">
						<AlertTriangle class="text-muted-foreground size-3" />
					</div>
					<div>
						<div class="text-sm font-medium">Status Unknown</div>
						<div class="text-xs text-muted-foreground leading-relaxed">Unable to determine maturity status. Registry may be unavailable or rate-limited.</div>
					</div>
				</div>
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
{/if}
