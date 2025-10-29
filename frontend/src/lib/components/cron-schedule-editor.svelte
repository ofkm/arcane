<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { m } from '$lib/paraglide/messages';
	import { cn } from '$lib/utils';

	interface Props {
		autoUpdate: boolean;
		scheduleEnabled: boolean;
		cronSchedule?: string;
		disabled?: boolean;
	}

	let {
		autoUpdate = $bindable(),
		scheduleEnabled = $bindable(),
		cronSchedule = $bindable(),
		disabled = false
	}: Props = $props();

	const isNever = $derived.by(() => !autoUpdate);
	const isImmediate = $derived.by(() => autoUpdate && !scheduleEnabled);
	const isScheduled = $derived.by(() => autoUpdate && scheduleEnabled);

	// Cron presets
	const cronPresets = [
		{ label: m.project_labels_cron_immediate(), value: '' },
		{ label: m.project_labels_cron_daily(), value: '0 2 * * *' },
		{ label: m.project_labels_cron_weekdays(), value: '0 2 * * 1-5' },
		{ label: m.project_labels_cron_weekends(), value: '0 2 * * 0,6' },
		{ label: m.project_labels_cron_every_6h(), value: '0 */6 * * *' }
	];

	let selectedPreset = $state('');

	// Sync selected preset with cronSchedule
	$effect(() => {
		if (isScheduled) {
			selectedPreset = cronPresets.find((p) => p.value === cronSchedule)?.value ?? (cronSchedule ? 'custom' : '');
		}
	});

	function setNever() {
		if (disabled) return;
		autoUpdate = false;
		scheduleEnabled = false;
	}

	function setImmediate() {
		if (disabled) return;
		autoUpdate = true;
		scheduleEnabled = false;
		cronSchedule = '';
	}

	function setScheduled() {
		if (disabled) return;
		autoUpdate = true;
		scheduleEnabled = true;
		if (!cronSchedule) {
			cronSchedule = '0 2 * * *'; // Default to daily at 2 AM
		}
	}

	function selectPreset(preset: string) {
		if (disabled) return;
		if (preset === 'custom') {
			selectedPreset = 'custom';
			return;
		}
		selectedPreset = preset;
		cronSchedule = preset;
	}

	function getCronDescription(cron: string): string {
		if (!cron) return m.project_labels_cron_immediate();
		const preset = cronPresets.find((p) => p.value === cron);
		return preset ? preset.label : cron;
	}
</script>

<div class="space-y-4">
	<div class="space-y-2">
		<Label>{m.update_schedule_mode_label()}</Label>
		<Tooltip.Provider>
			<div class="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3" role="group">
				<Tooltip.Root>
					<Tooltip.Trigger>
						<Button
							variant={isNever ? 'default' : 'outline'}
							class={isNever
								? 'arcane-button-create h-12 w-full text-xs sm:text-sm'
								: 'arcane-button-restart h-12 w-full text-xs sm:text-sm'}
							onclick={setNever}
							type="button"
							{disabled}
						>
							{m.update_schedule_mode_never()}
						</Button>
					</Tooltip.Trigger>
					<Tooltip.Content side="top" align="center"
						>{m.update_schedule_mode_never_description()}</Tooltip.Content
					>
				</Tooltip.Root>

				<Tooltip.Root>
					<Tooltip.Trigger>
						<Button
							variant={isImmediate ? 'default' : 'outline'}
							class={isImmediate
								? 'arcane-button-create h-12 w-full text-xs sm:text-sm'
								: 'arcane-button-restart h-12 w-full text-xs sm:text-sm'}
							onclick={setImmediate}
							type="button"
							{disabled}
						>
							{m.update_schedule_mode_immediate()}
						</Button>
					</Tooltip.Trigger>
					<Tooltip.Content side="top" align="center"
						>{m.update_schedule_mode_immediate_description()}</Tooltip.Content
					>
				</Tooltip.Root>

				<Tooltip.Root>
					<Tooltip.Trigger>
						<Button
							variant={isScheduled ? 'default' : 'outline'}
							class={isScheduled
								? 'arcane-button-create h-12 w-full text-xs sm:text-sm'
								: 'arcane-button-restart h-12 w-full text-xs sm:text-sm'}
							onclick={setScheduled}
							type="button"
							{disabled}
						>
							{m.update_schedule_mode_scheduled()}
						</Button>
					</Tooltip.Trigger>
					<Tooltip.Content side="top" align="center"
						>{m.update_schedule_mode_scheduled_description()}</Tooltip.Content
					>
				</Tooltip.Root>
			</div>
		</Tooltip.Provider>
	</div>

	{#if isScheduled}
		<div class="border-primary/20 space-y-3 border-l-2 pl-4">
			<div class="space-y-1">
				<Label for="global-cron-schedule">{m.project_labels_cron_label()}</Label>
				<p class="text-sm text-muted-foreground">{m.project_labels_cron_helper()}</p>
			</div>

			<!-- Preset Buttons -->
			<div class="flex flex-wrap gap-2">
				{#each cronPresets as preset}
					<Button
						variant={selectedPreset === preset.value ? 'default' : 'outline'}
						size="sm"
						onclick={() => selectPreset(preset.value)}
						type="button"
						{disabled}
					>
						{preset.label}
					</Button>
				{/each}
				<Button
					variant={selectedPreset === 'custom' ? 'default' : 'outline'}
					size="sm"
					onclick={() => selectPreset('custom')}
					type="button"
					{disabled}
				>
					{m.custom()}
				</Button>
			</div>

			<!-- Custom Cron Input -->
			{#if selectedPreset === 'custom' || (selectedPreset && !cronPresets.find((p) => p.value === selectedPreset))}
				<div class="space-y-2">
					<Input
						id="global-cron-schedule"
						bind:value={cronSchedule}
						placeholder={m.project_labels_cron_placeholder()}
						class="font-mono"
						{disabled}
					/>
					{#if cronSchedule}
						<p class="text-sm text-muted-foreground">
							{m.project_labels_cron_description_prefix()} {getCronDescription(cronSchedule)}
						</p>
					{/if}
				</div>
			{:else if cronSchedule}
				<p class="text-sm text-muted-foreground">
					{m.project_labels_cron_description_prefix()} {getCronDescription(cronSchedule)}
				</p>
			{/if}
		</div>
	{/if}
</div>

