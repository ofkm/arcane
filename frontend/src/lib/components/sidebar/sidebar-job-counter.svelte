<script lang="ts">
	import { jobService } from '$lib/services/job-service';
	import type { JobStats, Job } from '$lib/types/job.type';
	import * as Popover from '$lib/components/ui/popover';
	import * as Button from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import ActivityIcon from '@lucide/svelte/icons/activity';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import XIcon from '@lucide/svelte/icons/x';
	import { onMount, onDestroy } from 'svelte';
	import { cn } from '$lib/utils';

	let { isCollapsed = false }: { isCollapsed?: boolean } = $props();

	let stats = $state<JobStats | null>(null);
	let activeJobs = $state<Job[]>([]);
	let isOpen = $state(false);
	let pollInterval: ReturnType<typeof setInterval> | null = null;

	async function fetchStats() {
		try {
			stats = await jobService.getStats();
			console.log('Job stats:', stats);
		} catch (error) {
			console.error('Failed to fetch job stats:', error);
		}
	}

	async function fetchActiveJobs() {
		if (!isOpen) return;
		try {
			const response = await jobService.getJobs({
				pagination: { page: 1, limit: 50 }
			});
			// Filter for pending and running jobs only
			activeJobs = response.data.filter((job) => job.status === 'pending' || job.status === 'running');
		} catch (error) {
			console.error('Failed to fetch active jobs:', error);
		}
	}

	async function cancelJob(jobId: number) {
		try {
			await jobService.cancelJob(jobId);
			await fetchActiveJobs();
			await fetchStats();
		} catch (error) {
			console.error('Failed to cancel job:', error);
		}
	}

	function getStatusIcon(status: string) {
		switch (status) {
			case 'running':
				return LoaderCircleIcon;
			case 'pending':
				return ClockIcon;
			case 'completed':
				return CheckCircle2Icon;
			case 'failed':
				return XCircleIcon;
			case 'cancelled':
			case 'cancelling':
				return AlertCircleIcon;
			default:
				return ActivityIcon;
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'running':
				return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
			case 'pending':
				return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
			case 'completed':
				return 'bg-green-500/10 text-green-500 border-green-500/20';
			case 'failed':
				return 'bg-red-500/10 text-red-500 border-red-500/20';
			case 'cancelled':
			case 'cancelling':
				return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
			default:
				return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
		}
	}

	function formatJobType(type: string): string {
		return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
	}

	function formatRelativeTime(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const seconds = Math.floor(diff / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		if (seconds < 60) return `${seconds}s ago`;
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		return `${Math.floor(hours / 24)}d ago`;
	}

	onMount(() => {
		fetchStats();
		pollInterval = setInterval(fetchStats, 3000);
	});

	onDestroy(() => {
		if (pollInterval) clearInterval(pollInterval);
	});

	$effect(() => {
		if (isOpen) {
			fetchActiveJobs();
			const interval = setInterval(fetchActiveJobs, 2000);
			return () => clearInterval(interval);
		}
	});

	const activeCount = $derived((stats?.pending ?? 0) + (stats?.running ?? 0));
	const hasActiveJobs = $derived(activeCount > 0);
</script>

<Popover.Root bind:open={isOpen}>
	<Popover.Trigger>
		<button
			class={cn(
				'flex h-9 w-full items-center gap-3 rounded-lg text-sm font-medium transition-colors',
				'hover:bg-accent hover:text-accent-foreground',
				hasActiveJobs ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground',
				isCollapsed ? 'justify-center px-0' : 'px-3'
			)}
		>
			<div class="relative flex items-center justify-center">
				<ActivityIcon size={18} class={hasActiveJobs ? 'animate-pulse' : ''} />
				{#if hasActiveJobs}
					<span
						class="ring-background absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white ring-1 dark:bg-blue-500"
					>
						{activeCount}
					</span>
				{/if}
			</div>
			{#if !isCollapsed}
				<span class="flex-1 text-left">Background Jobs</span>
				{#if hasActiveJobs}
					<Badge
						variant="secondary"
						class="h-5 border-blue-500/20 bg-blue-500/10 px-1.5 text-[10px] text-blue-600 dark:text-blue-400"
					>
						{activeCount}
					</Badge>
				{/if}
			{/if}
		</button>
	</Popover.Trigger>
	<Popover.Content class="w-[420px] p-0" side={isCollapsed ? 'right' : 'bottom'} align="start" sideOffset={8}>
		<div class="bg-muted/30 border-b px-4 py-3">
			<div class="flex items-center justify-between">
				<div>
					<h3 class="text-sm font-semibold">Background Jobs</h3>
					<p class="text-muted-foreground mt-0.5 text-xs">Monitor running tasks</p>
				</div>
				{#if stats && (stats.running > 0 || stats.pending > 0)}
					<Badge variant="secondary" class="border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400">
						<LoaderCircleIcon size={12} class="mr-1 animate-spin" />
						{stats.running + stats.pending} active
					</Badge>
				{/if}
			</div>
		</div>

		<div class="max-h-[400px] overflow-y-auto">
			{#if activeJobs.length === 0}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<div class="bg-muted/50 mb-3 rounded-full p-3">
						<ActivityIcon size={24} class="text-muted-foreground" />
					</div>
					<p class="text-muted-foreground text-sm font-medium">No active jobs</p>
					<p class="text-muted-foreground/70 mt-1 text-xs">All tasks have been completed</p>
				</div>
			{:else}
				<div class="divide-y">
					{#each activeJobs as job (job.id)}
						{@const StatusIcon = getStatusIcon(job.status)}
						<div class="hover:bg-muted/50 group p-4 transition-colors">
							<div class="flex items-start gap-3">
								<div
									class="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg {job.status === 'running'
										? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
										: job.status === 'pending'
											? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
											: 'bg-muted text-muted-foreground'}"
								>
									<StatusIcon size={16} class={job.status === 'running' ? 'animate-spin' : ''} />
								</div>
								<div class="min-w-0 flex-1">
									<div class="flex items-start justify-between gap-2">
										<div class="min-w-0 flex-1">
											<p class="truncate text-sm font-medium">{formatJobType(job.type)}</p>
											{#if job.message}
												<p class="text-muted-foreground mt-1 line-clamp-2 text-xs">{job.message}</p>
											{/if}
										</div>
										{#if job.status === 'running' || job.status === 'pending'}
											<Button.Root
												variant="ghost"
												size="icon"
												class="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-7 w-7 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
												onclick={() => cancelJob(job.id)}
											>
												<XIcon size={14} />
											</Button.Root>
										{/if}
									</div>
									<div class="text-muted-foreground mt-2 flex items-center gap-2 text-[10px]">
										<ClockIcon size={10} />
										<span>{formatRelativeTime(job.createdAt)}</span>
										{#if job.username}
											<span class="mx-1">•</span>
											<span class="font-medium">{job.username}</span>
										{/if}
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</Popover.Content>
</Popover.Root>
