<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import UpdateScheduleEditor from '$lib/components/update-schedule-editor.svelte';
	import SettingsSection from '$lib/components/settings/settings-section.svelte';
	import { m } from '$lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import { projectService } from '$lib/services/project-service';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import SaveIcon from '@lucide/svelte/icons/save';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import settingsStore from '$lib/stores/config-store';
	import type { Project, ProjectSettingsUpdate } from '$lib/types/project.type';
	import { z } from 'zod/v4';
	import { createForm } from '$lib/utils/form.utils';

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
				startTime: z.string(),
				endTime: z.string(),
				timezone: z.string()
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

	const updateSettingsDescription = $derived(() => {
		if (isOverrideEnabled) {
			return m.project_settings_overridden();
		}
		// Derive mode from global settings
		const autoUpdate = globalSettings?.autoUpdate ?? false;
		const scheduleEnabled = globalSettings?.updateScheduleEnabled ?? false;
		const mode = !autoUpdate
			? m.update_schedule_mode_never()
			: scheduleEnabled
				? m.update_schedule_mode_scheduled()
				: m.update_schedule_mode_immediate();
		return `Global: ${mode}`;
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
			toast.error('Please check the form for errors');
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
				<Card.Title>{m.docker_auto_updates_title()}</Card.Title>
				<Card.Description>{m.project_settings_description()}</Card.Description>
			</div>
		</Card.Header>
		<Card.Content class="space-y-6 px-3 py-4 sm:px-6">
			{#if globalSettings?.pollingEnabled}
				<SettingsSection
					title={m.update_schedule_title()}
					description={updateSettingsDescription()}
					icon={ClockIcon}
					isOverridden={isOverrideEnabled}
					{isLoading}
					onClearOverride={clearOverride}
					onEnableOverride={enableOverride}
				>
					{#snippet children()}
						<UpdateScheduleEditor
							bind:autoUpdate={$formInputs.autoUpdate.value}
							bind:scheduleEnabled={$formInputs.updateScheduleEnabled.value}
							bind:windows={$formInputs.updateScheduleWindows.value}
						/>
					{/snippet}
				</SettingsSection>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
