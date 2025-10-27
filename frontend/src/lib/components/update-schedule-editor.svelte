<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { m } from '$lib/paraglide/messages';
	import EditIcon from '@lucide/svelte/icons/pencil';
	import type { UpdateScheduleWindow } from '$lib/types/settings.type';
	import { cn } from '$lib/utils';
	import { formatScheduleWindow } from '$lib/utils/schedule-formatter';
	import UpdateScheduleDialog from '$lib/components/dialogs/update-schedule-dialog.svelte';

	interface Props {
		autoUpdate: boolean;
		scheduleEnabled: boolean;
		windows: UpdateScheduleWindow[];
		disabled?: boolean;
	}

	let { autoUpdate = $bindable(), scheduleEnabled = $bindable(), windows = $bindable(), disabled = false }: Props = $props();

	const isNever = $derived.by(() => !autoUpdate);
	const isImmediate = $derived.by(() => autoUpdate && !scheduleEnabled);
	const isScheduled = $derived.by(() => autoUpdate && scheduleEnabled);

	let dialogOpen = $state(false);

	function setNever() {
		if (disabled) return;
		autoUpdate = false;
		scheduleEnabled = false;
	}

	function setImmediate() {
		if (disabled) return;
		autoUpdate = true;
		scheduleEnabled = false;
	}

	function setScheduled() {
		if (disabled) return;
		autoUpdate = true;
		scheduleEnabled = true;
	}

	function openDialog() {
		if (disabled) return;
		dialogOpen = true;
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
					<Tooltip.Content side="top" align="center">{m.update_schedule_mode_never_description()}</Tooltip.Content>
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
					<Tooltip.Content side="top" align="center">{m.update_schedule_mode_immediate_description()}</Tooltip.Content>
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
					<Tooltip.Content side="top" align="center">{m.update_schedule_mode_scheduled_description()}</Tooltip.Content>
				</Tooltip.Root>
			</div>
		</Tooltip.Provider>
	</div>

	{#if isScheduled}
		<div class="border-primary/20 space-y-3 border-l-2 pl-4">
			<div class="flex items-center justify-between">
				<Label>{m.update_schedule_windows_label()}</Label>
				<Button size="sm" variant="outline" onclick={openDialog} {disabled}>
					<EditIcon class="mr-2 size-4" />
					{m.update_schedule_edit_windows()}
				</Button>
			</div>

			{#if windows.length === 0}
				<div class="bg-muted/50 rounded-lg border border-dashed p-4 text-center">
					<p class="text-muted-foreground text-sm">{m.update_schedule_no_windows()}</p>
				</div>
			{:else}
				<div class="space-y-2">
					{#each windows as window, index}
						<div class="bg-muted/30 flex items-center justify-between rounded-lg border px-4 py-3">
							<div class="flex items-center gap-3">
								<Badge variant="outline" class="font-mono text-xs">
									{index + 1}
								</Badge>
								<span class="font-mono text-sm">
									{formatScheduleWindow(window)}
								</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<UpdateScheduleDialog bind:open={dialogOpen} bind:windows {disabled} />
