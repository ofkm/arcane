<script lang="ts">
	import { ResponsiveDialog } from '$lib/components/ui/responsive-dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import * as Card from '$lib/components/ui/card';
	import { TimePicker } from '$lib/components/ui/time-picker';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { m } from '$lib/paraglide/messages';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import type { UpdateScheduleWindow } from '$lib/types/settings.type';
	import { cn } from '$lib/utils';

	interface Props {
		open: boolean;
		windows: UpdateScheduleWindow[];
		disabled?: boolean;
	}

	let { open = $bindable(), windows = $bindable(), disabled = false }: Props = $props();

	// Local copy for editing
	let localWindows = $state<UpdateScheduleWindow[]>([]);

	// Sync local windows when dialog opens
	$effect(() => {
		if (open) {
			localWindows = JSON.parse(JSON.stringify(windows));
		}
	});

	const allDays: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[] = [
		'monday',
		'tuesday',
		'wednesday',
		'thursday',
		'friday',
		'saturday',
		'sunday'
	];

	const dayLabels: Record<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday', string> = {
		monday: m.day_monday(),
		tuesday: m.day_tuesday(),
		wednesday: m.day_wednesday(),
		thursday: m.day_thursday(),
		friday: m.day_friday(),
		saturday: m.day_saturday(),
		sunday: m.day_sunday()
	};

	const commonTimezones = [
		{ value: 'UTC', label: 'UTC' },
		{ value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
		{ value: 'America/Chicago', label: 'America/Chicago (CST/CDT)' },
		{ value: 'America/Denver', label: 'America/Denver (MST/MDT)' },
		{ value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
		{ value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
		{ value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST)' },
		{ value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
		{ value: 'Asia/Shanghai', label: 'Asia/Shanghai (CST)' },
		{ value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT)' }
	];

	function addWindow() {
		if (disabled) return;
		const newWindow: UpdateScheduleWindow = {
			days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
			startTime: '02:00',
			endTime: '06:00',
			timezone: 'UTC'
		};
		localWindows = [...localWindows, newWindow];
	}

	function removeWindow(index: number) {
		if (disabled) return;
		localWindows = localWindows.filter((_, i) => i !== index);
	}

	function toggleDay(
		windowIndex: number,
		day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
	) {
		if (disabled) return;
		const window = localWindows[windowIndex];
		if (window.days.includes(day)) {
			window.days = window.days.filter((d) => d !== day);
		} else {
			window.days = [...window.days, day];
		}
		localWindows = [...localWindows];
	}

	function updateTime(windowIndex: number, field: 'startTime' | 'endTime', value: string) {
		if (disabled) return;
		localWindows[windowIndex][field] = value;
		localWindows = [...localWindows];
	}

	function updateWindowTimezone(windowIndex: number, newTimezone: string) {
		if (disabled) return;
		localWindows[windowIndex].timezone = newTimezone;
		localWindows = [...localWindows];
	}

	function handleSave() {
		windows = JSON.parse(JSON.stringify(localWindows));
		open = false;
	}

	function handleCancel() {
		open = false;
	}
</script>

<ResponsiveDialog
	bind:open
	title={m.update_schedule_dialog_title()}
	description={m.update_schedule_dialog_description()}
	contentClass="sm:max-w-[720px]"
>
	{#snippet children()}
		<ScrollArea class="max-h-[60vh]">
			<div class="space-y-4 pr-4">
				{#if localWindows.length === 0}
					<p class="text-muted-foreground text-center text-sm">{m.update_schedule_no_windows()}</p>
				{/if}

				{#each localWindows as window, index}
					<Card.Root class="border-border/50">
						<Card.Content class="space-y-4 py-6">
							<div class="flex items-center justify-between">
								<Label class="text-base font-semibold">{m.update_schedule_window_label({ number: (index + 1).toString() })}</Label>
								<Button
									size="sm"
									variant="ghost"
									onclick={() => removeWindow(index)}
									{disabled}
									class="text-muted-foreground hover:text-destructive h-8 px-2"
								>
									<TrashIcon class="size-4" />
								</Button>
							</div>

							<div class="space-y-2.5">
								<Label class="text-sm font-medium">{m.common_days()}</Label>
								<div class="flex flex-wrap gap-2">
									{#each allDays as day}
										{@const isSelected = window.days.includes(day)}
										<button
											type="button"
											onclick={() => toggleDay(index, day)}
											{disabled}
											class={cn(
												'flex items-center rounded-md border px-3.5 py-2 text-sm font-medium transition-all',
												!disabled && 'hover:bg-accent cursor-pointer',
												disabled && 'cursor-not-allowed opacity-50',
												isSelected && 'bg-primary text-primary-foreground border-primary/50 shadow-sm'
											)}
										>
											<span>{dayLabels[day]}</span>
										</button>
									{/each}
								</div>
							</div>

							<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div class="space-y-2">
									<Label class="text-sm font-medium">{m.common_start_time()}</Label>
									<TimePicker
										bind:value={window.startTime}
										onValueChange={(v) => updateTime(index, 'startTime', v)}
										{disabled}
									/>
								</div>
								<div class="space-y-2">
									<Label class="text-sm font-medium">{m.common_end_time()}</Label>
									<TimePicker
										bind:value={window.endTime}
										onValueChange={(v) => updateTime(index, 'endTime', v)}
										{disabled}
									/>
								</div>
							</div>

							<div class="space-y-2">
								<Label class="text-sm font-medium">{m.common_timezone()}</Label>
								<Select.Root
									type="single"
									value={window.timezone}
									onValueChange={(v) => v && updateWindowTimezone(index, v)}
									{disabled}
								>
									<Select.Trigger>
										{commonTimezones.find((tz) => tz.value === window.timezone)?.label || window.timezone}
									</Select.Trigger>
									<Select.Content>
										{#each commonTimezones as tz}
											<Select.Item value={tz.value}>{tz.label}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}

				<Button
					variant="outline"
					onclick={addWindow}
					{disabled}
					class="w-full"
				>
					<PlusIcon class="mr-2 size-4" />
					{m.update_schedule_add_window()}
				</Button>
			</div>
		</ScrollArea>
	{/snippet}

	{#snippet footer()}
		<div class="flex gap-2">
			<Button variant="outline" onclick={handleCancel} class="flex-1">
				{m.common_cancel()}
			</Button>
			<Button onclick={handleSave} {disabled} class="flex-1">
				{m.common_save()}
			</Button>
		</div>
	{/snippet}
</ResponsiveDialog>

