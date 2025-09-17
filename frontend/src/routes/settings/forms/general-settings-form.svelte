<script lang="ts">
	import { z } from 'zod/v4';
	import { createForm, preventDefault } from '$lib/utils/form.utils';
	import { Button } from '$lib/components/ui/button';
	import * as FieldSet from '$lib/components/ui/field-set';
	import FormInput from '$lib/components/form/form-input.svelte';
	import type { Settings } from '$lib/types/settings.type';
	import { toast } from 'svelte-sonner';
	import SwitchWithLabel from '$lib/components/form/labeled-switch.svelte';
	import { m } from '$lib/paraglide/messages';

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

	async function onSubmit() {
		const data = form.validate();
		if (!data) return;
		isLoading = true;

		await callback(data)
			.then(() => toast.success(m.general_settings_saved()))
			.finally(() => (isLoading = false));
	}
</script>

<form onsubmit={preventDefault(onSubmit)} class="space-y-6">
	<div class="w-full p-6">
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
						bind:checked={$formInputs.enableGravatar.value}
					/>
				</div>
			</FieldSet.Content>

			<FieldSet.Footer>
				<div class="flex w-full place-items-center justify-between">
					<span class="text-muted-foreground text-sm">{m.general_save_instructions()}</span>
					<Button type="submit" disabled={isLoading} size="sm">{isLoading ? m.common_saving() : m.common_save()}</Button>
				</div>
			</FieldSet.Footer>
		</FieldSet.Root>
	</div>
</form>
