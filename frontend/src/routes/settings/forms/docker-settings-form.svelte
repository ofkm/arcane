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
	import { m } from '$lib/paraglide/messages';

	let {
		callback,
		settings
	}: {
		settings: Settings;
		callback: (appConfig: Partial<Settings>) => Promise<void>;
	} = $props();

	let isLoading = $state(false);
	let pruneMode = $state(settings.dockerPruneMode);

	type PollingIntervalMode = 'hourly' | 'daily' | 'weekly' | 'custom';

	const imagePollingOptions: Array<{
		value: PollingIntervalMode;
		label: string;
		description: string;
		minutes?: number;
	}> = [
		{
			value: 'hourly',
			minutes: 60,
			label: m.hourly(),
			// If these were swapped, fix them:
			description: m.polling_hourly_description()
		},
		{
			value: 'daily',
			minutes: 1440,
			label: m.daily(),
			description: m.polling_daily_description()
		},
		{
			value: 'weekly',
			minutes: 10080,
			label: m.weekly(),
			description: m.polling_weekly_description()
		},
		{
			value: 'custom',
			label: m.custom(),
			description: m.use_custom_polling_value()
		}
	];

	const presetToMinutes = Object.fromEntries(
		imagePollingOptions.filter((o) => o.value !== 'custom').map((o) => [o.value, o.minutes!])
	) as Record<Exclude<PollingIntervalMode, 'custom'>, number>;

	let pollingIntervalMode = $state<PollingIntervalMode>(
		imagePollingOptions.find((o) => o.minutes === settings.pollingInterval)?.value ?? 'custom'
	);

	const pruneModeOptions = [
		{
			value: 'all',
			label: m.docker_prune_all(),
			description: m.docker_prune_all_description()
		},
		{
			value: 'dangling',
			label: m.docker_prune_dangling(),
			description: m.docker_prune_dangling_description()
		}
	];

	const pruneModeDescription = $derived(
		pruneModeOptions.find((o) => o.value === pruneMode)?.description ?? m.docker_prune_mode_description()
	);

	const formSchema = z.object({
		pollingEnabled: z.boolean(),
		pollingInterval: z.number().int().min(5).max(10080),
		autoUpdate: z.boolean(),
		autoUpdateInterval: z.number().int(),
		dockerPruneMode: z.enum(['all', 'dangling'])
	});

	let { inputs: formInputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, settings));

	// Keep form value in sync with preset selection unless "custom"
	$effect(() => {
		if (pollingIntervalMode !== 'custom') {
			$formInputs.pollingInterval.value = presetToMinutes[pollingIntervalMode];
		}
	});

	async function onSubmit() {
		const data = form.validate();
		if (!data) return;
		isLoading = true;

		await callback(data).finally(() => (isLoading = false));
		toast.success(m.general_settings_saved());
	}
</script>

<form onsubmit={preventDefault(onSubmit)} class="space-y-6">
	<div class="w-full p-6">
		<FieldSet.Root>
			<FieldSet.Content class="flex flex-col gap-8">
				<div class="min-w-0 space-y-4">
					<SwitchWithLabel
						id="pollingEnabled"
						label={m.docker_enable_polling_label()}
						description={m.docker_enable_polling_description()}
						bind:checked={$formInputs.pollingEnabled.value}
					/>
					{#if $formInputs.pollingEnabled.value}
						<div class="space-y-4">
							<SelectWithLabel
								id="pollingIntervalMode"
								name="pollingIntervalMode"
								bind:value={pollingIntervalMode}
								label={m.docker_polling_interval_label()}
								placeholder="Select interval"
								options={imagePollingOptions.map(({ value, label, description }) => ({ value, label, description }))}
							/>
							{#if pollingIntervalMode === 'custom'}
								<FormInput
									bind:input={$formInputs.pollingInterval}
									type="number"
									id="pollingInterval"
									label={m.custom_polling_interval()}
									placeholder={m.docker_polling_interval_placeholder()}
									description={m.docker_polling_interval_description()}
								/>
							{/if}

							<div>
								{#if $formInputs.pollingInterval.value < 30}
									<Alert.Root variant="warning">
										<ZapIcon class="size-4" />
										<Alert.Title>{m.docker_rate_limit_warning_title()}</Alert.Title>
										<Alert.Description>{m.docker_rate_limit_warning_description()}</Alert.Description>
									</Alert.Root>
								{/if}
							</div>

							<div>
								<SwitchWithLabel
									id="autoUpdateSwitch"
									label={m.docker_auto_update_label()}
									description={m.docker_auto_update_description()}
									bind:checked={$formInputs.autoUpdate.value}
								/>
							</div>
							{#if $formInputs.autoUpdate.value}
								<FormInput
									bind:input={$formInputs.autoUpdateInterval}
									type="number"
									id="autoUpdateInterval"
									label={m.docker_auto_update_interval_label()}
									placeholder={m.docker_auto_update_interval_placeholder()}
									description={m.docker_auto_update_interval_description()}
								/>
							{/if}
						</div>
					{/if}
				</div>
				<div class="min-w-0">
					<SelectWithLabel
						id="dockerPruneMode"
						name="pruneMode"
						bind:value={$formInputs.dockerPruneMode.value}
						label={m.docker_prune_action_label()}
						description={pruneModeDescription}
						placeholder={m.docker_prune_placeholder()}
						options={pruneModeOptions}
						onValueChange={(v) => (pruneMode = v as 'all' | 'dangling')}
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
