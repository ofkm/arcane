<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import SwitchWithLabel from '$lib/components/form/labeled-switch.svelte';
	import SelectWithLabel from '$lib/components/form/select-with-label.svelte';
	import TextInputWithLabel from '$lib/components/form/text-input-with-label.svelte';
	import ZapIcon from '@lucide/svelte/icons/zap';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import settingsStore from '$lib/stores/config-store';
	import * as ButtonGroup from '$lib/components/ui/button-group';
	import { Button } from '$lib/components/ui/button';
	import { m } from '$lib/paraglide/messages';

	let {
		autoUpdate = $bindable(),
		autoUpdateCron = $bindable()
	}: { autoUpdate?: boolean | null; autoUpdateCron?: string | null | undefined } = $props();

	const globalSettings = $derived($settingsStore);
	const globalAutoUpdate = $derived(globalSettings?.autoUpdate);

	const normalizeEmptyValue = (val: string | null | undefined): string | null => {
		return val === '' || val === null || val === undefined ? null : val;
	};

	const hasAutoUpdate = $derived(autoUpdate !== null);

	// Normalize autoUpdateCron whenever it changes
	$effect(() => {
		if (autoUpdateCron !== undefined && autoUpdateCron !== normalizeEmptyValue(autoUpdateCron)) {
			autoUpdateCron = normalizeEmptyValue(autoUpdateCron);
		}
	});

	const cronScheduleOptions = [
		{
			value: null,
			label: m.cron_immediate(),
			description: m.cron_immediate_description()
		},
		{
			value: '0 2 * * 6,0',
			label: m.cron_weekends_at({ hour: '2am' }),
			description: m.cron_weekends_at({ hour: '2am' })
		},
		{
			value: '0 3 * * 1-5',
			label: m.cron_weekdays_at({ hour: '3am' }),
			description: m.cron_weekdays_at({ hour: '3am' })
		},
		{
			value: '0 0 * * *',
			label: m.cron_daily_at({ time: 'midnight' }),
			description: m.cron_daily_at({ time: 'midnight' })
		},
		{
			value: '0 2 * * *',
			label: m.cron_daily_at({ time: '2am' }),
			description: m.cron_daily_at({ time: '2am' })
		},
		{
			value: '0 */6 * * *',
			label: m.cron_every_n_hours({ hours: '6' }),
			description: m.cron_every_n_hours({ hours: '6' })
		},
		{
			value: '0 */12 * * *',
			label: m.cron_every_n_hours({ hours: '12' }),
			description: m.cron_every_n_hours({ hours: '12' })
		},
		{
			value: 'custom',
			label: m.custom(),
			description: 'Enter a custom cron expression'
		}
	] as const;

	let cronScheduleMode = $state<string | null>(
		(() => {
			const cron = autoUpdateCron;
			if (!cron || cron.trim() === '') return null; // Default to immediate
			const found = cronScheduleOptions.find((o) => o.value === cron);
			return found?.value ?? 'custom';
		})()
	);

	// Update the actual cron value when mode changes
	$effect(() => {
		if (cronScheduleMode !== 'custom' && cronScheduleMode !== null) {
			autoUpdateCron = cronScheduleMode;
		}
	});
</script>

<div class="space-y-4 p-4 sm:space-y-6 sm:p-6">
	<fieldset class="relative space-y-4 sm:space-y-6">
		<Card.Root>
			<Card.Header icon={ZapIcon}>
				<div class="flex w-full flex-col space-y-3">
					<div class="flex flex-row items-center justify-between gap-3">
						<Card.Title class="flex-1">{m.project_settings_auto_update_title()}</Card.Title>
						<ButtonGroup.ButtonGroup class="shrink-0">
							<Button
								variant={!hasAutoUpdate ? 'default' : 'ghost'}
								size="sm"
								class="h-7 px-2.5 text-xs"
								onclick={() => (autoUpdate = null)}
							>
								<GlobeIcon class="mr-1 size-3" />
								{m.project_settings_global()}
							</Button>
							<Button
								variant={hasAutoUpdate ? 'default' : 'ghost'}
								size="sm"
								class="h-7 px-2.5 text-xs"
								onclick={() => {
									autoUpdate = globalAutoUpdate ?? true;
								}}
							>
								<ZapIcon class="mr-1 size-3" />
								{m.project_settings_project()}
							</Button>
						</ButtonGroup.ButtonGroup>
					</div>
					<Card.Description>
						{#if !hasAutoUpdate}
							{m.project_settings_using_global()}
						{:else}
							{m.project_settings_configure_project()}
						{/if}
					</Card.Description>
				</div>
			</Card.Header>
			{#if hasAutoUpdate}
				<Card.Content class="px-3 py-4 sm:px-6">
					<div class="border-primary/20 space-y-4 border-l-2 pl-4">
						<SwitchWithLabel
							id="project-auto-update"
							checked={autoUpdate!}
							onCheckedChange={(checked) => (autoUpdate = checked)}
							label={m.project_settings_enable_auto_update()}
							description={m.project_settings_enable_description()}
						/>

						{#if autoUpdate}
							<div class="border-primary/20 space-y-3 border-l-2 pl-3">
								<SelectWithLabel
									id="cronScheduleMode"
									name="cronScheduleMode"
									value={cronScheduleMode ?? 'null'}
									onValueChange={(v) => (cronScheduleMode = v === 'null' ? null : v)}
									label={m.project_settings_update_schedule()}
									placeholder={m.docker_polling_interval_placeholder_select()}
									options={cronScheduleOptions.map(({ value, label, description }) => ({
										value: value === null ? 'null' : value,
										label,
										description
									}))}
								/>

								{#if cronScheduleMode === 'custom'}
									<TextInputWithLabel
										value={autoUpdateCron ?? ''}
										error={null}
										label={m.custom()}
										placeholder="0 2 * * *"
										helpText={m.cron_help_text()}
										type="text"
										onChange={(v) => (autoUpdateCron = v || null)}
									/>
								{/if}
							</div>
						{/if}
					</div>
				</Card.Content>
			{/if}
		</Card.Root>
	</fieldset>
</div>
