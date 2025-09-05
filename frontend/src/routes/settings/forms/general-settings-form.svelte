<script lang="ts">
	import { z } from 'zod/v4';
	import { createForm, preventDefault } from '$lib/utils/form.utils';
	import { Button } from '$lib/components/ui/button';
	import * as FieldSet from '$lib/components/ui/field-set';
	import FormInput from '$lib/components/form/form-input.svelte';
	import type { Settings } from '$lib/types/settings.type';
	import { toast } from 'svelte-sonner';

	let {
		settings,
		callback
	}: {
		settings: Settings;
		callback: (appConfig: Partial<Settings>) => Promise<void>;
	} = $props();

	let isLoading = $state(false);

	const formSchema = z.object({
		stacksDirectory: z.string().min(1, 'Projects directory is required'),
		baseServerUrl: z.string().min(1, 'Base server URL is required')
	});

	let { inputs: formInputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, settings));

	async function onSubmit() {
		const data = form.validate();
		if (!data) return;
		isLoading = true;

		await callback(data)
			.then(() => toast.success('Settings Updated Successfully'))
			.finally(() => (isLoading = false));
	}
</script>

<form onsubmit={preventDefault(onSubmit)} class="space-y-6">
	<div class="w-full p-6">
		<FieldSet.Root>
			<FieldSet.Content class="flex flex-col gap-8">
				<div class="min-w-0 space-y-4">
					<FormInput
						label="Projects Directory"
						placeholder="data/projects"
						bind:input={$formInputs.stacksDirectory}
						helpText="Directory where Docker Compose files are stored (this is inside the container)"
					/>

					<FormInput
						label="Base Server URL"
						placeholder="localhost"
						bind:input={$formInputs.baseServerUrl}
						helpText="Base URL for accessing Arcane (used for webhooks and notifications)"
					/>
				</div>
			</FieldSet.Content>

			<FieldSet.Footer>
				<div class="flex w-full place-items-center justify-between">
					<span class="text-muted-foreground text-sm">Save your updated settings.</span>
					<Button type="submit" disabled={isLoading} size="sm">{isLoading ? 'Saving…' : 'Save'}</Button>
				</div>
			</FieldSet.Footer>
		</FieldSet.Root>
	</div>
</form>
