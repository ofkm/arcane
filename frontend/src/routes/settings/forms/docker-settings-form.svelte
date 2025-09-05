<script lang="ts">
	import ZapIcon from '@lucide/svelte/icons/zap';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { toast } from 'svelte-sonner';
	import type { Settings } from '$lib/types/settings.type';
	import FormInput from '$lib/components/form/form-input.svelte';
	import { z } from 'zod/v4';
	import { createForm, preventDefault } from '$lib/utils/form.utils';
	import { Button } from '$lib/components/ui/button';
	import SwitchWithLabel from '$lib/components/form/labeled-switch.svelte';
	import * as FieldSet from '$lib/components/ui/field-set';
	import SelectWithLabel from '$lib/components/form/select-with-label.svelte';

	let {
		callback,
		settings
	}: {
		settings: Settings;
		callback: (appConfig: Partial<Settings>) => Promise<void>;
	} = $props();

	let isLoading = $state(false);
	let pruneMode = $state(settings.dockerPruneMode);

	const pruneModeOptions = [
		{ value: 'all', label: 'All', description: 'Remove all images not referenced by containers (docker image prune -a)' },
		{ value: 'dangling', label: 'Dangling', description: 'Remove only untagged images (docker image prune)' }
	];

	const pruneModeDescription = $derived(
		pruneModeOptions.find((o) => o.value === pruneMode)?.description ?? 'Choose how unused images should be pruned.'
	);

	const formSchema = z.object({
		pollingEnabled: z.boolean(),
		pollingInterval: z.number().int(),
		autoUpdate: z.boolean(),
		autoUpdateInterval: z.number().int(),
		dockerPruneMode: z.enum(['all', 'dangling'])
	});

	let { inputs: formInputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, settings));

	async function onSubmit() {
		const data = form.validate();
		if (!data) return;
		isLoading = true;

		await callback(data).finally(() => (isLoading = false));
		toast.success('Settings Updated Succesfully');
	}
</script>

{#if settings.autoUpdate && settings.pollingEnabled}
	<div class="mb-4">
		<Alert.Root variant="warning">
			<ZapIcon class="size-4" />
			<Alert.Title>Auto-update Enabled</Alert.Title>
			<Alert.Description>Automatic container updates are active with polling enabled</Alert.Description>
		</Alert.Root>
	</div>
{/if}

<form onsubmit={preventDefault(onSubmit)} class="space-y-6">
	<div class="w-full p-6">
		<FieldSet.Root>
			<FieldSet.Content class="flex flex-col gap-8">
				<div class="min-w-0 space-y-4">
					<SwitchWithLabel
						id="pollingEnabled"
						label="Enable Image Polling"
						description="Periodically check registries for newer image versions"
						bind:checked={$formInputs.pollingEnabled.value}
					/>
					{#if $formInputs.pollingEnabled.value}
						<div class="space-y-4">
							<FormInput
								bind:input={$formInputs.pollingInterval}
								type="number"
								id="pollingInterval"
								label="Polling Interval (minutes)"
								placeholder="60"
								description="How often to check for new images (5-1440 minutes)"
							/>
							<div>
								{#if $formInputs.pollingInterval.value < 30}
									<Alert.Root variant="warning">
										<ZapIcon class="size-4" />
										<Alert.Title>Rate Limiting Warning</Alert.Title>
										<Alert.Description>
											Polling intervals below 30 minutes may trigger registry rate limits. Prefer longer intervals in production.
										</Alert.Description>
									</Alert.Root>
								{/if}
							</div>
							<div>
								<SwitchWithLabel
									id="autoUpdateSwitch"
									label="Auto-update Containers"
									description="Automatically update containers when newer images are found"
									bind:checked={$formInputs.autoUpdate.value}
								/>
							</div>
							{#if $formInputs.autoUpdate.value}
								<FormInput
									bind:input={$formInputs.autoUpdateInterval}
									type="number"
									id="autoUpdateInterval"
									label="Auto-update Interval (minutes)"
									placeholder="60"
									description="How often to perform automatic updates (5-1440 minutes)"
								/>
							{/if}
						</div>
					{/if}
				</div>
				<div class="min-w-0">
					<SelectWithLabel
						id="dockerPruneMode"
						name="pruneMode"
						bind:value={pruneMode}
						label="Image Prune Action Behavior"
						description={pruneModeDescription}
						placeholder="Docker Prune Mode"
						options={pruneModeOptions}
						groupLabel="Image Prune Modes"
						onValueChange={(v) => (pruneMode = v as 'all' | 'dangling')}
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
