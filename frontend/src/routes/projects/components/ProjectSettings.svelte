<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import UpdateScheduleEditor from '$lib/components/update-schedule-editor.svelte';
	import { m } from '$lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import { projectService } from '$lib/services/project-service';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import SaveIcon from '@lucide/svelte/icons/save';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import settingsStore from '$lib/stores/config-store';
	import type { Project, ProjectSettingsUpdate } from '$lib/types/project.type';
	import { z } from 'zod/v4';
	import { createForm } from '$lib/utils/form.utils';
	import { cn } from '$lib/utils';

	interface Props {
		project: Project;
		onUpdate?: () => void;
	}

	let { project, onUpdate }: Props = $props();

	const globalSettings = $derived($settingsStore);

	const isUpdateSettingsOverridden = $derived(
		(project.autoUpdate !== null && project.autoUpdate !== undefined) ||
			(project.updateScheduleEnabled !== null && project.updateScheduleEnabled !== undefined)
	);

	const currentSettings = $derived({
		autoUpdate: project.autoUpdate ?? globalSettings?.autoUpdate ?? false,
		updateScheduleEnabled: project.updateScheduleEnabled ?? globalSettings?.updateScheduleEnabled ?? false,
		updateScheduleWindows: project.updateScheduleWindows ?? globalSettings?.updateScheduleWindows ?? []
	});

	const formSchema = z.object({
		autoUpdate: z.boolean(),
		updateScheduleEnabled: z.boolean(),
		updateScheduleWindows: z.array(
			z.object({
				days: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])),
				startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
				endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
				timezone: z.string().min(1)
			})
		)
	});

	let hasChanges = $state(false);
	let isLoading = $state(false);
	let isOverrideEnabled = $state(false);

	// Initialize override state
	$effect(() => {
		isOverrideEnabled = isUpdateSettingsOverridden;
	});

	let { inputs: formInputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, currentSettings));
	const formHasChanges = $derived(
		(!isOverrideEnabled && isUpdateSettingsOverridden) ||
			(isOverrideEnabled && !isUpdateSettingsOverridden) ||
			(isOverrideEnabled &&
				($formInputs.autoUpdate.value !== currentSettings.autoUpdate ||
					$formInputs.updateScheduleEnabled.value !== currentSettings.updateScheduleEnabled ||
					JSON.stringify($formInputs.updateScheduleWindows.value) !== JSON.stringify(currentSettings.updateScheduleWindows)))
	);

	$effect(() => {
		hasChanges = formHasChanges;
	});

	const globalSettingsDescription = $derived(() => {
		const autoUpdate = globalSettings?.autoUpdate ?? false;
		const scheduleEnabled = globalSettings?.updateScheduleEnabled ?? false;
		const mode = !autoUpdate
			? m.update_schedule_mode_never()
			: scheduleEnabled
				? m.update_schedule_mode_scheduled()
				: m.update_schedule_mode_immediate();
		return mode;
	});

	function enableOverride() {
		isOverrideEnabled = true;
		$formInputs.autoUpdate.value = globalSettings?.autoUpdate ?? false;
		$formInputs.updateScheduleEnabled.value = globalSettings?.updateScheduleEnabled ?? false;
		$formInputs.updateScheduleWindows.value = globalSettings?.updateScheduleWindows ?? [];
	}

	function clearOverride() {
		isOverrideEnabled = false;
		$formInputs.autoUpdate.value = globalSettings?.autoUpdate ?? false;
		$formInputs.updateScheduleEnabled.value = globalSettings?.updateScheduleEnabled ?? false;
		$formInputs.updateScheduleWindows.value = globalSettings?.updateScheduleWindows ?? [];
	}

	function resetForm() {
		isOverrideEnabled = isUpdateSettingsOverridden;
		$formInputs.autoUpdate.value = currentSettings.autoUpdate;
		$formInputs.updateScheduleEnabled.value = currentSettings.updateScheduleEnabled;
		$formInputs.updateScheduleWindows.value = currentSettings.updateScheduleWindows;
	}

	async function saveSettings() {
		const formData = form.validate();
		if (!formData) {
			toast.error(m.project_settings_validation_error());
			return;
		}

		isLoading = true;
		try {
			const clearPromises: Promise<void>[] = [];

			// Clear overrides if switching back to global
			if (!isOverrideEnabled && isUpdateSettingsOverridden) {
				clearPromises.push(
					projectService.clearProjectSettingOverride(project.id, 'autoUpdate'),
					projectService.clearProjectSettingOverride(project.id, 'updateScheduleEnabled'),
					projectService.clearProjectSettingOverride(project.id, 'updateScheduleWindows')
				);
			}

			if (clearPromises.length > 0) {
				await Promise.all(clearPromises);
			}

			// Save new override values if enabled
			if (isOverrideEnabled) {
				const updates: ProjectSettingsUpdate = {
					autoUpdate: formData.autoUpdate,
					updateScheduleEnabled: formData.updateScheduleEnabled,
					updateScheduleWindows: formData.updateScheduleWindows
				};
				await projectService.updateProjectSettings(project.id, updates);
			}

			toast.success(m.project_settings_save_success());
			onUpdate?.();
		} catch (error) {
			console.error('Failed to save settings:', error);
			toast.error(m.project_settings_save_error());
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="space-y-6">
	<div class="flex justify-end gap-2">
		<Button size="sm" variant="outline" onclick={resetForm} disabled={isLoading || !hasChanges}>
			<RotateCcwIcon class="mr-2 size-4" />
			{m.common_reset()}
		</Button>
		<Button size="sm" onclick={saveSettings} disabled={isLoading || !hasChanges}>
			<SaveIcon class="mr-2 size-4" />
			{m.common_save()}
		</Button>
	</div>

	<Card.Root>
		<Card.Header icon={RefreshCwIcon}>
			<div class="flex flex-col space-y-1.5">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<Card.Title>{m.docker_auto_updates_title()}</Card.Title>
					{#if globalSettings?.pollingEnabled}
						<div class="bg-muted/30 flex items-center gap-2 rounded-full border p-0.5">
							<button
								class={cn(
									'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all',
									!isOverrideEnabled
										? 'bg-primary text-primary-foreground shadow-sm'
										: 'text-muted-foreground hover:bg-background/50'
								)}
								onclick={clearOverride}
								title={m.project_settings_use_global()}
								type="button"
							>
								<GlobeIcon class="size-3" />
								<span>{m.common_global()}</span>
							</button>
							<button
								class={cn(
									'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all',
									isOverrideEnabled
										? 'bg-primary text-primary-foreground shadow-sm'
										: 'text-muted-foreground hover:bg-background/50'
								)}
								onclick={enableOverride}
								title={m.project_settings_use_project()}
								type="button"
							>
								<SettingsIcon class="size-3" />
								<span>{m.project_settings_project_label()}</span>
							</button>
						</div>
					{/if}
				</div>
				<Card.Description>
					{#if globalSettings?.pollingEnabled}
						{#if isOverrideEnabled}
							{m.project_settings_description()}
						{:else}
							Using global settings: <strong>{globalSettingsDescription()}</strong>
						{/if}
					{:else}
						{m.project_settings_description()}
					{/if}
				</Card.Description>
			</div>
		</Card.Header>
		{#if globalSettings?.pollingEnabled && isOverrideEnabled}
			<Card.Content class="p-4">
				<Card.Root variant="subtle">
					<Card.Content class="p-4">
						<UpdateScheduleEditor
							bind:autoUpdate={$formInputs.autoUpdate.value}
							bind:scheduleEnabled={$formInputs.updateScheduleEnabled.value}
							bind:windows={$formInputs.updateScheduleWindows.value}
						/>
					</Card.Content>
				</Card.Root>
			</Card.Content>
		{/if}
	</Card.Root>
</div>
