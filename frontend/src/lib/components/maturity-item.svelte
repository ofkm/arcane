<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import {
		CircleCheck,
		CircleFadingArrowUp,
		CircleArrowUp,
		Loader2,
		Clock,
		Package,
		Calendar,
		AlertTriangle,
		RefreshCw,
		ArrowRight
	} from '@lucide/svelte';
	import { environmentAPI } from '$lib/services/api';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import { formatDate } from '$lib/utils/string.utils';

	interface MaturityData {
		updatesAvailable: boolean;
		status: string;
		version?: string;
		date?: string;
		latestVersion?: string;
	}

	interface Props {
		maturity?: MaturityData | undefined;
		isLoadingInBackground?: boolean;
		imageId: string;
		repo?: string;
		tag?: string;
	}

	let { maturity = undefined, isLoadingInBackground = false, imageId, repo, tag }: Props = $props();

	let isChecking = $state(false);

	const canCheckMaturity = $derived(repo && tag && repo !== '<none>' && tag !== '<none>');

	async function checkImageMaturity() {
		if (!canCheckMaturity || isChecking) return;

		isChecking = true;
		try {
			const result = await environmentAPI.triggerMaturityCheck([imageId]);

			if (result.success) {
				toast.success('Maturity check completed');
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

	function getUpdatePriority(maturity: MaturityData): {
		level: string;
		color: string;
		description: string;
	} {
		if (!maturity.updatesAvailable) {
			return { level: 'None', color: 'text-green-500', description: 'Image is up to date' };
		}

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
				description: maturity.latestVersion
					? `${maturity.latestVersion} available, but not yet matured`
					: 'Recent update, may be unstable'
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
				<span class="mr-2 inline-flex size-4 items-center justify-center align-middle">
					{#if !maturity.updatesAvailable}
						<CircleCheck
							class="size-4 text-green-500"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						/>
					{:else if maturity.status === 'Not Matured'}
						<CircleFadingArrowUp
							class="size-4 text-yellow-500"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						/>
					{:else}
						<CircleArrowUp
							class="size-4 text-blue-500"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						/>
					{/if}
				</span>
			</Tooltip.Trigger>
			<Tooltip.Content
				side="right"
				class="bg-popover text-popover-foreground border-border tooltip-with-arrow maturity-tooltip relative max-w-[280px] border p-4 shadow-lg"
				align="center"
			>
				<div class="space-y-3">
					<!-- Header with icon and status -->
					<div class="border-border flex items-center gap-3 border-b pb-2">
						{#if !maturity.updatesAvailable}
							<div
								class="flex h-8 w-8 items-center justify-center rounded-full border border-green-500/20 bg-green-500/10"
							>
								<CircleCheck
									class="size-5 text-green-500"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
								/>
							</div>
							<div>
								<div class="text-sm font-semibold">Up to Date</div>
								<div class="text-muted-foreground text-xs">No updates available</div>
							</div>
						{:else if maturity.status === 'Not Matured'}
							<div
								class="flex h-8 w-8 items-center justify-center rounded-full border border-yellow-500/20 bg-yellow-500/10"
							>
								<CircleFadingArrowUp
									class="size-5 text-yellow-500"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								/>
							</div>
							<div>
								<div class="text-sm font-semibold">Update Available</div>
								<div class="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
									<AlertTriangle class="size-3" />
									Not yet matured
								</div>
							</div>
						{:else}
							<div
								class="flex h-8 w-8 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10"
							>
								<CircleArrowUp
									class="size-5 text-blue-500"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								/>
							</div>
							<div>
								<div class="text-sm font-semibold">Stable Update</div>
								<div class="text-xs text-blue-600 dark:text-blue-400">Recommended for update</div>
							</div>
						{/if}
					</div>

					<!-- Details grid -->
					<div class="grid gap-2 text-xs">
						<div class="flex items-center justify-between">
							<div class="text-muted-foreground flex items-center gap-1.5">
								<Package class="size-3" />
								<span>Current</span>
							</div>
							<span class="font-mono font-medium">{maturity.version || 'Unknown'}</span>
						</div>

						<!-- Show latest version if updates are available -->
						{#if maturity.updatesAvailable && maturity.latestVersion}
							<div class="flex items-center justify-between">
								<div class="text-muted-foreground flex items-center gap-1.5">
									<ArrowRight class="size-3" />
									<span>Latest</span>
								</div>
								<span class="font-mono font-medium text-blue-600 dark:text-blue-400"
									>{maturity.latestVersion}</span
								>
							</div>
						{/if}

						<div class="flex items-center justify-between">
							<div class="text-muted-foreground flex items-center gap-1.5">
								<Calendar class="size-3" />
								<span>Released</span>
							</div>
							<span class="font-medium">{formatDate(maturity.date)}</span>
						</div>

						<div class="flex items-center justify-between">
							<div class="text-muted-foreground flex items-center gap-1.5">
								<Clock class="size-3" />
								<span>Status</span>
							</div>
							<span class="font-medium {getStatusColor(maturity.status)}">
								{maturity.status || 'Unknown'}
							</span>
						</div>

						<div class="flex items-center justify-between">
							<div class="text-muted-foreground flex items-center gap-1.5">
								<span>Priority</span>
							</div>
							<span class="font-medium {priority.color}">
								{priority.level}
							</span>
						</div>
					</div>

					<!-- Update recommendation -->
					<div class="border-border border-t pt-2">
						<div class="text-muted-foreground text-xs leading-relaxed">
							{priority.description}
						</div>
					</div>

					<!-- Re-check button -->
					{#if canCheckMaturity}
						<div class="border-border border-t pt-2">
							<button
								onclick={checkImageMaturity}
								disabled={isChecking}
								class="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-400 dark:hover:text-blue-300"
							>
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
				<span class="mr-2 inline-flex size-4 items-center justify-center align-middle">
					<Loader2 class="size-4 animate-spin text-blue-400" />
				</span>
			</Tooltip.Trigger>
			<Tooltip.Content
				side="right"
				class="bg-popover text-popover-foreground border-border tooltip-with-arrow relative max-w-[220px] border p-3 shadow-lg"
				align="center"
			>
				<div class="flex items-center gap-2">
					<Loader2 class="size-4 animate-spin text-blue-400" />
					<div>
						<div class="text-sm font-medium">Checking Updates</div>
						<div class="text-muted-foreground text-xs">Querying registry for latest version...</div>
					</div>
				</div>
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
{:else}
	<Tooltip.Provider>
		<Tooltip.Root>
			<Tooltip.Trigger>
				<span class="mr-2 inline-flex size-4 items-center justify-center">
					{#if canCheckMaturity}
						<button
							onclick={checkImageMaturity}
							disabled={isChecking}
							class="group flex h-4 w-4 items-center justify-center rounded-full border-2 border-dashed border-gray-400 transition-colors hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed dark:hover:bg-blue-950"
						>
							{#if isChecking}
								<Loader2 class="h-2 w-2 animate-spin text-blue-400" />
							{:else}
								<div
									class="h-1.5 w-1.5 rounded-full bg-gray-400 transition-colors group-hover:bg-blue-400"
								></div>
							{/if}
						</button>
					{:else}
						<div
							class="flex h-4 w-4 items-center justify-center rounded-full border-2 border-dashed border-gray-400 opacity-30"
						>
							<div class="h-1.5 w-1.5 rounded-full bg-gray-400"></div>
						</div>
					{/if}
				</span>
			</Tooltip.Trigger>
			<Tooltip.Content
				side="right"
				class="bg-popover text-popover-foreground border-border tooltip-with-arrow relative max-w-[240px] border p-3 shadow-lg"
				align="center"
			>
				<div class="flex items-center gap-2">
					<div
						class="bg-muted border-border flex h-6 w-6 items-center justify-center rounded-full border"
					>
						<AlertTriangle class="text-muted-foreground size-3" />
					</div>
					<div>
						<div class="text-sm font-medium">Status Unknown</div>
						<div class="text-muted-foreground text-xs leading-relaxed">
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
