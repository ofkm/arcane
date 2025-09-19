<script lang="ts">
	import { z } from 'zod/v4';
	import { getContext, onMount } from 'svelte';
	import { createForm } from '$lib/utils/form.utils';
	import * as Card from '$lib/components/ui/card';
	import type { Settings } from '$lib/types/settings.type';
	import { toast } from 'svelte-sonner';
	import SwitchWithLabel from '$lib/components/form/labeled-switch.svelte';
	import { m } from '$lib/paraglide/messages';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import UserIcon from '@lucide/svelte/icons/user';
	import TextInputWithLabel from '$lib/components/form/text-input-with-label.svelte';

	let {
		settings,
		callback,
		hasChanges = $bindable(),
		isLoading = $bindable(false)
	}: {
		settings: Settings;
		callback: (appConfig: Partial<Settings>) => Promise<void>;
		hasChanges: boolean;
		isLoading: boolean;
	} = $props();

	const formSchema = z.object({
		projectsDirectory: z.string().min(1, m.general_projects_directory_required()),
		baseServerUrl: z.string().min(1, m.general_base_url_required()),
		enableGravatar: z.boolean()
	});

	let { inputs: formInputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, settings));

	const formHasChanges = $derived.by(
		() =>
			$formInputs.projectsDirectory.value !== settings.projectsDirectory ||
			$formInputs.baseServerUrl.value !== settings.baseServerUrl ||
			$formInputs.enableGravatar.value !== settings.enableGravatar
	);

	$effect(() => {
		hasChanges = formHasChanges;
	});

	async function onSubmit() {
		const data = form.validate();
		if (!data) {
			toast.error('Please check the form for errors');
			return;
		}
		isLoading = true;

		await callback(data)
			.then(() => toast.success(m.general_settings_saved()))
			.catch((error) => {
				console.error('Failed to save settings:', error);
				toast.error('Failed to save settings. Please try again.');
			})
			.finally(() => (isLoading = false));
	}

	function resetForm() {
		$formInputs.projectsDirectory.value = settings.projectsDirectory;
		$formInputs.baseServerUrl.value = settings.baseServerUrl;
		$formInputs.enableGravatar.value = settings.enableGravatar;
	}

	onMount(() => {
		const formState = getContext('settingsFormState') as any;
		if (formState) {
			formState.saveFunction = onSubmit;
			formState.resetFunction = resetForm;
		}
	});
</script>

<div class="space-y-4 sm:space-y-6">
	<!-- Projects Configuration Card -->
	<Card.Root class="overflow-hidden">
		<Card.Header class="py-4! bg-muted/20 border-b">
			<div class="flex items-center gap-3">
				<div class="bg-primary/10 text-primary ring-primary/20 flex size-8 items-center justify-center rounded-lg ring-1">
					<FolderIcon class="size-4" />
				</div>
				<div>
					<Card.Title class="text-base">{m.general_projects_heading()}</Card.Title>
					<Card.Description class="text-xs">{m.general_projects_description()}</Card.Description>
				</div>
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

	<!-- User Preferences Card -->
	<Card.Root class="overflow-hidden">
		<Card.Header class="py-4! bg-muted/20 border-b">
			<div class="flex items-center gap-3">
				<div class="bg-primary/10 text-primary ring-primary/20 flex size-8 items-center justify-center rounded-lg ring-1">
					<UserIcon class="size-4" />
				</div>
				<div>
					<Card.Title class="text-base">{m.general_user_avatars_heading()}</Card.Title>
					<Card.Description class="text-xs">{m.general_user_avatars_description()}</Card.Description>
				</div>
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
</div>
