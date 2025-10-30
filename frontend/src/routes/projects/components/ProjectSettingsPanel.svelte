<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { z } from 'zod/v4';
	import { onMount } from 'svelte';
	import { createForm } from '$lib/utils/form.utils';
	import { toast } from 'svelte-sonner';
	import SwitchWithLabel from '$lib/components/form/labeled-switch.svelte';
	import CronScheduleInput from '$lib/components/form/cron-schedule-input.svelte';
	import ZapIcon from '@lucide/svelte/icons/zap';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import { projectSettingsService } from '$lib/services/project-settings-service';
	import settingsStore from '$lib/stores/config-store';
	import type { ProjectSettings } from '$lib/types/project-settings.type';
	import { Button } from '$lib/components/ui/button';
	import * as ButtonGroup from '$lib/components/ui/button-group';
	import SaveIcon from '@lucide/svelte/icons/save';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import { m } from '$lib/paraglide/messages';

	let { projectId }: { projectId: string } = $props();

	let projectSettings = $state<ProjectSettings | null>(null);
	let isLoading = $state(true);
	let isSaving = $state(false);

	const globalSettings = $derived($settingsStore);
	const globalAutoUpdate = $derived(globalSettings?.autoUpdate);

	const formSchema = z.object({
		autoUpdate: z.boolean().nullable(),
		autoUpdateCron: z.string().nullable()
	});

	let currentSettings = $state({
		autoUpdate: null as boolean | null,
		autoUpdateCron: null as string | null
	});

	let formData = $derived(currentSettings);
	let { inputs: formInputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, formData));

	const normalizeEmptyValue = (val: string | null | undefined): string | null => {
		return val === '' || val === null || val === undefined ? null : val;
	};

	let hasChanges = $derived(
		$formInputs.autoUpdate.value !== currentSettings.autoUpdate ||
			normalizeEmptyValue($formInputs.autoUpdateCron.value) !== normalizeEmptyValue(currentSettings.autoUpdateCron)
	);

	const hasAutoUpdate = $derived($formInputs.autoUpdate.value !== null);

	async function loadSettings() {
		isLoading = true;
		try {
			const settings = await projectSettingsService.getProjectSettings(projectId);
			projectSettings = settings;
			updateCurrentSettings(settings);
		} catch (error: any) {
			if (error?.status === 404) {
				projectSettings = {
					projectId,
					autoUpdate: null,
					autoUpdateCron: null
				};
				updateCurrentSettings(projectSettings);
			} else {
				toast.error(m.project_settings_load_failed());
				console.error(error);
			}
		} finally {
			isLoading = false;
		}
	}

	function updateCurrentSettings(settings: ProjectSettings) {
		currentSettings = {
			autoUpdate: settings.autoUpdate,
			autoUpdateCron: normalizeEmptyValue(settings.autoUpdateCron)
		};
	}

	async function onSubmit() {
		const validated = form.validate();
		if (!validated) {
			toast.error(m.project_settings_validation_error());
			return;
		}

		const { autoUpdate, autoUpdateCron } = validated;
		isSaving = true;

		try {
			if (autoUpdate === null) {
				// Delete project settings to revert to global
				await projectSettingsService.deleteProjectSettings(projectId);
				toast.success(m.project_settings_updated());
				await loadSettings();
			} else {
				// Update/create project settings
				const updated = await projectSettingsService.updateProjectSettings(projectId, {
					autoUpdate,
					autoUpdateCron: normalizeEmptyValue(autoUpdateCron)
				});
				toast.success(m.project_settings_updated());
				projectSettings = updated;
				updateCurrentSettings(updated);
			}
		} catch (error) {
			console.error('Failed to save settings:', error);
			toast.error(m.project_settings_update_failed());
		} finally {
			isSaving = false;
		}
	}

	function resetForm() {
		if (projectSettings) {
			updateCurrentSettings(projectSettings);
		}
	}

	onMount(async () => {
		await loadSettings();
	});
</script>

<div class="space-y-4 p-4 sm:space-y-6 sm:p-6">
	<fieldset disabled={isSaving} class="relative space-y-4 sm:space-y-6">
		<div class="flex items-center justify-end gap-3">
			<Button variant="outline" onclick={resetForm} disabled={!hasChanges || isSaving}>
				<RotateCcwIcon class="mr-2 size-4" />
				{m.common_reset()}
			</Button>
			<Button onclick={onSubmit} disabled={!hasChanges || isSaving}>
				<SaveIcon class="mr-2 size-4" />
				{isSaving ? m.common_saving() : m.common_save_changes()}
			</Button>
		</div>

		<Card.Root>
			<Card.Header icon={ZapIcon}>
				<div class="flex flex-col space-y-3">
					<div class="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
						<Card.Title>{m.project_settings_auto_update_title()}</Card.Title>
						<ButtonGroup.ButtonGroup class="shrink-0">
							<Button
								variant={!hasAutoUpdate ? 'default' : 'outline'}
								size="sm"
								class="h-8 text-xs"
								onclick={() => ($formInputs.autoUpdate.value = null)}
							>
								<GlobeIcon class="mr-1.5 size-3.5" />
								{m.project_settings_global()}
							</Button>
							<Button
								variant={hasAutoUpdate ? 'default' : 'outline'}
								size="sm"
								class="h-8 text-xs"
								onclick={() => {
									$formInputs.autoUpdate.value = globalAutoUpdate ?? true;
								}}
							>
								<ZapIcon class="mr-1.5 size-3.5" />
								{m.project_settings_project()}
							</Button>
						</ButtonGroup.ButtonGroup>
					</div>
					<Card.Description>
						{#if !hasAutoUpdate}
							{m.project_settings_using_global()}
						{:else}
							{m.project_settings_configure_project()}
						{/if}
					</Card.Description>
				</div>
			</Card.Header>
			{#if hasAutoUpdate}
				<Card.Content class="px-3 py-4 sm:px-6">
					<div class="border-primary/20 space-y-4 border-l-2 pl-4">
						<SwitchWithLabel
							id="project-auto-update"
							checked={$formInputs.autoUpdate.value!}
							onCheckedChange={(checked) => ($formInputs.autoUpdate.value = checked)}
							label={m.project_settings_enable_auto_update()}
							description={m.project_settings_enable_description()}
						/>

						{#if $formInputs.autoUpdate.value}
							<div class="border-primary/20 border-l-2 pl-3">
								<CronScheduleInput
									bind:value={$formInputs.autoUpdateCron.value}
									label={m.project_settings_update_schedule()}
									error={$formInputs.autoUpdateCron.error}
								/>
							</div>
						{/if}
					</div>
				</Card.Content>
			{/if}
		</Card.Root>

		<Card.Root>
			<Card.Header icon={GlobeIcon}>
				<div class="flex flex-col space-y-1.5">
					<Card.Title>{m.project_settings_service_level_title()}</Card.Title>
					<Card.Description>{m.project_settings_service_level_description()}</Card.Description>
				</div>
			</Card.Header>
			<Card.Content class="px-3 py-4 sm:px-6">
				<div class="space-y-3 text-sm">
					<p class="text-muted-foreground">
						{m.project_settings_service_intro()}
						<code class="bg-muted rounded px-1.5 py-0.5 text-xs">com.ofkm.arcane.updater</code>
						{m.project_settings_service_label_text()}
					</p>
					<ul class="text-muted-foreground list-inside list-disc space-y-1.5 pl-2">
						<li>
							<code class="bg-muted rounded px-1.5 py-0.5 text-xs">com.ofkm.arcane.updater.updater: false</code>
							- {m.project_settings_never_update()}
						</li>
						<li>
							<code class="bg-muted rounded px-1.5 py-0.5 text-xs">com.ofkm.arcane.updater.updater: true</code>
							- {m.project_settings_always_update()}
						</li>
						<li>{m.project_settings_no_label()}</li>
					</ul>
				</div>
			</Card.Content>
		</Card.Root>
	</fieldset>
</div>
