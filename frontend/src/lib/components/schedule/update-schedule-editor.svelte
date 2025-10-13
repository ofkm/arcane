<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import * as Card from '$lib/components/ui/card';
	import { m } from '$lib/paraglide/messages';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import type { UpdateScheduleWindow } from '$lib/types/settings.type';

	interface Props {
		windows: UpdateScheduleWindow[];
		timezone: string;
		onUpdate: (windows: UpdateScheduleWindow[], timezone: string) => void;
	}

	let { windows = $bindable([]), timezone = $bindable('UTC'), onUpdate }: Props = $props();

	const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

	const dayLabels: Record<string, string> = {
		monday: 'Monday',
		tuesday: 'Tuesday',
		wednesday: 'Wednesday',
		thursday: 'Thursday',
		friday: 'Friday',
		saturday: 'Saturday',
		sunday: 'Sunday'
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
		onUpdate(windows, timezone);
	}

	function removeWindow(index: number) {
		windows = windows.filter((_, i) => i !== index);
		onUpdate(windows, timezone);
	}

	function toggleDay(windowIndex: number, day: string) {
		const window = windows[windowIndex];
		if (window.days.includes(day)) {
			window.days = window.days.filter((d) => d !== day);
		} else {
			window.days = [...window.days, day];
		}
		windows = [...windows];
		onUpdate(windows, timezone);
	}

	function updateTime(windowIndex: number, field: 'startTime' | 'endTime', value: string) {
		windows[windowIndex][field] = value;
		windows = [...windows];
		onUpdate(windows, timezone);
	}

	function updateGlobalTimezone(newTimezone: string) {
		timezone = newTimezone;
		windows = windows.map((w) => ({ ...w, timezone: newTimezone }));
		onUpdate(windows, timezone);
	}
</script>

<div class="space-y-4">
	<div class="space-y-2">
		<Label>{m.update_schedule_timezone_label()}</Label>
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
			<Card.Root>
				<Card.Content class="space-y-4 pt-6">
					<div class="space-y-2">
						<Label>{m.update_schedule_days_label()}</Label>
						<div class="flex flex-wrap gap-2">
							{#each allDays as day}
								<label
									class="hover:bg-accent flex cursor-pointer items-center space-x-2 rounded border px-3 py-2 text-sm transition-colors"
									class:bg-primary={window.days.includes(day)}
									class:text-primary-foreground={window.days.includes(day)}
								>
									<Checkbox checked={window.days.includes(day)} onCheckedChange={() => toggleDay(index, day)} class="hidden" />
									<span>{dayLabels[day]}</span>
								</label>
							{/each}
						</div>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label>{m.update_schedule_start_time_label()}</Label>
							<Input
								type="time"
								value={window.startTime}
								oninput={(e) => updateTime(index, 'startTime', e.currentTarget.value)}
							/>
						</div>
						<div class="space-y-2">
							<Label>{m.update_schedule_end_time_label()}</Label>
							<Input type="time" value={window.endTime} oninput={(e) => updateTime(index, 'endTime', e.currentTarget.value)} />
						</div>
					</div>

					<Button size="sm" variant="destructive" onclick={() => removeWindow(index)} class="w-full">
						<TrashIcon class="mr-2 size-4" />
						{m.update_schedule_remove_window()}
					</Button>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
</div>
