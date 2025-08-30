<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import CircleFadingArrowUpIcon from '@lucide/svelte/icons/circle-fading-arrow-up';
	import CircleArrowUpIcon from '@lucide/svelte/icons/circle-arrow-up';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import PackageIcon from '@lucide/svelte/icons/package';
	import { imageUpdateAPI } from '$lib/services/api';
	import { toast } from 'svelte-sonner';
	import type { ImageUpdateData } from '$lib/services/api/image-update-api-service';

	interface Props {
		updateInfo?: ImageUpdateData | undefined;
		isLoadingInBackground?: boolean;
		imageId: string;
		repo?: string;
		tag?: string;
		onUpdated?: (data: ImageUpdateData) => void;
	}

	let { updateInfo = undefined, isLoadingInBackground = false, imageId, repo, tag, onUpdated }: Props = $props();

	let localUpdateInfo = $state<ImageUpdateData | undefined>(updateInfo);
	let isChecking = $state(false);

	$effect(() => {
		localUpdateInfo = updateInfo;
	});

	const canCheckUpdate = $derived(repo && tag && repo !== '<none>' && tag !== '<none>');

	const displayCurrentVersion = $derived(() => {
		if (localUpdateInfo?.currentVersion && localUpdateInfo.currentVersion.trim() !== '') {
			return localUpdateInfo.currentVersion;
		}
		return tag || 'Unknown';
	});

	const displayLatestVersion = $derived(() => {
		if (localUpdateInfo?.latestVersion && localUpdateInfo.latestVersion.trim() !== '') {
			return localUpdateInfo.latestVersion;
		}
		if (localUpdateInfo?.updateType === 'digest' && localUpdateInfo?.latestDigest) {
			return localUpdateInfo.latestDigest.slice(7, 19) + '...';
		}
		return null;
	});

	async function checkImageUpdate() {
		if (!canCheckUpdate || isChecking) return;

		isChecking = true;
		try {
			const result = await imageUpdateAPI.checkImageUpdateByID(imageId);
			if (result && !result.error) {
				localUpdateInfo = result;
				onUpdated?.(result);
				toast.success('Update check completed');
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

	function getUpdatePriority(u: ImageUpdateData): {
		level: string;
		color: string;
		description: string;
	} {
		if (!u.hasUpdate) return { level: 'None', color: 'text-green-500', description: 'Image is up to date' };
		if (u.updateType === 'digest')
			return {
				level: 'Security/Bug Fix',
				color: 'text-blue-500',
				description: 'Digest update - likely security or bug fixes'
			};
		if (u.updateType === 'tag') {
			let description = 'Update available';
			if (u.latestVersion) description = `Update to ${u.latestVersion} available`;
			return { level: 'Version Update', color: 'text-yellow-500', description };
		}
		return { level: 'Unknown', color: 'text-gray-500', description: 'Update type unknown' };
	}
</script>

{#if localUpdateInfo}
	{@const priority = getUpdatePriority(localUpdateInfo)}
	<Tooltip.Provider>
		<Tooltip.Root>
			<Tooltip.Trigger>
				<span class="mr-2 inline-flex size-4 items-center justify-center align-middle">
					{#if !localUpdateInfo.hasUpdate}
						<CircleCheckIcon class="size-4 text-green-500" />
					{:else if localUpdateInfo.updateType === 'digest'}
						<CircleArrowUpIcon class="size-4 text-blue-500" />
					{:else}
						<CircleFadingArrowUpIcon class="size-4 text-yellow-500" />
					{/if}
				</span>
			</Tooltip.Trigger>
			<Tooltip.Content
				side="right"
				class="tooltip-with-arrow relative max-w-[280px] rounded-xl border border-gray-200/50 bg-white/95 p-0 shadow-2xl shadow-black/10 backdrop-blur-sm dark:border-gray-800/50 dark:bg-gray-950/95 dark:shadow-black/30"
				align="center"
			>
				<div class="overflow-hidden rounded-xl">
					{#if !localUpdateInfo.hasUpdate}
						<!-- Success State -->
						<div class="bg-gradient-to-br from-emerald-50 to-green-50/30 p-4 dark:from-emerald-950/20 dark:to-green-950/10">
							<div class="flex items-center gap-3">
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-500 shadow-lg shadow-emerald-500/25"
								>
									<CircleCheckIcon class="size-5 text-white" />
								</div>
								<div>
									<div class="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Up to Date</div>
									<div class="text-xs text-emerald-700/80 dark:text-emerald-300/80">No updates available</div>
								</div>
							</div>
						</div>
						<div class="bg-white/90 p-4 dark:bg-gray-950/90">
							<div class="text-center">
								<div class="mb-2 text-xs text-gray-600 dark:text-gray-400">
									Running <span class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs font-medium dark:bg-gray-800"
										>{displayCurrentVersion()}</span
									>
								</div>
								<div class="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
									This image is running the latest available version.
								</div>
							</div>
						</div>
					{:else if localUpdateInfo.updateType === 'digest'}
						<!-- Digest Update State -->
						<div class="bg-gradient-to-br from-blue-50 to-cyan-50/30 p-4 dark:from-blue-950/20 dark:to-cyan-950/10">
							<div class="flex items-center gap-3">
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/25"
								>
									<CircleArrowUpIcon class="size-5 text-white" />
								</div>
								<div>
									<div class="text-sm font-semibold text-blue-900 dark:text-blue-100">Digest Update</div>
									<div class="text-xs text-blue-700/80 dark:text-blue-300/80">Security or bug fixes available</div>
								</div>
							</div>
						</div>
						<div class="bg-white/90 p-4 dark:bg-gray-950/90">
							<div class="space-y-3">
								<div class="space-y-2 text-xs">
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
											<PackageIcon class="size-3" />
											<span>Current</span>
										</div>
										<span class="rounded bg-gray-100 px-1.5 py-0.5 font-mono font-medium dark:bg-gray-800"
											>{displayCurrentVersion()}</span
										>
									</div>
									{#if displayLatestVersion()}
										<div class="flex items-center justify-between">
											<div class="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
												<ArrowRightIcon class="size-3" />
												<span>Latest Digest</span>
											</div>
											<span
												class="rounded bg-blue-100 px-1.5 py-0.5 font-mono font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
											>
												{displayLatestVersion()}
											</span>
										</div>
									{/if}
								</div>
								<div class="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
									<div class="text-center text-xs font-medium leading-relaxed text-blue-700 dark:text-blue-300">
										{priority.description}
									</div>
								</div>
							</div>
						</div>
					{:else}
						<!-- Version Update State -->
						<div class="bg-gradient-to-br from-amber-50 to-yellow-50/30 p-4 dark:from-amber-950/20 dark:to-yellow-950/10">
							<div class="flex items-center gap-3">
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 shadow-lg shadow-amber-500/25"
								>
									<CircleFadingArrowUpIcon class="size-5 text-white" />
								</div>
								<div>
									<div class="text-sm font-semibold text-amber-900 dark:text-amber-100">Version Update</div>
									<div class="text-xs text-amber-700/80 dark:text-amber-300/80">New version available</div>
								</div>
							</div>
						</div>
						<div class="bg-white/90 p-4 dark:bg-gray-950/90">
							<div class="space-y-3">
								<div class="space-y-2 text-xs">
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
											<PackageIcon class="size-3" />
											<span>Current</span>
										</div>
										<span class="rounded bg-gray-100 px-1.5 py-0.5 font-mono font-medium dark:bg-gray-800"
											>{displayCurrentVersion()}</span
										>
									</div>
									{#if displayLatestVersion()}
										<div class="flex items-center justify-between">
											<div class="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
												<ArrowRightIcon class="size-3" />
												<span>Latest</span>
											</div>
											<span
												class="rounded bg-amber-100 px-1.5 py-0.5 font-mono font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
											>
												{displayLatestVersion()}
											</span>
										</div>
									{/if}
								</div>
								<div class="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
									<div class="text-center text-xs font-medium leading-relaxed text-amber-700 dark:text-amber-300">
										{priority.description}
									</div>
								</div>
							</div>
						</div>
					{/if}

					{#if canCheckUpdate}
						<div class="border-t border-gray-200/50 bg-gray-50/50 p-3 dark:border-gray-800/50 dark:bg-gray-900/50">
							<button
								onclick={checkImageUpdate}
								disabled={isChecking}
								class="group flex w-full items-center justify-center gap-2 rounded-lg bg-white/80 px-3 py-2 text-xs font-medium text-gray-700 shadow-sm transition-all hover:bg-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800/80 dark:text-gray-300 dark:hover:bg-gray-800"
							>
								{#if isChecking}
									<LoaderCircleIcon class="size-3 animate-spin" />
									Checking...
								{:else}
									<RefreshCwIcon class="size-3 transition-transform group-hover:rotate-45" />
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
					<LoaderCircleIcon class="size-4 animate-spin text-blue-400" />
				</span>
			</Tooltip.Trigger>
			<Tooltip.Content
				side="right"
				class="tooltip-with-arrow relative max-w-[220px] rounded-xl border border-gray-200/50 bg-white/95 p-0 shadow-2xl shadow-black/10 backdrop-blur-sm dark:border-gray-800/50 dark:bg-gray-950/95 dark:shadow-black/30"
				align="center"
			>
				<div class="overflow-hidden rounded-xl">
					<div class="bg-gradient-to-br from-blue-50 to-cyan-50/30 p-4 dark:from-blue-950/20 dark:to-cyan-950/10">
						<div class="flex items-center gap-3">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/25"
							>
								<LoaderCircleIcon class="size-5 animate-spin text-white" />
							</div>
							<div>
								<div class="text-sm font-semibold text-blue-900 dark:text-blue-100">Checking Updates</div>
								<div class="text-xs text-blue-700/80 dark:text-blue-300/80">Querying registry for latest version...</div>
							</div>
						</div>
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
								<LoaderCircleIcon class="h-2 w-2 animate-spin text-blue-400" />
							{:else}
								<div class="h-1.5 w-1.5 rounded-full bg-gray-400 transition-colors group-hover:bg-blue-400"></div>
							{/if}
						</button>
					{:else}
						<div class="flex h-4 w-4 items-center justify-center rounded-full border-2 border-dashed border-gray-400 opacity-30">
							<div class="h-1.5 w-1.5 rounded-full bg-gray-400"></div>
						</div>
					{/if}
				</span>
			</Tooltip.Trigger>
			<Tooltip.Content
				side="right"
				class="tooltip-with-arrow relative max-w-[240px] rounded-xl border border-gray-200/50 bg-white/95 p-0 shadow-2xl shadow-black/10 backdrop-blur-sm dark:border-gray-800/50 dark:bg-gray-950/95 dark:shadow-black/30"
				align="center"
			>
				<div class="overflow-hidden rounded-xl">
					<div class="bg-gradient-to-br from-gray-50 to-slate-50/30 p-4 dark:from-gray-900/20 dark:to-slate-900/10">
						<div class="flex items-center gap-3">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gray-400 to-slate-500 shadow-lg shadow-gray-400/25"
							>
								<TriangleAlertIcon class="size-5 text-white" />
							</div>
							<div>
								<div class="text-sm font-semibold text-gray-900 dark:text-gray-100">Status Unknown</div>
								<div class="text-xs text-gray-700/80 dark:text-gray-300/80">
									{#if canCheckUpdate}
										Click to check for updates from registry.
									{:else}
										Unable to check updates for images without proper tags.
									{/if}
								</div>
							</div>
						</div>
					</div>
				</div>
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
{/if}
