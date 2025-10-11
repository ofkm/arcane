<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { z } from 'zod/v4';
	import { getContext, onMount } from 'svelte';
	import { createForm } from '$lib/utils/form.utils';
	import type { Settings } from '$lib/types/settings.type';
	import { toast } from 'svelte-sonner';
	import SwitchWithLabel from '$lib/components/form/labeled-switch.svelte';
	import { m } from '$lib/paraglide/messages';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import UserIcon from '@lucide/svelte/icons/user';
	import PaletteIcon from '@lucide/svelte/icons/palette';
	import TextInputWithLabel from '$lib/components/form/text-input-with-label.svelte';
	import settingsStore from '$lib/stores/config-store';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import { settingsService } from '$lib/services/settings-service';
	import { SettingsPageLayout } from '$lib/layouts';
	import AccentColorPicker from '$lib/components/accent-color/accent-color-picker.svelte';
	import { applyAccentColor } from '$lib/utils/accent-color-util';

	let { data } = $props();
	let hasChanges = $state(false);
	let isLoading = $state(false);

	let currentSettings = $state(data.settings!);
	const isReadOnly = $derived.by(() => $settingsStore.uiConfigDisabled);
	const formState = getContext('settingsFormState') as any;
	const formSchema = z.object({
		projectsDirectory: z.string().min(1, m.general_projects_directory_required()),
		baseServerUrl: z.string().min(1, m.general_base_url_required()),
		enableGravatar: z.boolean(),
		accentColor: z.string()
	});

	let { inputs: formInputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, currentSettings));

	const formHasChanges = $derived.by(
		() =>
			$formInputs.projectsDirectory.value !== currentSettings.projectsDirectory ||
			$formInputs.baseServerUrl.value !== currentSettings.baseServerUrl ||
			$formInputs.enableGravatar.value !== currentSettings.enableGravatar ||
			$formInputs.accentColor.value !== currentSettings.accentColor
	);

	$effect(() => {
		hasChanges = formHasChanges;
		if (formState) {
			formState.hasChanges = hasChanges;
			formState.isLoading = isLoading;
		}
	});

	async function updateSettingsConfig(updatedSettings: Partial<Settings>) {
		try {
			await settingsService.updateSettings(updatedSettings as any);
			currentSettings = { ...currentSettings, ...updatedSettings };
			settingsStore.set(currentSettings);
			settingsStore.reload();
		} catch (error) {
			console.error('Error updating settings:', error);
			throw error;
		}
	}

	async function onSubmit() {
		const data = form.validate();
		if (!data) {
			toast.error('Please check the form for errors');
			return;
		}
		isLoading = true;

		await updateSettingsConfig(data)
			.then(() => toast.success(m.general_settings_saved()))
			.catch((error) => {
				console.error('Failed to save settings:', error);
				toast.error('Failed to save settings. Please try again.');
			})
			.finally(() => (isLoading = false));
	}

	function resetForm() {
		$formInputs.projectsDirectory.value = data.settings!.projectsDirectory;
		$formInputs.baseServerUrl.value = data.settings!.baseServerUrl;
		$formInputs.enableGravatar.value = data.settings!.enableGravatar;
		$formInputs.accentColor.value = data.settings!.accentColor;
		applyAccentColor(data.settings!.accentColor);
	}

	onMount(() => {
		if (formState) {
			formState.saveFunction = onSubmit;
			formState.resetFunction = resetForm;
		}
	});
</script>

<SettingsPageLayout
	title={m.general_title()}
	description={m.general_description()}
	icon={SettingsIcon}
	pageType="form"
	showReadOnlyTag={isReadOnly}
>
	{#snippet mainContent()}
		<fieldset disabled={isReadOnly} class="relative">
			<div class="space-y-4 sm:space-y-6">
				<Card.Root>
					<Card.Header icon={FolderIcon}>
						<div class="flex flex-col space-y-1.5">
							<Card.Title>{m.general_projects_heading()}</Card.Title>
							<Card.Description>{m.general_projects_description()}</Card.Description>
						</div>
					</Card.Header>
					<Card.Content class="px-3 py-4 sm:px-6">
						<div class="space-y-3">
							<TextInputWithLabel
								bind:value={$formInputs.projectsDirectory.value}
								label={m.general_projects_directory_label()}
								placeholder={m.general_projects_directory_placeholder()}
								helpText={m.general_projects_directory_help()}
								type="text"
							/>

							<TextInputWithLabel
								bind:value={$formInputs.baseServerUrl.value}
								label={m.general_base_url_label()}
								placeholder={m.general_base_url_placeholder()}
								helpText={m.general_base_url_help()}
								type="text"
							/>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header icon={UserIcon}>
						<div class="flex flex-col space-y-1.5">
							<Card.Title>{m.general_user_avatars_heading()}</Card.Title>
							<Card.Description>{m.general_user_avatars_description()}</Card.Description>
						</div>
					</Card.Header>
					<Card.Content class="px-3 py-4 sm:px-6">
						<SwitchWithLabel
							id="enableGravatar"
							label={m.general_enable_gravatar_label()}
							description={m.general_enable_gravatar_description()}
							bind:checked={$formInputs.enableGravatar.value}
						/>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header icon={PaletteIcon}>
						<div class="flex flex-col space-y-1.5">
							<Card.Title>{m.accent_color()}</Card.Title>
							<Card.Description>{m.accent_color_description()}</Card.Description>
						</div>
					</Card.Header>
					<Card.Content class="px-3 py-4 sm:px-6">
						<div class="space-y-5">
							<AccentColorPicker
								previousColor={currentSettings.accentColor}
								bind:selectedColor={$formInputs.accentColor.value}
								disabled={isReadOnly}
							/>
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		</fieldset>
	{/snippet}
</SettingsPageLayout>
