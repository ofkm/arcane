<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import * as Card from '$lib/components/ui/card';
	import { m } from '$lib/paraglide/messages';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import type { UpdateScheduleWindow } from '$lib/types/settings.type';
	import { cn } from '$lib/utils';

	interface Props {
		enabled?: boolean;
		windows: UpdateScheduleWindow[];
		timezone: string;
	}

	let { enabled = $bindable(false), windows = $bindable([]), timezone = $bindable('UTC') }: Props = $props();

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
		const newWindow: UpdateScheduleWindow = {
			days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
			startTime: '02:00',
			endTime: '06:00',
			timezone: timezone
		};
		windows = [...windows, newWindow];
	}

	function removeWindow(index: number) {
		windows = windows.filter((_, i) => i !== index);
	}

	function toggleDay(
		windowIndex: number,
		day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
	) {
		const window = windows[windowIndex];
		if (window.days.includes(day)) {
			window.days = window.days.filter((d) => d !== day);
		} else {
			window.days = [...window.days, day];
		}
		windows = [...windows];
	}

	function updateTime(windowIndex: number, field: 'startTime' | 'endTime', value: string) {
		windows[windowIndex][field] = value;
		windows = [...windows];
	}

	function updateGlobalTimezone(newTimezone: string) {
		timezone = newTimezone;
		windows = windows.map((w) => ({ ...w, timezone: newTimezone }));
	}

	function updateEnabled(value: boolean) {
		enabled = value;
	}
</script>

<div class="space-y-4">
	<div class="space-y-2">
		<Label>{m.update_schedule_mode_label()}</Label>
		<div class="grid gap-2">
			<label
				class={cn(
					'hover:bg-accent flex cursor-pointer items-start space-x-3 rounded-lg border p-4 transition-all',
					!enabled && 'bg-primary/5 border-primary shadow-sm'
				)}
			>
				<input type="radio" checked={!enabled} onchange={() => updateEnabled(false)} class="accent-primary mt-1" />
				<div class="flex-1">
					<div class="font-medium">{m.update_schedule_mode_immediate()}</div>
					<div class="text-muted-foreground text-sm">
						{m.update_schedule_mode_immediate_description()}
					</div>
				</div>
			</label>
			<label
				class={cn(
					'hover:bg-accent flex cursor-pointer items-start space-x-3 rounded-lg border p-4 transition-all',
					enabled && 'bg-primary/5 border-primary shadow-sm'
				)}
			>
				<input type="radio" checked={enabled} onchange={() => updateEnabled(true)} class="accent-primary mt-1" />
				<div class="flex-1">
					<div class="font-medium">{m.update_schedule_mode_scheduled()}</div>
					<div class="text-muted-foreground text-sm">
						{m.update_schedule_mode_scheduled_description()}
					</div>
				</div>
			</label>
		</div>
	</div>

	{#if enabled}
		<div class="border-primary/20 space-y-4 border-l-2 pl-4">
			<div class="space-y-2">
				<Label>{m.common_timezone()}</Label>
				<Select.Root type="single" bind:value={timezone} onValueChange={(v) => v && updateGlobalTimezone(v)}>
					<Select.Trigger>
						{commonTimezones.find((tz) => tz.value === timezone)?.label || timezone}
					</Select.Trigger>
					<Select.Content>
						{#each commonTimezones as tz}
							<Select.Item value={tz.value}>{tz.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				<p class="text-muted-foreground text-sm">{m.update_schedule_timezone_description()}</p>
			</div>

			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<Label>{m.update_schedule_windows_label()}</Label>
					<Button size="sm" variant="outline" onclick={addWindow}>
						<PlusIcon class="mr-2 size-4" />
						{m.update_schedule_add_window()}
					</Button>
				</div>

				{#if windows.length === 0}
					<p class="text-muted-foreground text-sm">{m.update_schedule_no_windows()}</p>
				{/if}

				{#each windows as window, index}
					<Card.Root class="border-border/50">
						<Card.Content class="space-y-4 py-6">
							<div class="space-y-2.5">
								<Label class="text-sm font-medium">{m.common_days()}</Label>
								<div class="flex flex-wrap gap-2">
									{#each allDays as day}
										{@const isSelected = window.days.includes(day)}
										<button
											type="button"
											onclick={() => toggleDay(index, day)}
											class={cn(
												'hover:bg-accent flex cursor-pointer items-center rounded-md border px-3.5 py-2 text-sm font-medium transition-all',
												isSelected && 'bg-primary text-primary-foreground border-primary/50 shadow-sm'
											)}
										>
											<span>{dayLabels[day]}</span>
										</button>
									{/each}
								</div>
							</div>

							<div class="grid grid-cols-2 gap-4">
								<div class="space-y-2">
									<Label class="text-sm font-medium">{m.common_start_time()}</Label>
									<Input
										type="time"
										value={window.startTime}
										oninput={(e) => updateTime(index, 'startTime', e.currentTarget.value)}
										class="font-mono"
									/>
								</div>
								<div class="space-y-2">
									<Label class="text-sm font-medium">{m.common_end_time()}</Label>
									<Input
										type="time"
										value={window.endTime}
										oninput={(e) => updateTime(index, 'endTime', e.currentTarget.value)}
										class="font-mono"
									/>
								</div>
							</div>

							<Button
								size="sm"
								variant="outline"
								onclick={() => removeWindow(index)}
								class="text-muted-foreground hover:text-destructive hover:border-destructive/50 w-full transition-colors"
							>
								<TrashIcon class="mr-2 size-4" />
								{m.update_schedule_remove_window()}
							</Button>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		</div>
	{/if}
</div>
