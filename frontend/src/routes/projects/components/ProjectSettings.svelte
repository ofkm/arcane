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
	import type { UpdateScheduleWindow } from '$lib/types/settings.type';

	interface Props {
		project: Project;
		onUpdate?: () => void;
	}

	let { project, onUpdate }: Props = $props();

	// Global settings (true defaults without project overrides)
	const globalSettings = $derived($settingsStore);

	// Check if settings are overridden (saved in DB as project-specific)
	// Now we check if either auto-update OR schedule settings are overridden
	const isUpdateSettingsOverridden = $derived(
		(project.autoUpdate !== null && project.autoUpdate !== undefined) ||
			(project.updateScheduleEnabled !== null && project.updateScheduleEnabled !== undefined)
	);

	let isLoading = $state(false);
	let localUpdateSettingsOverride = $state<boolean | null>(isUpdateSettingsOverridden ? true : null);
	let localAutoUpdate = $state<boolean>(project.autoUpdate ?? globalSettings?.autoUpdate ?? false);
	let localScheduleEnabled = $state<boolean>(project.updateScheduleEnabled ?? globalSettings?.updateScheduleEnabled ?? false);
	let localScheduleWindows = $state<UpdateScheduleWindow[]>(
		project.updateScheduleWindows ?? globalSettings?.updateScheduleWindows ?? []
	);

	// Check for unsaved changes
	const hasUpdateSettingsChanges = $derived(
		(localUpdateSettingsOverride !== null && !isUpdateSettingsOverridden) ||
			(localUpdateSettingsOverride === null && isUpdateSettingsOverridden) ||
			(localUpdateSettingsOverride !== null &&
				(localAutoUpdate !== (project.autoUpdate ?? globalSettings?.autoUpdate ?? false) ||
					localScheduleEnabled !== (project.updateScheduleEnabled ?? globalSettings?.updateScheduleEnabled ?? false) ||
					JSON.stringify(localScheduleWindows) !==
						JSON.stringify(project.updateScheduleWindows ?? globalSettings?.updateScheduleWindows ?? [])))
	);

	const hasAnyChanges = $derived(hasUpdateSettingsChanges);

	// Derived description for update settings section
	const updateSettingsDescription = $derived(() => {
		if (localUpdateSettingsOverride !== null) {
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
		localUpdateSettingsOverride = true;
		localAutoUpdate = globalSettings?.autoUpdate ?? false;
		localScheduleEnabled = globalSettings?.updateScheduleEnabled ?? false;
		localScheduleWindows = globalSettings?.updateScheduleWindows ?? [];
	}

	async function saveSettings() {
		isLoading = true;
		try {
			const clearPromises: Promise<any>[] = [];

			if (localUpdateSettingsOverride === null && isUpdateSettingsOverridden) {
				clearPromises.push(
					projectService.clearProjectSettingOverride(project.id, 'autoUpdate'),
					projectService.clearProjectSettingOverride(project.id, 'updateScheduleEnabled'),
					projectService.clearProjectSettingOverride(project.id, 'updateScheduleWindows')
				);
			}

			if (clearPromises.length > 0) {
				await Promise.all(clearPromises);
			}

			const updates: ProjectSettingsUpdate = {};

			if (localUpdateSettingsOverride !== null) {
				updates.autoUpdate = localAutoUpdate;
				updates.updateScheduleEnabled = localScheduleEnabled;
				updates.updateScheduleWindows = localScheduleWindows;
			}

			if (Object.keys(updates).length > 0) {
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

	function resetChanges() {
		localUpdateSettingsOverride = isUpdateSettingsOverridden ? true : null;
		localAutoUpdate = project.autoUpdate ?? globalSettings?.autoUpdate ?? false;
		localScheduleEnabled = project.updateScheduleEnabled ?? globalSettings?.updateScheduleEnabled ?? false;
		localScheduleWindows = project.updateScheduleWindows ?? globalSettings?.updateScheduleWindows ?? [];
	}

	function clearOverride() {
		localUpdateSettingsOverride = null;
		localAutoUpdate = globalSettings?.autoUpdate ?? false;
		localScheduleEnabled = globalSettings?.updateScheduleEnabled ?? false;
		localScheduleWindows = globalSettings?.updateScheduleWindows ?? [];
	}
</script>

<div class="space-y-6">
	<div class="flex justify-end gap-2">
		<Button size="sm" variant="outline" onclick={resetChanges} disabled={isLoading || !hasAnyChanges}>
			<RotateCcwIcon class="mr-2 size-4" />
			{m.common_reset()}
		</Button>
		<Button size="sm" onclick={saveSettings} disabled={isLoading || !hasAnyChanges}>
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
					isOverridden={localUpdateSettingsOverride !== null}
					{isLoading}
					onClearOverride={clearOverride}
					onEnableOverride={enableOverride}
				>
					{#snippet children()}
						<UpdateScheduleEditor
							bind:autoUpdate={localAutoUpdate}
							bind:scheduleEnabled={localScheduleEnabled}
							bind:windows={localScheduleWindows}
						/>
					{/snippet}
				</SettingsSection>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
