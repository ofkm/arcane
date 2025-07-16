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
	import { imageUpdateAPI } from '$lib/services/api';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import { formatDate } from '$lib/utils/string.utils';
	import type { ImageUpdateData } from '$lib/services/api/image-update-api-service';

	interface Props {
		updateInfo?: ImageUpdateData | undefined;
		isLoadingInBackground?: boolean;
		imageId: string;
		repo?: string;
		tag?: string;
	}

	let {
		updateInfo = undefined,
		isLoadingInBackground = false,
		imageId,
		repo,
		tag
	}: Props = $props();

	let isChecking = $state(false);

	const canCheckUpdate = $derived(repo && tag && repo !== '<none>' && tag !== '<none>');

	const displayCurrentVersion = $derived(() => {
		if (updateInfo?.currentVersion && updateInfo.currentVersion.trim() !== '') {
			return updateInfo.currentVersion;
		}
		return tag || 'Unknown';
	});

	const displayLatestVersion = $derived(() => {
		if (updateInfo?.latestVersion && updateInfo.latestVersion.trim() !== '') {
			return updateInfo.latestVersion;
		}
		if (updateInfo?.updateType === 'digest' && updateInfo?.latestDigest) {
			return updateInfo.latestDigest.slice(7, 19) + '...';
		}
		return null;
	});

	async function checkImageUpdate() {
		if (!canCheckUpdate || isChecking) return;

		isChecking = true;
		try {
			const result = await imageUpdateAPI.checkImageUpdateByID(imageId);
			if (result && !result.error) {
				toast.success('Update check completed');
				await invalidateAll();
			} else {
				toast.error(result?.error || 'Update check failed');
			}
		} catch (error) {
			console.error('Error checking update:', error);
			toast.error('Failed to check for updates');
		} finally {
			isChecking = false;
		}
	}

	function getUpdatePriority(updateInfo: ImageUpdateData): {
		level: string;
		color: string;
		description: string;
	} {
		if (!updateInfo.hasUpdate) {
			return { level: 'None', color: 'text-green-500', description: 'Image is up to date' };
		}

		if (updateInfo.updateType === 'digest') {
			return {
				level: 'Security/Bug Fix',
				color: 'text-blue-500',
				description: 'Digest update - likely security or bug fixes'
			};
		}

		if (updateInfo.updateType === 'tag') {
			let description = 'Update available';
			if (updateInfo.latestVersion) {
				description = `Update to ${updateInfo.latestVersion} available`;
			}
			return {
				level: 'Version Update',
				color: 'text-yellow-500',
				description
			};
		}

		return { level: 'Unknown', color: 'text-gray-500', description: 'Update type unknown' };
	}
</script>

{#if updateInfo}
	{@const priority = getUpdatePriority(updateInfo)}
	<Tooltip.Provider>
		<Tooltip.Root>
			<Tooltip.Trigger>
				<span class="mr-2 inline-flex size-4 items-center justify-center align-middle">
					{#if !updateInfo.hasUpdate}
						<CircleCheck class="size-4 text-green-500" />
					{:else if updateInfo.updateType === 'digest'}
						<CircleArrowUp class="size-4 text-blue-500" />
					{:else}
						<CircleFadingArrowUp class="size-4 text-yellow-500" />
					{/if}
				</span>
			</Tooltip.Trigger>
			<Tooltip.Content
				side="right"
				class="bg-popover text-popover-foreground border-border tooltip-with-arrow relative max-w-[280px] border p-4 shadow-lg"
				align="center"
			>
				<div class="space-y-3">
					<div class="border-border flex items-center gap-3 border-b pb-2">
						{#if !updateInfo.hasUpdate}
							<div
								class="flex h-8 w-8 items-center justify-center rounded-full border border-green-500/20 bg-green-500/10"
							>
								<CircleCheck class="size-5 text-green-500" />
							</div>
							<div>
								<div class="text-sm font-semibold">Up to Date</div>
								<div class="text-muted-foreground text-xs">No updates available</div>
							</div>
						{:else if updateInfo.updateType === 'digest'}
							<div
								class="flex h-8 w-8 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10"
							>
								<CircleArrowUp class="size-5 text-blue-500" />
							</div>
							<div>
								<div class="text-sm font-semibold">Digest Update</div>
								<div class="text-xs text-blue-600 dark:text-blue-400">
									Security or bug fixes available
								</div>
							</div>
						{:else}
							<div
								class="flex h-8 w-8 items-center justify-center rounded-full border border-yellow-500/20 bg-yellow-500/10"
							>
								<CircleFadingArrowUp class="size-5 text-yellow-500" />
							</div>
							<div>
								<div class="text-sm font-semibold">Version Update</div>
								<div class="text-xs text-yellow-600 dark:text-yellow-400">
									New version available
								</div>
							</div>
						{/if}
					</div>

					<div class="grid gap-2 text-xs">
						<div class="flex items-center justify-between">
							<div class="text-muted-foreground flex items-center gap-1.5">
								<Package class="size-3" />
								<span>Current</span>
							</div>
							<span class="font-mono font-medium">{displayCurrentVersion()}</span>
						</div>

						{#if updateInfo.hasUpdate && displayLatestVersion()}
							<div class="flex items-center justify-between">
								<div class="text-muted-foreground flex items-center gap-1.5">
									<ArrowRight class="size-3" />
									<span>{updateInfo.updateType === 'digest' ? 'Latest Digest' : 'Latest'}</span>
								</div>
								<span class="font-mono font-medium text-blue-600 dark:text-blue-400">
									{displayLatestVersion()}
								</span>
							</div>
						{/if}

						<div class="flex items-center justify-between">
							<div class="text-muted-foreground flex items-center gap-1.5">
								<Calendar class="size-3" />
								<span>Checked</span>
							</div>
							<span class="font-medium">{formatDate(updateInfo.checkTime)}</span>
						</div>

						<div class="flex items-center justify-between">
							<div class="text-muted-foreground flex items-center gap-1.5">
								<Clock class="size-3" />
								<span>Type</span>
							</div>
							<span class="font-medium capitalize">
								{updateInfo.updateType || 'Unknown'}
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

					<div class="border-border border-t pt-2">
						<div class="text-muted-foreground text-xs leading-relaxed">
							{priority.description}
						</div>
					</div>

					{#if canCheckUpdate}
						<div class="border-border border-t pt-2">
							<button
								onclick={checkImageUpdate}
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
					{#if canCheckUpdate}
						<button
							onclick={checkImageUpdate}
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
							{#if canCheckUpdate}
								Click to check for updates from registry.
							{:else}
								Unable to check updates for images without proper tags.
							{/if}
						</div>
					</div>
				</div>
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
{/if}
