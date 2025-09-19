<script lang="ts">
	import { z } from 'zod/v4';
	import { getContext, onMount } from 'svelte';
	import { createForm } from '$lib/utils/form.utils';
	import * as Card from '$lib/components/ui/card';
	import FormInput from '$lib/components/form/form-input.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { Settings } from '$lib/types/settings.type';
	import { toast } from 'svelte-sonner';
	import SwitchWithLabel from '$lib/components/form/labeled-switch.svelte';
	import { m } from '$lib/paraglide/messages';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import UserIcon from '@lucide/svelte/icons/user';

	let {
		settings,
		callback
	}: {
		settings: Settings;
		callback: (appConfig: Partial<Settings>) => Promise<void>;
	} = $props();

	let isLoading = $state(false);

	const formSchema = z.object({
		projectsDirectory: z.string().min(1, m.general_projects_directory_required()),
		baseServerUrl: z.string().min(1, m.general_base_url_required()),
		enableGravatar: z.boolean()
	});

	// Store original values for comparison
	let originalSettings = $state({
		projectsDirectory: settings.projectsDirectory,
		baseServerUrl: settings.baseServerUrl,
		enableGravatar: settings.enableGravatar
	});

	let formData = $derived({
		projectsDirectory: settings.projectsDirectory,
		baseServerUrl: settings.baseServerUrl,
		enableGravatar: settings.enableGravatar
	});

	let { inputs: formInputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, formData));

	// Update original settings when settings prop changes
	$effect(() => {
		originalSettings.projectsDirectory = settings.projectsDirectory;
		originalSettings.baseServerUrl = settings.baseServerUrl;
		originalSettings.enableGravatar = settings.enableGravatar;
	});

	// Get form state context from layout
	const formState = getContext('settingsFormState') as any;

	// Track if any changes have been made
	const hasChanges = $derived(
		$formInputs.projectsDirectory.value !== originalSettings.projectsDirectory ||
		$formInputs.baseServerUrl.value !== originalSettings.baseServerUrl ||
		$formInputs.enableGravatar.value !== originalSettings.enableGravatar
	);

	// Update the header state when form state changes
	$effect(() => {
		if (formState) {
			formState.hasChanges = hasChanges;
			formState.isLoading = isLoading;
		}
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
		$formInputs.projectsDirectory.value = originalSettings.projectsDirectory;
		$formInputs.baseServerUrl.value = originalSettings.baseServerUrl;
		$formInputs.enableGravatar.value = originalSettings.enableGravatar;
	}

	// Register save and reset functions with the header on mount
	onMount(() => {
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
		<Card.Content class="px-3 sm:px-6 py-4">
			<div class="space-y-3">
				<div class="space-y-2">
					<Label class="text-sm font-medium">{m.general_projects_directory_label()}</Label>
					<Input
						type="text"
						placeholder={m.general_projects_directory_placeholder()}
						bind:value={$formInputs.projectsDirectory.value}
						class={$formInputs.projectsDirectory.error ? 'border-destructive' : ''}
					/>
					{#if $formInputs.projectsDirectory.error}
						<p class="text-destructive mt-1 text-sm">{$formInputs.projectsDirectory.error}</p>
					{:else}
						<p class="text-muted-foreground mt-1 text-xs">{m.general_projects_directory_help()}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label class="text-sm font-medium">{m.general_base_url_label()}</Label>
					<Input
						type="text"
						placeholder={m.general_base_url_placeholder()}
						bind:value={$formInputs.baseServerUrl.value}
						class={$formInputs.baseServerUrl.error ? 'border-destructive' : ''}
					/>
					{#if $formInputs.baseServerUrl.error}
						<p class="text-destructive mt-1 text-sm">{$formInputs.baseServerUrl.error}</p>
					{:else}
						<p class="text-muted-foreground mt-1 text-xs">{m.general_base_url_help()}</p>
					{/if}
				</div>
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
		<Card.Content class="px-3 sm:px-6 py-4">
			<SwitchWithLabel
				id="enableGravatar"
				label={m.general_enable_gravatar_label()}
				description={m.general_enable_gravatar_description()}
				checked={$formInputs.enableGravatar.value}
				onCheckedChange={(checked) => ($formInputs.enableGravatar.value = checked)}
			/>
		</Card.Content>
	</Card.Root>
</div>

