<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { m } from '$lib/paraglide/messages';
	import { commonCronPresets, cronToHumanReadable, validateCronExpression, type CronPreset } from '$lib/utils/cron.utils';

	let {
		value = $bindable<string | null>(),
		label,
		description,
		error,
		disabled = false
	}: {
		value: string | null;
		label: string;
		description?: string;
		error?: string | null;
		disabled?: boolean;
	} = $props();

	const presetChips: CronPreset[] = [
		...commonCronPresets,
		{ value: 'custom', label: m.cron_custom(), description: '' }
	];

	function getInitialMode(): string | null {
		if (!value || value.trim() === '') return null;
		const preset = commonCronPresets.find((p) => p.value === value);
		return preset ? preset.value : 'custom';
	}

	let selectedMode = $state<string | null>(getInitialMode());	
	let customValue = $state<string>(value || '');
	let validationError = $state<string | null>(null);

	$effect(() => {
		if (selectedMode === 'custom') {
			return;
		}

		if (selectedMode === null) {
			value = '';
		} else {
			value = selectedMode;
		}
	});

	$effect(() => {
		if (selectedMode === 'custom' && customValue) {
			const validation = validateCronExpression(customValue);
			if (!validation.valid) {
				validationError = validation.error || m.cron_invalid();
			} else {
				validationError = null;
				value = customValue;
			}
		} else {
			validationError = null;
		}
	});

	const humanReadable = $derived(
		selectedMode === 'custom' && customValue ? cronToHumanReadable(customValue) : null
	);

	function selectMode(mode: string | null) {
		if (disabled) return;
		selectedMode = mode;
		if (mode === 'custom') {
			customValue = value || '';
		}
	}
</script>

<div class="grid gap-3">
	<Label for="cron-schedule" class="text-sm leading-none font-medium">
		{label}
	</Label>

	<div class="flex flex-wrap gap-2">
		{#each presetChips as chip (chip.value)}
			<Badge
				variant={selectedMode === chip.value ? 'default' : 'outline'}
				class="cursor-pointer px-3 py-1.5 transition-colors {selectedMode === chip.value
					? 'hover:opacity-90'
					: 'hover:bg-accent hover:text-accent-foreground'} {disabled
					? 'opacity-50 cursor-not-allowed'
					: ''}"
				onclick={() => selectMode(chip.value)}
			>
				{chip.label}
			</Badge>
		{/each}
	</div>

	{#if selectedMode === 'custom'}
		<div class="space-y-2 border-primary/20 border-l-2 pl-3 animate-in fade-in slide-in-from-top-2 duration-200">
			<Input
				type="text"
				bind:value={customValue}
				placeholder="0 2 * * *"
				{disabled}
				class={validationError ? 'border-destructive' : ''}
			/>
			<p class="text-muted-foreground text-xs">
				Format: minute hour day month weekday (e.g., "0 2 * * 6,0" for weekends at 2am)
			</p>
			
			{#if humanReadable && !validationError}
				<div class="bg-muted/50 rounded-md px-3 py-2 text-sm">
					<span class="text-muted-foreground">Schedule: </span>
					<span class="font-medium">{humanReadable}</span>
				</div>
			{/if}
		</div>
	{/if}

	{#if error || validationError}
		<p class="text-destructive text-[0.8rem] font-medium">{error || validationError}</p>
	{/if}

	{#if description && !error && !validationError}
		<p class="text-muted-foreground text-[0.8rem]">
			{description}
		</p>
	{/if}
</div>
