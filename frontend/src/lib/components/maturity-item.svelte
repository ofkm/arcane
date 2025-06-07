<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { CircleCheck, CircleFadingArrowUp, CircleArrowUp, Loader2, Clock, Package, Calendar, AlertTriangle, RefreshCw, ArrowRight } from '@lucide/svelte';
	import ImageMaturityAPIService from '$lib/services/api/image-maturity-api-service';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';

	interface MaturityData {
		updatesAvailable: boolean;
		status: string;
		version?: string;
		date?: string;
		latestVersion?: string; // Add this property
	}

	interface Props {
		maturity?: MaturityData | undefined;
		isLoadingInBackground?: boolean;
		imageId: string;
		repo?: string;
		tag?: string;
	}

	let { maturity = undefined, isLoadingInBackground = false, imageId, repo, tag }: Props = $props();

	const imageMaturityApi = new ImageMaturityAPIService();
	let isChecking = $state(false);

	// Check if image has valid repo/tag for checking
	const canCheckMaturity = $derived(repo && tag && repo !== '<none>' && tag !== '<none>');

	async function checkImageMaturity() {
		if (!canCheckMaturity || isChecking) return;

		isChecking = true;
		try {
			// Since the backend only has bulk check, we trigger that
			const result = await imageMaturityApi.triggerMaturityCheck();

			if (result.success) {
				toast.success('Maturity check completed');
				// Refresh the page to get updated data
				await invalidateAll();
			} else {
				toast.error('Maturity check failed');
			}
		} catch (error) {
			console.error('Error checking maturity:', error);
			toast.error('Failed to check maturity');
		} finally {
			isChecking = false;
		}
	}

	// Helper function to format the date more nicely
	function formatDate(dateString: string | undefined): string {
		if (!dateString || dateString === 'Unknown date' || dateString === 'Invalid date') {
			return 'Unknown';
		}

		try {
			const date = new Date(dateString);
			if (isNaN(date.getTime())) return 'Unknown';

			const now = new Date();
			const diffTime = date.getTime() - now.getTime();
			const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
			const absDiffDays = Math.abs(diffDays);

			// Handle same day (within 24 hours)
			if (absDiffDays === 0) {
				const diffHours = Math.floor(Math.abs(diffTime) / (1000 * 60 * 60));
				if (diffHours === 0) return 'Now';
				return diffTime > 0 ? `In ${diffHours} hours` : `${diffHours} hours ago`;
			}

			// Future dates
			if (diffTime > 0) {
				if (diffDays === 1) return 'Tomorrow';
				if (diffDays < 7) return `In ${diffDays} days`;
				if (diffDays < 30) {
					const weeks = Math.floor(diffDays / 7);
					return weeks === 1 ? 'In 1 week' : `In ${weeks} weeks`;
				}
				return 'Future';
			}

			// Past dates
			if (absDiffDays === 1) return 'Yesterday';
			if (absDiffDays < 7) return `${absDiffDays} days ago`;
			if (absDiffDays < 30) {
				const weeks = Math.floor(absDiffDays / 7);
				return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
			}
			if (absDiffDays < 365) {
				const months = Math.floor(absDiffDays / 30);
				return months === 1 ? '1 month ago' : `${months} months ago`;
			}
			const years = Math.floor(absDiffDays / 365);
			return years === 1 ? '1 year ago' : `${years} years ago`;
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
	function getUpdatePriority(maturity: MaturityData): { level: string; color: string; description: string } {
		if (!maturity.updatesAvailable) {
			return { level: 'None', color: 'text-green-500', description: 'Image is up to date' };
		}

		// If we have a latest version, include it in the description
		let description = 'Stable update available';
		if (maturity.latestVersion) {
			description = `Update to ${maturity.latestVersion} available`;
		}

		if (maturity.status === 'Matured') {
			return { level: 'Recommended', color: 'text-blue-500', description };
		}

		if (maturity.status === 'Not Matured') {
			return {
				level: 'Optional',
				color: 'text-yellow-500',
				description: maturity.latestVersion ? `${maturity.latestVersion} available, but not yet matured` : 'Recent update, may be unstable'
			};
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
								<span>Current</span>
							</div>
							<span class="font-mono font-medium">{maturity.version || 'Unknown'}</span>
						</div>

						<!-- Show latest version if updates are available -->
						{#if maturity.updatesAvailable && maturity.latestVersion}
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-1.5 text-muted-foreground">
									<ArrowRight class="size-3" />
									<span>Latest</span>
								</div>
								<span class="font-mono font-medium text-blue-600 dark:text-blue-400">{maturity.latestVersion}</span>
							</div>
						{/if}

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
					</div>

					<!-- Re-check button -->
					{#if canCheckMaturity}
						<div class="pt-2 border-t border-border">
							<button onclick={checkImageMaturity} disabled={isChecking} class="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed">
								{#if isChecking}
									<Loader2 class="size-3 animate-spin" />
									Checking...
								{:else}
									<RefreshCw class="size-3" />
									Re-check Updates
								{/if}
							</button>
						</div>
					{/if}
				</div>
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
{:else if isLoadingInBackground || isChecking}
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
				<span class="inline-flex items-center justify-center mr-2 size-4">
					{#if canCheckMaturity}
						<button onclick={checkImageMaturity} disabled={isChecking} class="w-4 h-4 rounded-full border-2 border-gray-400 border-dashed flex items-center justify-center hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors disabled:cursor-not-allowed group">
							{#if isChecking}
								<Loader2 class="w-2 h-2 text-blue-400 animate-spin" />
							{:else}
								<div class="w-1.5 h-1.5 bg-gray-400 rounded-full group-hover:bg-blue-400 transition-colors"></div>
							{/if}
						</button>
					{:else}
						<div class="w-4 h-4 rounded-full border-2 border-gray-400 border-dashed flex items-center justify-center opacity-30">
							<div class="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
						</div>
					{/if}
				</span>
			</Tooltip.Trigger>
			<Tooltip.Content side="right" class="bg-popover text-popover-foreground border border-border shadow-lg p-3 max-w-[240px] relative tooltip-with-arrow" align="center">
				<div class="flex items-center gap-2">
					<div class="flex items-center justify-center w-6 h-6 rounded-full bg-muted border border-border">
						<AlertTriangle class="text-muted-foreground size-3" />
					</div>
					<div>
						<div class="text-sm font-medium">Status Unknown</div>
						<div class="text-xs text-muted-foreground leading-relaxed">
							{#if canCheckMaturity}
								Click to check for updates from registry.
							{:else}
								Unable to check maturity for images without proper tags.
							{/if}
						</div>
					</div>
				</div>
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
{/if}
