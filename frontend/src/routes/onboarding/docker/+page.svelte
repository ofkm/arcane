<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { Spinner } from '$lib/components/ui/spinner';
	import ZapIcon from '@lucide/svelte/icons/zap';
	import SwitchWithLabel from '$lib/components/form/labeled-switch.svelte';
	import FormInput from '$lib/components/form/form-input.svelte';
	import SelectWithLabel from '$lib/components/form/select-with-label.svelte';
	import { createForm } from '$lib/utils/form.utils';
	import { z } from 'zod/v4';
	import { m } from '$lib/paraglide/messages';
	import settingsStore from '$lib/stores/config-store';
	import type { Settings } from '$lib/types/settings.type';
	import { settingsService } from '$lib/services/settings-service.js';

	let { data } = $props();
	let currentSettings = $state<Settings>(data.settings);

	let isLoading = $state(false);
	let pruneMode = $derived(currentSettings.dockerPruneMode);

	type PollingIntervalMode = 'hourly' | 'daily' | 'weekly' | 'custom';

	const imagePollingOptions: Array<{
		value: PollingIntervalMode;
		label: string;
		description: string;
		minutes?: number;
	}> = [
		{ value: 'hourly', minutes: 60, label: m.hourly(), description: m.polling_hourly_description() },
		{ value: 'daily', minutes: 1440, label: m.daily(), description: m.polling_daily_description() },
		{ value: 'weekly', minutes: 10080, label: m.weekly(), description: m.polling_weekly_description() },
		{ value: 'custom', label: m.custom(), description: m.use_custom_polling_value() }
	];

	const presetToMinutes = Object.fromEntries(
		imagePollingOptions.filter((o) => o.value !== 'custom').map((o) => [o.value, o.minutes!])
	) as Record<Exclude<PollingIntervalMode, 'custom'>, number>;

	let pollingIntervalMode = $state<PollingIntervalMode>(
		imagePollingOptions.find((o) => o.minutes === currentSettings.pollingInterval)?.value ?? 'custom'
	);

	const pruneModeOptions = [
		{ value: 'all', label: m.docker_prune_all(), description: m.docker_prune_all_description() },
		{ value: 'dangling', label: m.docker_prune_dangling(), description: m.docker_prune_dangling_description() }
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

	let { inputs: formInputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, currentSettings));

	$effect(() => {
		if (pollingIntervalMode !== 'custom') {
			$formInputs.pollingInterval.value = presetToMinutes[pollingIntervalMode];
		}
	});

	async function handleNext() {
		const data = form.validate();
		if (!data) return;
		isLoading = true;

		try {
			const updated = {
				...currentSettings,
				...data,
				onboardingCompleted: false,
				onboardingSteps: { ...currentSettings.onboardingSteps, docker: true }
			} as Partial<Settings>;

			await settingsService.updateSettings(updated as any);
			currentSettings = { ...(currentSettings as Settings), ...(updated as Settings) };
			settingsStore.set(currentSettings);
			settingsStore.reload();

			goto('/onboarding/security');
		} catch (error) {
			toast.error('Failed to save Docker settings');
		} finally {
			isLoading = false;
		}
	}

	function handleSkip() {
		goto('/onboarding/security');
	}
</script>

<div class="space-y-6">
	<div class="text-center">
		<h2 class="text-2xl font-bold">Docker Configuration</h2>
		<p class="text-muted-foreground mt-2">Configure how Arcane checks Docker and auto-updates</p>
	</div>

	{#if $formInputs.autoUpdate.value && $formInputs.pollingEnabled.value}
		<Alert.Root variant="warning">
			<ZapIcon class="size-4" />
			<Alert.Title>{m.docker_auto_update_alert_title()}</Alert.Title>
			<Alert.Description>{m.docker_auto_update_alert_description()}</Alert.Description>
		</Alert.Root>
	{/if}

	<div class="grid gap-6 md:grid-cols-2">
		<Card.Root class="flex flex-col gap-6 py-3">
			<Card.Header
				class="@container/card-header has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6 grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6"
			>
				<Card.Title>{m.docker_title()}</Card.Title>
				<Card.Description>{m.docker_description()}</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-6 px-6">
				<SwitchWithLabel
					id="pollingEnabled"
					label={m.docker_enable_polling_label()}
					description={m.docker_enable_polling_description()}
					bind:checked={$formInputs.pollingEnabled.value}
				/>

				{#if $formInputs.pollingEnabled.value}
					<div class="space-y-4">
						<!-- New: preset select + optional custom input -->
						<SelectWithLabel
							id="pollingIntervalMode"
							name="pollingIntervalMode"
							bind:value={pollingIntervalMode}
							label={m.docker_polling_interval_label()}
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

						<SwitchWithLabel
							id="autoUpdateSwitch"
							label={m.docker_auto_update_label()}
							description={m.docker_auto_update_description()}
							bind:checked={$formInputs.autoUpdate.value}
						/>

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
			</Card.Content>
		</Card.Root>

		<Card.Root class="flex flex-col gap-6 py-3">
			<Card.Header
				class="@container/card-header has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6 grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6"
			>
				<Card.Title>{m.docker_prune_action_label()}</Card.Title>
				<Card.Description>{pruneModeDescription}</Card.Description>
			</Card.Header>
			<Card.Content class="px-6">
				<SelectWithLabel
					id="dockerPruneMode"
					name="pruneMode"
					bind:value={$formInputs.dockerPruneMode.value}
					label={m.docker_prune_action_label()}
					description={pruneModeDescription}
					placeholder={m.docker_prune_placeholder()}
					options={pruneModeOptions}
					groupLabel={m.docker_prune_group_label()}
					onValueChange={(v) => (pruneMode = v as 'all' | 'dangling')}
				/>
			</Card.Content>
		</Card.Root>
	</div>

	<div class="flex justify-between">
		<Button variant="outline" onclick={() => goto('/onboarding/password')}>Back</Button>
		<div class="flex gap-2">
			<Button variant="ghost" onclick={handleSkip}>Skip</Button>
			<Button onclick={handleNext} disabled={isLoading}>
				{#if isLoading}
					<Spinner class="mr-2 size-4" />
				{/if}
				Next
			</Button>
		</div>
	</div>
</div>
