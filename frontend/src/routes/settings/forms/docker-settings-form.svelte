<script lang="ts">
	import ZapIcon from '@lucide/svelte/icons/zap';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { toast } from 'svelte-sonner';
	import type { Settings } from '$lib/types/settings.type';
	import FormInput from '$lib/components/form/form-input.svelte';
	import { z } from 'zod/v4';
	import { getContext, onMount } from 'svelte';
	import { createForm, preventDefault } from '$lib/utils/form.utils';
	import { Button } from '$lib/components/ui/button';
	import SwitchWithLabel from '$lib/components/form/labeled-switch.svelte';
	import * as Card from '$lib/components/ui/card';
	import SelectWithLabel from '$lib/components/form/select-with-label.svelte';
	import { m } from '$lib/paraglide/messages';
	import ActivityIcon from '@lucide/svelte/icons/activity';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import TrashIcon from '@lucide/svelte/icons/trash';
	import SaveIcon from '@lucide/svelte/icons/save';

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

	// Get form state context from layout
	const formState = getContext('settingsFormState') as any;

	// Track if any changes have been made
	const hasChanges = $derived(() => {
		return (
			$formInputs.pollingEnabled.value !== settings.pollingEnabled ||
			$formInputs.pollingInterval.value !== settings.pollingInterval ||
			$formInputs.autoUpdate.value !== settings.autoUpdate ||
			$formInputs.autoUpdateInterval.value !== settings.autoUpdateInterval ||
			$formInputs.dockerPruneMode.value !== settings.dockerPruneMode
		);
	});

	// Update the header state when form state changes
	$effect(() => {
		if (formState) {
			formState.hasChanges = hasChanges();
			formState.isLoading = isLoading;
		}
	});

	// Keep form value in sync with preset selection unless "custom"
	$effect(() => {
		if (pollingIntervalMode !== 'custom') {
			$formInputs.pollingInterval.value = presetToMinutes[pollingIntervalMode];
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
		$formInputs.pollingEnabled.value = settings.pollingEnabled;
		$formInputs.pollingInterval.value = settings.pollingInterval;
		$formInputs.autoUpdate.value = settings.autoUpdate;
		$formInputs.autoUpdateInterval.value = settings.autoUpdateInterval;
		$formInputs.dockerPruneMode.value = settings.dockerPruneMode;
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
	<!-- Image Polling Card -->
	<Card.Root class="overflow-hidden">
		<Card.Header class="bg-muted/20 border-b">
			<div class="flex items-center gap-3">
				<div class="bg-primary/10 text-primary ring-primary/20 flex size-8 items-center justify-center rounded-lg ring-1">
					<ActivityIcon class="size-4" />
				</div>
				<div>
					<Card.Title class="text-base">Image Polling</Card.Title>
					<Card.Description class="text-xs">Configure automatic image update checking</Card.Description>
				</div>
			</div>
		</Card.Header>
		<Card.Content class="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 sm:pt-3">
			<div class="space-y-3">
				<SwitchWithLabel
					id="pollingEnabled"
					label={m.docker_enable_polling_label()}
					description={m.docker_enable_polling_description()}
					checked={$formInputs.pollingEnabled.value}
					onCheckedChange={(checked) => ($formInputs.pollingEnabled.value = checked)}
				/>
				
				{#if $formInputs.pollingEnabled.value}
					<div class="space-y-3 pl-3 border-l-2 border-primary/20">
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

						{#if $formInputs.pollingInterval.value < 30}
							<Alert.Root variant="warning">
								<ZapIcon class="size-4" />
								<Alert.Title>{m.docker_rate_limit_warning_title()}</Alert.Title>
								<Alert.Description>{m.docker_rate_limit_warning_description()}</Alert.Description>
							</Alert.Root>
						{/if}
					</div>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Auto Update Card -->
	{#if $formInputs.pollingEnabled.value}
		<Card.Root class="overflow-hidden">
			<Card.Header class="bg-muted/20 border-b">
				<div class="flex items-center gap-3">
					<div class="bg-primary/10 text-primary ring-primary/20 flex size-8 items-center justify-center rounded-lg ring-1">
						<RefreshCwIcon class="size-4" />
					</div>
					<div>
						<Card.Title class="text-base">Auto Updates</Card.Title>
						<Card.Description class="text-xs">Automatically update containers when new images are available</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content class="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 sm:pt-3">
				<div class="space-y-3">
					<SwitchWithLabel
						id="autoUpdateSwitch"
						label={m.docker_auto_update_label()}
						description={m.docker_auto_update_description()}
						checked={$formInputs.autoUpdate.value}
						onCheckedChange={(checked) => ($formInputs.autoUpdate.value = checked)}
					/>
					
					{#if $formInputs.autoUpdate.value}
						<div class="pl-3 border-l-2 border-primary/20">
							<FormInput
								bind:input={$formInputs.autoUpdateInterval}
								type="number"
								id="autoUpdateInterval"
								label={m.docker_auto_update_interval_label()}
								placeholder={m.docker_auto_update_interval_placeholder()}
								description={m.docker_auto_update_interval_description()}
							/>
						</div>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Cleanup Settings Card -->
	<Card.Root class="overflow-hidden">
		<Card.Header class="bg-muted/20 border-b">
			<div class="flex items-center gap-3">
				<div class="bg-primary/10 text-primary ring-primary/20 flex size-8 items-center justify-center rounded-lg ring-1">
					<TrashIcon class="size-4" />
				</div>
				<div>
					<Card.Title class="text-base">Cleanup Settings</Card.Title>
					<Card.Description class="text-xs">Configure how Docker images are pruned</Card.Description>
				</div>
			</div>
		</Card.Header>
		<Card.Content class="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 sm:pt-3">
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
		</Card.Content>
	</Card.Root>
</div>

