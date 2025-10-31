<script lang="ts">
	import { ResponsiveDialog } from '$lib/components/ui/responsive-dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge';
	import { CopyButton } from '$lib/components/ui/copy-button';
	import ServerIcon from '@lucide/svelte/icons/server';
	import CpuIcon from '@lucide/svelte/icons/cpu';
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import type { DockerInfo } from '$lib/types/docker-info.type';
	import { m } from '$lib/paraglide/messages';
	import bytes from 'bytes';

	interface Props {
		open: boolean;
		dockerInfo: DockerInfo | null;
	}

	let { open = $bindable(), dockerInfo }: Props = $props();

	const shortGitCommit = $derived(dockerInfo?.gitCommit?.slice(0, 8) ?? '-');
	const formattedMemory = $derived(dockerInfo?.memTotal ? bytes.format(dockerInfo.memTotal) : '-');

	function handleClose() {
		open = false;
	}
</script>

<ResponsiveDialog
	bind:open
	title={m.docker_info_dialog_title()}
	description={m.docker_info_dialog_description()}
	contentClass="sm:max-w-[720px]"
>
	{#snippet children()}
		<div class="space-y-6 pt-4">
			{@render versionSection()}
			{@render systemSection()}
			{@render driversSection()}
			{@render statsSection()}
		</div>
	{/snippet}

	{#snippet footer()}
		<Button variant="outline" onclick={handleClose}>
			{m.common_close()}
		</Button>
	{/snippet}
</ResponsiveDialog>

{#snippet versionSection()}
	<div>
		<h3 class="mb-3 flex items-center gap-2 text-sm font-semibold">
			<ServerIcon class="size-4" />
			{m.docker_info_version_section()}
		</h3>
		<div class="space-y-2 rounded-lg border p-3">
			{@render infoRow(m.docker_info_version_label(), dockerInfo?.version)}
			{@render infoRow(m.docker_info_api_version_label(), dockerInfo?.apiVersion)}
			{@render infoRow(m.docker_info_server_version_label(), dockerInfo?.serverVersion)}
			<div class="flex items-center justify-between gap-4">
				<span class="text-muted-foreground text-xs">{m.docker_info_git_commit_label()}</span>
				<div class="flex items-center gap-2">
					<code class="bg-muted rounded px-1.5 py-0.5 text-xs">{shortGitCommit}</code>
					{#if dockerInfo?.gitCommit}
						<CopyButton text={dockerInfo.gitCommit} size="icon" class="size-7" title="Copy full commit hash" />
					{/if}
				</div>
			</div>
			{@render infoRow(m.docker_info_go_version_label(), dockerInfo?.goVersion)}
			{@render infoRow(m.docker_info_build_time_label(), dockerInfo?.buildTime, false)}
		</div>
	</div>
{/snippet}

{#snippet systemSection()}
	<div>
		<h3 class="mb-3 flex items-center gap-2 text-sm font-semibold">
			<CpuIcon class="size-4" />
			{m.docker_info_system_section()}
		</h3>
		<div class="grid gap-3 sm:grid-cols-2">
			<div class="rounded-lg border p-3">
				<div class="text-muted-foreground mb-2 text-xs">{m.docker_info_os_label()}</div>
				<div class="text-sm font-medium">{dockerInfo?.operatingSystem ?? '-'}</div>
				<div class="text-muted-foreground mt-1 text-xs">
					{dockerInfo?.os ?? '-'}
					{dockerInfo?.osVersion ? `· ${dockerInfo.osVersion}` : ''}
				</div>
			</div>
			<div class="rounded-lg border p-3">
				<div class="text-muted-foreground mb-2 text-xs">{m.common_architecture()}</div>
				<Badge class="mt-1">{dockerInfo?.architecture ?? '-'}</Badge>
			</div>
			<div class="rounded-lg border p-3">
				<div class="text-muted-foreground mb-2 text-xs">{m.docker_info_kernel_version_label()}</div>
				<code class="text-sm">{dockerInfo?.kernelVersion ?? '-'}</code>
			</div>
			<div class="rounded-lg border p-3">
				<div class="text-muted-foreground mb-2 text-xs">{m.common_cpus()}</div>
				<div class="flex items-center gap-2">
					<Badge variant="secondary" class="text-base">{dockerInfo?.cpus ?? 0}</Badge>
					<span class="text-muted-foreground text-xs">cores</span>
				</div>
			</div>
			<div class="rounded-lg border p-3 sm:col-span-2">
				<div class="text-muted-foreground mb-2 text-xs">{m.docker_info_memory_label()}</div>
				<Badge variant="secondary" class="text-base">{formattedMemory}</Badge>
			</div>
		</div>
	</div>
{/snippet}

{#snippet driversSection()}
	<div>
		<h3 class="mb-3 flex items-center gap-2 text-sm font-semibold">
			<HardDriveIcon class="size-4" />
			{m.docker_info_drivers_section()}
		</h3>
		<div class="space-y-2 rounded-lg border p-3">
			<div class="flex items-center justify-between gap-4">
				<span class="text-muted-foreground text-xs">{m.docker_info_storage_driver_label()}</span>
				<Badge variant="outline">{dockerInfo?.storageDriver ?? '-'}</Badge>
			</div>
			{@render infoRow(m.docker_info_logging_driver_label(), dockerInfo?.loggingDriver, false)}
			{@render infoRow(m.docker_info_cgroup_driver_label(), dockerInfo?.cgroupDriver, false)}
			{@render infoRow(m.docker_info_cgroup_version_label(), dockerInfo?.cgroupVersion, false)}
		</div>
	</div>
{/snippet}

{#snippet statsSection()}
	<div>
		<h3 class="mb-3 text-sm font-semibold">{m.docker_info_stats_section()}</h3>
		<div class="space-y-3">
			<div class="grid gap-3 sm:grid-cols-3">
				{@render statCard(m.common_running(), dockerInfo?.containersRunning ?? 0, 'emerald')}
				{@render statCard(m.docker_info_paused_label(), dockerInfo?.containersPaused ?? 0, 'amber')}
				{@render statCard(m.common_stopped(), dockerInfo?.containersStopped ?? 0, 'red')}
			</div>
			<div class="grid gap-3 sm:grid-cols-2">
				{@render statCard(m.docker_info_total_containers_label(), dockerInfo?.containers ?? 0, 'neutral')}
				{@render statCard(m.docker_info_images_label(), dockerInfo?.images ?? 0, 'neutral', true)}
			</div>
		</div>
	</div>
{/snippet}

{#snippet statCard(label: string, value: number, color: 'emerald' | 'amber' | 'red' | 'neutral', outline: boolean = false)}
	{@const colors = {
		emerald: {
			bg: 'bg-emerald-500/5',
			badge: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
		},
		amber: {
			bg: 'bg-amber-500/5',
			badge: 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300'
		},
		red: {
			bg: 'bg-red-500/5',
			badge: 'border-red-500/30 bg-red-500/15 text-red-600 dark:text-red-300'
		},
		neutral: {
			bg: '',
			badge: ''
		}
	}}
	<div class="rounded-lg border p-3 {colors[color].bg}">
		<div class="text-muted-foreground mb-2 text-xs">{label}</div>
		{#if color === 'neutral'}
			<div class="text-2xl font-semibold tabular-nums">{value}</div>
		{:else}
			<Badge variant={outline ? 'outline' : undefined} class="{colors[color].badge} text-lg">
				{value}
			</Badge>
		{/if}
	</div>
{/snippet}

{#snippet infoRow(label: string, value: string | undefined, mono: boolean = true)}
	<div class="flex items-center justify-between gap-4">
		<span class="text-muted-foreground text-xs">{label}</span>
		<span class="text-sm {mono ? 'font-mono' : ''}">{value ?? '-'}</span>
	</div>
{/snippet}
