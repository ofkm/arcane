<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '$lib/components/ui/collapsible';
	import { m } from '$lib/paraglide/messages';
	import { commonCronPresets, cronToHumanReadable, validateCronExpression, type CronPreset } from '$lib/utils/cron.utils';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import CheckIcon from '@lucide/svelte/icons/check';
	import SettingsIcon from '@lucide/svelte/icons/settings';

	let {
		value = $bindable<string | null>(),
		label,
		error,
		disabled = false
	}: {
		value: string | null;
		label: string;
		error?: string | null;
		disabled?: boolean;
	} = $props();

	const presetChips: CronPreset[] = [
		...commonCronPresets,
		{ value: 'custom', label: m.cron_custom(), description: '', icon: SettingsIcon }
	];

	let isOpen = $state(false);
	let validationError = $state<string | null>(null);
	let isEditingCustom = $state(false);

	const isCustomMode = $derived.by(() => {
		if (isEditingCustom) return true;
		if (!value || value.trim() === '') return false;
		return !commonCronPresets.some((p) => p.value === value);
	});

	const selectedPreset = $derived(commonCronPresets.find((p) => p.value === value));

	const displayText = $derived.by(() => {
		if (!value || value.trim() === '') {
			return m.cron_immediate();
		}
		if (isCustomMode) {
			return cronToHumanReadable(value);
		}
		return selectedPreset?.label || m.cron_immediate();
	});

	function selectPreset(presetValue: string | null) {
		if (disabled) return;

		if (presetValue === 'custom') {
			// Keep dropdown open for custom input, pre-fill with current value
			isEditingCustom = true;
			return;
		}

		// User selected a preset, exit custom mode
		isEditingCustom = false;
		value = presetValue || '';
		isOpen = false;
	}

	function handleCustomInput() {
		// Mark as editing when user types in custom field
		isEditingCustom = true;
	}

	$effect(() => {
		if (isCustomMode && value) {
			const validation = validateCronExpression(value);
			validationError = validation.valid ? null : validation.error || m.cron_invalid();
		} else {
			validationError = null;
		}
	});

	// When dropdown closes, check if we should exit custom mode
	$effect(() => {
		if (!isOpen && isEditingCustom) {
			// If the final value matches a preset, switch to that preset
			if (value && commonCronPresets.some((p) => p.value === value)) {
				isEditingCustom = false;
			}
		}
	});
</script>

<div class="space-y-2">
	<div class="flex items-center justify-between gap-2">
		<Label for="cron-schedule" class="text-sm font-medium">
			{label}
		</Label>
	</div>

	<Collapsible bind:open={isOpen} class="space-y-2">
		<div class="flex items-center gap-2">
			<CollapsibleTrigger
				class="bg-card hover:bg-accent/50 flex flex-1 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors {disabled
					? 'cursor-not-allowed opacity-50'
					: ''}"
				{disabled}
			>
				<div class="flex min-w-0 items-center gap-2">
					<ClockIcon class="text-muted-foreground size-4 shrink-0" />
					<span class="truncate font-medium">{displayText}</span>
				</div>
				<ChevronDownIcon
					class="text-muted-foreground size-4 shrink-0 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}"
				/>
			</CollapsibleTrigger>
		</div>

		<CollapsibleContent class="space-y-2">
			<div class="bg-muted/30 flex flex-col gap-2 rounded-lg border p-2 sm:grid sm:grid-cols-2 sm:gap-2">
				{#each presetChips as chip (chip.value)}
					{@const normalizedValue = value || null}
					{@const normalizedChipValue = chip.value || null}
					{@const isSelected = chip.value === 'custom' ? isCustomMode : !isCustomMode && normalizedChipValue === normalizedValue}
					<button
						type="button"
						class="bg-card hover:bg-accent flex min-h-[44px] items-center gap-2.5 rounded-md border px-3.5 py-2.5 text-left text-sm transition-all {isSelected
							? 'border-primary bg-primary/5 font-medium'
							: 'border-border'} {disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}"
						onclick={() => selectPreset(chip.value)}
						{disabled}
					>
						{#if isSelected}
							<CheckIcon class="text-primary size-4 shrink-0" />
						{:else}
							<div class="size-4 shrink-0"></div>
						{/if}
						{#if chip.icon}
							{@const Icon = chip.icon}
							<Icon class="text-muted-foreground size-4 shrink-0" />
						{/if}
						<span class="truncate">{chip.label}</span>
					</button>
				{/each}
			</div>

			{#if isCustomMode}
				<div class="border-primary/20 bg-accent/20 space-y-2 rounded-lg border p-3">
					<Input
						id="custom-cron"
						type="text"
						bind:value
						placeholder="0 2 * * *"
						{disabled}
						class={validationError ? 'border-destructive' : ''}
						oninput={handleCustomInput}
					/>
					<p class="text-muted-foreground text-xs">{m.cron_format_help()}</p>
				</div>
			{/if}
		</CollapsibleContent>
	</Collapsible>

	{#if error || validationError}
		<p class="text-destructive text-xs font-medium">{error || validationError}</p>
	{/if}
</div>
