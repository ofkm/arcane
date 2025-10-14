<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge';
	import InfoIcon from '@lucide/svelte/icons/info';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import ServerIcon from '@lucide/svelte/icons/server';
	import CpuIcon from '@lucide/svelte/icons/cpu';
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import type { DockerInfo } from '$lib/types/docker-info.type';
	import { UseClipboard } from '$lib/hooks/use-clipboard.svelte';
	import { m } from '$lib/paraglide/messages';
	import bytes from 'bytes';

	interface Props {
		open: boolean;
		dockerInfo: DockerInfo | null;
	}

	let { open = $bindable(), dockerInfo }: Props = $props();

	const clipboard = new UseClipboard();

	const shortGitCommit = $derived(dockerInfo?.gitCommit?.slice(0, 8) ?? '-');
	const formattedMemory = $derived(dockerInfo?.memTotal ? bytes.format(dockerInfo.memTotal) : '-');

	function handleCopy(text?: string) {
		if (!text) return;
		clipboard.copy(text);
	}

	function handleClose() {
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="flex max-h-[90vh] flex-col sm:max-w-[720px]">
		<Dialog.Header class="flex-shrink-0 border-b pb-3">
			<Dialog.Title class="flex items-center gap-2">
				<InfoIcon class="size-5 text-blue-500" />
				{m.docker_info_dialog_title()}
			</Dialog.Title>
			<Dialog.Description>{m.docker_info_dialog_description()}</Dialog.Description>
		</Dialog.Header>

		<div class="min-h-0 flex-1 space-y-4 overflow-y-auto py-4">
			{@render versionSection()}
			{@render systemSection()}
			{@render driversSection()}
			{@render statsSection()}
		</div>

		<Dialog.Footer class="flex-shrink-0 border-t pt-3">
			<Button variant="outline" onclick={handleClose}>
				{m.common_close()}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

{#snippet versionSection()}
	<div>
		<h3 class="mb-2 flex items-center gap-2 text-sm font-semibold">
			<ServerIcon class="size-4" />
			{m.docker_info_version_section()}
		</h3>
		<div class="bg-muted/50 space-y-1.5 rounded-lg p-3">
			<div class="flex items-center justify-between">
				<span class="text-muted-foreground text-sm">{m.docker_info_version_label()}</span>
				<Badge variant="outline">{dockerInfo?.version ?? '-'}</Badge>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-muted-foreground text-sm">{m.docker_info_api_version_label()}</span>
				<span class="font-mono text-sm">{dockerInfo?.apiVersion ?? '-'}</span>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-muted-foreground text-sm">{m.docker_info_server_version_label()}</span>
				<span class="font-mono text-sm">{dockerInfo?.serverVersion ?? '-'}</span>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-muted-foreground text-sm">{m.docker_info_git_commit_label()}</span>
				<div class="flex items-center gap-2">
					<span class="font-mono text-sm">{shortGitCommit}</span>
					{#if dockerInfo?.gitCommit}
						<Button variant="ghost" size="icon" class="size-6" onclick={() => handleCopy(dockerInfo?.gitCommit)}>
							<CopyIcon class="size-3" />
						</Button>
					{/if}
				</div>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-muted-foreground text-sm">{m.docker_info_go_version_label()}</span>
				<span class="font-mono text-sm">{dockerInfo?.goVersion ?? '-'}</span>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-muted-foreground text-sm">{m.docker_info_build_time_label()}</span>
				<span class="text-sm">{dockerInfo?.buildTime ?? '-'}</span>
			</div>
		</div>
	</div>
{/snippet}

{#snippet systemSection()}
	<div>
		<h3 class="mb-2 flex items-center gap-2 text-sm font-semibold">
			<CpuIcon class="size-4" />
			{m.docker_info_system_section()}
		</h3>
		<div class="bg-muted/50 space-y-1.5 rounded-lg p-3">
			<div class="flex items-center justify-between">
				<span class="text-muted-foreground text-sm">{m.docker_info_os_label()}</span>
				<span class="font-mono text-sm">{dockerInfo?.operatingSystem ?? '-'}</span>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-muted-foreground text-sm">{m.docker_info_os_type_label()}</span>
				<span class="text-sm">{dockerInfo?.os ?? '-'}</span>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-muted-foreground text-sm">{m.docker_info_os_version_label()}</span>
				<span class="font-mono text-sm">{dockerInfo?.osVersion ?? '-'}</span>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-muted-foreground text-sm">{m.common_architecture()}</span>
				<Badge>{dockerInfo?.architecture ?? '-'}</Badge>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-muted-foreground text-sm">{m.docker_info_kernel_version_label()}</span>
				<span class="font-mono text-sm">{dockerInfo?.kernelVersion ?? '-'}</span>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-muted-foreground text-sm">{m.common_cpus()}</span>
				<Badge variant="secondary">{dockerInfo?.cpus ?? 0}</Badge>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-muted-foreground text-sm">{m.docker_info_memory_label()}</span>
				<Badge variant="secondary">{formattedMemory}</Badge>
			</div>
		</div>
	</div>
{/snippet}

{#snippet driversSection()}
	<div>
		<h3 class="mb-2 flex items-center gap-2 text-sm font-semibold">
			<HardDriveIcon class="size-4" />
			{m.docker_info_drivers_section()}
		</h3>
		<div class="bg-muted/50 space-y-1.5 rounded-lg p-3">
			<div class="flex items-center justify-between">
				<span class="text-muted-foreground text-sm">{m.docker_info_storage_driver_label()}</span>
				<Badge variant="outline">{dockerInfo?.storageDriver ?? '-'}</Badge>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-muted-foreground text-sm">{m.docker_info_logging_driver_label()}</span>
				<span class="text-sm">{dockerInfo?.loggingDriver ?? '-'}</span>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-muted-foreground text-sm">{m.docker_info_cgroup_driver_label()}</span>
				<span class="text-sm">{dockerInfo?.cgroupDriver ?? '-'}</span>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-muted-foreground text-sm">{m.docker_info_cgroup_version_label()}</span>
				<span class="text-sm">{dockerInfo?.cgroupVersion ?? '-'}</span>
			</div>
		</div>
	</div>
{/snippet}

{#snippet statsSection()}
	<div>
		<h3 class="mb-2 text-sm font-semibold">{m.docker_info_stats_section()}</h3>
		<div class="bg-muted/50 space-y-1.5 rounded-lg p-3">
			<div class="flex items-center justify-between">
				<span class="text-muted-foreground text-sm">{m.docker_info_total_containers_label()}</span>
				<Badge variant="secondary">{dockerInfo?.containers ?? 0}</Badge>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-muted-foreground text-sm">{m.common_running()}</span>
				<Badge class="border-emerald-500/30 bg-emerald-500/15 text-emerald-600">
					{dockerInfo?.containersRunning ?? 0}
				</Badge>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-muted-foreground text-sm">{m.docker_info_paused_label()}</span>
				<Badge class="border-amber-500/30 bg-amber-500/15 text-amber-600">
					{dockerInfo?.containersPaused ?? 0}
				</Badge>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-muted-foreground text-sm">{m.common_stopped()}</span>
				<Badge variant="outline">{dockerInfo?.containersStopped ?? 0}</Badge>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-muted-foreground text-sm">{m.docker_info_images_label()}</span>
				<Badge variant="outline">{dockerInfo?.images ?? 0}</Badge>
			</div>
		</div>
	</div>
{/snippet}
