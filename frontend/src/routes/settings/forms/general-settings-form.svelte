<script lang="ts">
	import { z } from 'zod/v4';
	import { createForm, preventDefault } from '$lib/utils/form.utils';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import FormInput from '$lib/components/form/form-input.svelte';
	import type { Settings } from '$lib/types/settings.type';
	import { toast } from 'svelte-sonner';
	import SwitchWithLabel from '$lib/components/form/labeled-switch.svelte';
	import { m } from '$lib/paraglide/messages';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import UserIcon from '@lucide/svelte/icons/user';
	import SaveIcon from '@lucide/svelte/icons/save';

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

	let { inputs: formInputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, settings));

	// Track if any changes have been made
	const hasChanges = $derived(() => {
		return (
			$formInputs.projectsDirectory.value !== settings.projectsDirectory ||
			$formInputs.baseServerUrl.value !== settings.baseServerUrl ||
			$formInputs.enableGravatar.value !== settings.enableGravatar
		);
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
</script>

<div class="space-y-4 sm:space-y-6">
	<!-- Projects Configuration Card -->
	<Card.Root class="overflow-hidden">
		<Card.Header class="bg-muted/20 border-b">
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
		<Card.Content class="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 sm:pt-3">
			<div class="space-y-3">
				<FormInput
					label={m.general_projects_directory_label()}
					placeholder={m.general_projects_directory_placeholder()}
					bind:input={$formInputs.projectsDirectory}
					helpText={m.general_projects_directory_help()}
				/>

				<FormInput
					label={m.general_base_url_label()}
					placeholder={m.general_base_url_placeholder()}
					bind:input={$formInputs.baseServerUrl}
					helpText={m.general_base_url_help()}
				/>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- User Preferences Card -->
	<Card.Root class="overflow-hidden">
		<Card.Header class="bg-muted/20 border-b">
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
		<Card.Content class="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 sm:pt-3">
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

<!-- Save Actions -->
<div class="mt-8 flex items-center justify-between border-t pt-6">
	<div class="text-sm text-muted-foreground">
		{#if hasChanges()}
			<span class="text-orange-600 dark:text-orange-400">• Unsaved changes</span>
		{:else}
			<span class="text-green-600 dark:text-green-400">• All changes saved</span>
		{/if}
	</div>
	
	<div class="flex gap-3">
		{#if hasChanges()}
			<Button 
				variant="outline" 
				onclick={() => window.location.reload()}
				disabled={isLoading}
			>
				{m.common_reset()}
			</Button>
		{/if}
		
		<form onsubmit={preventDefault(onSubmit)} class="inline">
			<Button 
				type="submit" 
				disabled={isLoading || !hasChanges()} 
				class="min-w-[120px]"
			>
				{#if isLoading}
					<div class="mr-2 size-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
					{m.common_saving()}
				{:else}
					<SaveIcon class="mr-2 size-4" />
					{m.common_save()}
				{/if}
			</Button>
		</form>
	</div>
</div>
