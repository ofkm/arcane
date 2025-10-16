<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import UpdateScheduleEditor from '$lib/components/schedule/update-schedule-editor.svelte';
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
	const isAutoUpdateOverridden = $derived(project.autoUpdate !== null && project.autoUpdate !== undefined);
	const isScheduleOverridden = $derived(project.updateScheduleEnabled !== null && project.updateScheduleEnabled !== undefined);

	let isLoading = $state(false);

	// Local editable state
	let localAutoUpdateOverride = $state<boolean | null>(null);
	let localAutoUpdate = $state(false);

	let localScheduleOverride = $state<boolean | null>(null);
	let localScheduleEnabled = $state(false);
	let localScheduleWindows = $state<UpdateScheduleWindow[]>([]);
	let localScheduleTimezone = $state('UTC');

	// Initialize local state from project/global on mount
	$effect(() => {
		// Auto-update
		localAutoUpdateOverride = isAutoUpdateOverridden ? true : null;
		localAutoUpdate = project.autoUpdate ?? globalSettings?.autoUpdate ?? false;

		// Schedule
		localScheduleOverride = isScheduleOverridden ? true : null;
		localScheduleEnabled = project.updateScheduleEnabled ?? globalSettings?.updateScheduleEnabled ?? false;
		localScheduleWindows = project.updateScheduleWindows?.windows ?? globalSettings?.updateScheduleWindows?.windows ?? [];
		localScheduleTimezone = project.updateScheduleTimezone ?? globalSettings?.updateScheduleTimezone ?? 'UTC';
	});

	// Check for unsaved changes
	const hasAutoUpdateChanges = $derived(
		(localAutoUpdateOverride !== null && !isAutoUpdateOverridden) ||
			(localAutoUpdateOverride === null && isAutoUpdateOverridden) ||
			(localAutoUpdateOverride !== null && localAutoUpdate !== (project.autoUpdate ?? globalSettings?.autoUpdate ?? false))
	);

	const hasScheduleChanges = $derived(
		(localScheduleOverride !== null && !isScheduleOverridden) ||
			(localScheduleOverride === null && isScheduleOverridden) ||
			(localScheduleOverride !== null &&
				(localScheduleEnabled !== (project.updateScheduleEnabled ?? globalSettings?.updateScheduleEnabled ?? false) ||
					localScheduleTimezone !== (project.updateScheduleTimezone ?? globalSettings?.updateScheduleTimezone ?? 'UTC') ||
					JSON.stringify(localScheduleWindows) !==
						JSON.stringify(project.updateScheduleWindows?.windows ?? globalSettings?.updateScheduleWindows?.windows ?? [])))
	);

	const hasAnyChanges = $derived(hasAutoUpdateChanges || hasScheduleChanges);

	// Derived descriptions for each section
	const autoUpdateDescription = $derived(() => {
		if (localAutoUpdateOverride !== null) {
			return m.project_settings_overridden();
		}
		const enabled = globalSettings?.autoUpdate ? m.common_enabled() : m.common_disabled();
		return `Global: ${enabled}`;
	});

	const scheduleDescription = $derived(() => {
		if (localScheduleOverride !== null) {
			return m.project_settings_overridden();
		}
		const mode = globalSettings?.updateScheduleEnabled ? m.update_schedule_mode_scheduled() : m.update_schedule_mode_immediate();
		return `Global: ${mode}`;
	});

	function enableOverride(setting: 'autoUpdate' | 'schedule') {
		if (setting === 'autoUpdate') {
			localAutoUpdateOverride = true;
			localAutoUpdate = globalSettings?.autoUpdate ?? false;
		} else if (setting === 'schedule') {
			localScheduleOverride = true;
			localScheduleEnabled = globalSettings?.updateScheduleEnabled ?? false;
			localScheduleWindows = globalSettings?.updateScheduleWindows?.windows ?? [];
			localScheduleTimezone = globalSettings?.updateScheduleTimezone ?? 'UTC';
		}
	}

	async function saveSettings() {
		isLoading = true;
		try {
			// First, check if we need to clear any overrides (X button was clicked)
			const clearPromises: Promise<any>[] = [];

			// Clear auto-update override if X was clicked
			if (localAutoUpdateOverride === null && isAutoUpdateOverridden) {
				clearPromises.push(projectService.clearProjectSettingOverride(project.id, 'autoUpdate'));
			}

			// Clear schedule override if X was clicked
			if (localScheduleOverride === null && isScheduleOverridden) {
				clearPromises.push(
					projectService.clearProjectSettingOverride(project.id, 'updateScheduleEnabled'),
					projectService.clearProjectSettingOverride(project.id, 'updateScheduleWindows'),
					projectService.clearProjectSettingOverride(project.id, 'updateScheduleTimezone')
				);
			}

			// Wait for all clears to complete
			if (clearPromises.length > 0) {
				await Promise.all(clearPromises);
			}

			// Now save any active overrides (even if they match global)
			const updates: ProjectSettingsUpdate = {};

			// Save auto-update if overridden
			if (localAutoUpdateOverride !== null) {
				updates.autoUpdate = localAutoUpdate;
			}

			// Save schedule if overridden
			if (localScheduleOverride !== null) {
				updates.updateScheduleEnabled = localScheduleEnabled;
				updates.updateScheduleWindows = {
					enabled: localScheduleEnabled,
					windows: localScheduleWindows
				};
				updates.updateScheduleTimezone = localScheduleTimezone;
			}

			// Only call update if there are overrides to save
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
		// Reset to saved values
		localAutoUpdateOverride = isAutoUpdateOverridden ? true : null;
		localAutoUpdate = project.autoUpdate ?? globalSettings?.autoUpdate ?? false;

		localScheduleOverride = isScheduleOverridden ? true : null;
		localScheduleEnabled = project.updateScheduleEnabled ?? globalSettings?.updateScheduleEnabled ?? false;
		localScheduleWindows = project.updateScheduleWindows?.windows ?? globalSettings?.updateScheduleWindows?.windows ?? [];
		localScheduleTimezone = project.updateScheduleTimezone ?? globalSettings?.updateScheduleTimezone ?? 'UTC';
	}

	function clearOverride(setting: 'autoUpdate' | 'schedule') {
		// Just clear local override - actual DB clear happens on Save
		if (setting === 'autoUpdate') {
			localAutoUpdateOverride = null;
			localAutoUpdate = globalSettings?.autoUpdate ?? false;
		} else if (setting === 'schedule') {
			localScheduleOverride = null;
			localScheduleEnabled = globalSettings?.updateScheduleEnabled ?? false;
			localScheduleWindows = globalSettings?.updateScheduleWindows?.windows ?? [];
			localScheduleTimezone = globalSettings?.updateScheduleTimezone ?? 'UTC';
		}
	}
</script>

<div class="space-y-6">
	<!-- Action Buttons -->
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

	<!-- Updates Card -->
	<Card.Root>
		<Card.Header icon={RefreshCwIcon}>
			<div class="flex flex-col space-y-1.5">
				<Card.Title>{m.docker_auto_updates_title()}</Card.Title>
				<Card.Description>{m.project_settings_description()}</Card.Description>
			</div>
		</Card.Header>
		<Card.Content class="space-y-6 px-3 py-4 sm:px-6">
			<!-- Auto Update Settings Section (only shown when polling is enabled) -->
			{#if globalSettings?.pollingEnabled}
				<SettingsSection
					title={m.project_settings_auto_update_section()}
					description={autoUpdateDescription()}
					icon={RefreshCwIcon}
					isOverridden={localAutoUpdateOverride !== null}
					{isLoading}
					onClearOverride={() => clearOverride('autoUpdate')}
					onEnableOverride={() => enableOverride('autoUpdate')}
				>
					{#snippet children()}
						<div class="flex items-center justify-between">
							<Label for="auto-update">{m.docker_auto_update_label()}</Label>
							<Switch id="auto-update" bind:checked={localAutoUpdate} disabled={isLoading} />
						</div>
					{/snippet}
				</SettingsSection>
			{/if}

			<!-- Schedule Settings Section (only shown when auto-update is enabled) -->
			{#if localAutoUpdateOverride !== null ? localAutoUpdate : globalSettings?.autoUpdate}
				<SettingsSection
					title={m.project_settings_schedule_section()}
					description={scheduleDescription()}
					icon={ClockIcon}
					isOverridden={localScheduleOverride !== null}
					{isLoading}
					onClearOverride={() => clearOverride('schedule')}
					onEnableOverride={() => enableOverride('schedule')}
				>
					{#snippet children()}
						<UpdateScheduleEditor
							bind:enabled={localScheduleEnabled}
							bind:windows={localScheduleWindows}
							bind:timezone={localScheduleTimezone}
						/>
					{/snippet}
				</SettingsSection>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
