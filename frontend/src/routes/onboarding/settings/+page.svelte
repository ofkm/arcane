<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as FieldSet from '$lib/components/ui/field-set';
	import FormInput from '$lib/components/form/form-input.svelte';
	import SwitchWithLabel from '$lib/components/form/labeled-switch.svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { createForm, preventDefault } from '$lib/utils/form.utils';
	import { z } from 'zod/v4';
	import { m } from '$lib/paraglide/messages';
	import { settingsService } from '$lib/services/settings-service.js';

	let { data } = $props();
	let currentSettings = $state(data.settings);

	let isLoading = $state(false);

	const formSchema = z.object({
		projectsDirectory: z.string().min(1, m.general_projects_directory_required()),
		baseServerUrl: z.string().min(1, m.general_base_url_required()),
		enableGravatar: z.boolean()
	});

	let { inputs: formInputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, currentSettings));

	async function handleNext() {
		const validated = form.validate();
		if (!validated) return;

		isLoading = true;

		try {
			await settingsService.updateSettings({
				...currentSettings,
				...validated,
				onboardingCompleted: false,
				onboardingSteps: {
					...currentSettings.onboardingSteps,
					settings: true
				}
			});

			goto('/onboarding/complete');
		} catch (error) {
			toast.error(m.general_settings_save_failed());
		} finally {
			isLoading = false;
		}
	}

	function handleSkip() {
		goto('/onboarding/complete');
	}
</script>

<div class="space-y-6">
	<div class="text-center">
		<h2 class="text-2xl font-bold">{m.general_title()}</h2>
		<p class="text-muted-foreground mt-2">{m.general_description()}</p>
	</div>

	<form onsubmit={preventDefault(handleNext)} class="space-y-6">
		<FieldSet.Root>
			<FieldSet.Content class="grid grid-cols-1 gap-6 md:grid-cols-2">
				<div class="bg-background/40 min-w-0 space-y-4 rounded-lg border p-5 shadow-sm">
					<div class="space-y-1">
						<h3 class="text-base font-medium">{m.general_projects_heading()}</h3>
						<p class="text-muted-foreground text-sm">{m.general_projects_description()}</p>
					</div>

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

				<div class="bg-background/40 min-w-0 space-y-4 rounded-lg border p-5 shadow-sm">
					<div class="space-y-1">
						<h3 class="text-base font-medium">{m.general_user_avatars_heading()}</h3>
						<p class="text-muted-foreground text-sm">{m.general_user_avatars_description()}</p>
					</div>

					<SwitchWithLabel
						id="enableGravatar"
						label={m.general_enable_gravatar_label()}
						description={m.general_enable_gravatar_description()}
						error={$formInputs.enableGravatar.error}
						bind:checked={$formInputs.enableGravatar.value}
					/>
				</div>
			</FieldSet.Content>

			<FieldSet.Footer>
				<div class="flex w-full place-items-center justify-between">
					<span class="text-muted-foreground text-sm">{m.general_save_instructions()}</span>
					<div class="flex gap-2">
						<Button type="button" variant="outline" onclick={() => goto('/onboarding/security')}>Back</Button>
						<Button type="button" variant="ghost" onclick={handleSkip}>Skip</Button>
						<Button type="submit" disabled={isLoading}>
							{#if isLoading}
								<Spinner class="mr-2 size-4" />
							{/if}
							{m.common_continue()}
						</Button>
					</div>
				</div>
			</FieldSet.Footer>
		</FieldSet.Root>
	</form>
</div>
