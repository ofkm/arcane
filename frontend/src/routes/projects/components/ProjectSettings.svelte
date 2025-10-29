<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { m } from '$lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import { projectService } from '$lib/services/project-service';
	import SaveIcon from '@lucide/svelte/icons/save';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import InfoIcon from '@lucide/svelte/icons/info';
	import type { Project, ProjectLabelConfig } from '$lib/types/project.type';
	import { onMount } from 'svelte';

	interface Props {
		project: Project;
		onUpdate?: () => void;
	}

	let { project, onUpdate }: Props = $props();

	// Cron presets
	const cronPresets = [
		{ label: 'Immediate (no schedule)', value: '' },
		{ label: 'Daily at 2 AM', value: '0 2 * * *' },
		{ label: 'Weekdays at 2 AM', value: '0 2 * * 1-5' },
		{ label: 'Weekends at 2 AM', value: '0 2 * * 0,6' },
		{ label: 'Every 6 hours', value: '0 */6 * * *' }
	];

	let isLoading = $state(false);
	let hasChanges = $state(false);
	let autoUpdate = $state(true);
	let cronSchedule = $state('');
	let selectedPreset = $state('');
	let initialConfig: ProjectLabelConfig | null = $state(null);

	onMount(async () => {
		try {
			const config = await projectService.getProjectLabelConfig(project.id);
			autoUpdate = config.autoUpdate ?? true;
			cronSchedule = config.cronSchedule ?? '';
			selectedPreset = cronPresets.find((p) => p.value === cronSchedule)?.value ?? (cronSchedule ? 'custom' : '');
			initialConfig = { autoUpdate, cronSchedule };
		} catch (error) {
			console.error('Failed to load label config:', error);
			toast.error('Failed to load label configuration');
		}
	});

	$effect(() => {
		if (initialConfig) {
			hasChanges =
				autoUpdate !== initialConfig.autoUpdate ||
				cronSchedule !== initialConfig.cronSchedule;
		}
	});

	function selectPreset(preset: string) {
		if (preset === 'custom') {
			selectedPreset = 'custom';
			return;
		}
		selectedPreset = preset;
		cronSchedule = preset;
	}

	function resetForm() {
		if (initialConfig) {
			autoUpdate = initialConfig.autoUpdate ?? true;
			cronSchedule = initialConfig.cronSchedule ?? '';
			selectedPreset = cronPresets.find((p) => p.value === cronSchedule)?.value ?? (cronSchedule ? 'custom' : '');
		}
	}

	async function saveSettings() {
		isLoading = true;
		try {
			const config: ProjectLabelConfig = {
				autoUpdate,
				cronSchedule: cronSchedule || undefined
			};
			
			await projectService.updateProjectLabelConfig(project.id, config);
			initialConfig = { autoUpdate, cronSchedule };
			toast.success('Compose file updated successfully');
			onUpdate?.();
		} catch (error) {
			console.error('Failed to save settings:', error);
			toast.error('Failed to update labels');
		} finally {
			isLoading = false;
		}
	}

	function getCronDescription(cron: string): string {
		if (!cron) return 'Immediate (no schedule)';
		const preset = cronPresets.find((p) => p.value === cron);
		return preset ? preset.label : cron;
	}
</script>

<div class="space-y-6">
	<div class="flex justify-end gap-2">
		<Button variant="outline" size="sm" disabled={!hasChanges || isLoading} onclick={resetForm}>
			<RotateCcwIcon class="mr-2 h-4 w-4" />
			Reset
		</Button>
		<Button size="sm" disabled={!hasChanges || isLoading} onclick={saveSettings}>
			<SaveIcon class="mr-2 h-4 w-4" />
			Save
		</Button>
	</div>

	<Card.Root>
		<Card.Header>
			<div class="flex items-start justify-between">
				<div class="space-y-1">
					<Card.Title>Auto-Update Configuration</Card.Title>
					<Card.Description>Configure auto-update behavior via compose file labels. Changes are written to your compose file.</Card.Description>
				</div>
			</div>
		</Card.Header>
		<Card.Content class="space-y-6">
			<!-- Enable Auto-Updates -->
			<div class="flex items-center justify-between space-x-2">
				<div class="space-y-0.5">
					<Label for="auto-update">Enable Auto-Updates</Label>
					<p class="text-sm text-muted-foreground">Allow this project's containers to be automatically updated</p>
				</div>
				<Switch id="auto-update" bind:checked={autoUpdate} />
			</div>

			{#if autoUpdate}
				<!-- Cron Schedule -->
				<div class="space-y-3">
					<div class="space-y-1">
						<Label for="cron-schedule">Update Schedule (Cron)</Label>
						<p class="text-sm text-muted-foreground">Enter a cron expression or use quick presets below</p>
					</div>

					<!-- Preset Buttons -->
					<div class="flex flex-wrap gap-2">
						{#each cronPresets as preset}
							<Button
								variant={selectedPreset === preset.value ? 'default' : 'outline'}
								size="sm"
								onclick={() => selectPreset(preset.value)}
							>
								{preset.label}
							</Button>
						{/each}
						<Button
							variant={selectedPreset === 'custom' ? 'default' : 'outline'}
							size="sm"
							onclick={() => selectPreset('custom')}
						>
							Custom
						</Button>
					</div>

					<!-- Custom Cron Input -->
					{#if selectedPreset === 'custom' || (selectedPreset && !cronPresets.find((p) => p.value === selectedPreset))}
						<div class="space-y-2">
							<Input
								id="cron-schedule"
								bind:value={cronSchedule}
								placeholder="Enter cron expression (e.g., 0 2 * * *)"
								class="font-mono"
							/>
							{#if cronSchedule}
								<p class="text-sm text-muted-foreground">
									Updates will run: {getCronDescription(cronSchedule)}
								</p>
							{/if}
						</div>
					{:else if cronSchedule}
						<p class="text-sm text-muted-foreground">
							Updates will run: {getCronDescription(cronSchedule)}
						</p>
					{/if}
				</div>
			{/if}

			<!-- Redeploy Warning -->
			{#if hasChanges}
				<Alert.Root>
					<InfoIcon class="h-4 w-4" />
					<Alert.Title>Info</Alert.Title>
					<Alert.Description>
						Redeploy project to apply label changes to running containers
					</Alert.Description>
				</Alert.Root>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
