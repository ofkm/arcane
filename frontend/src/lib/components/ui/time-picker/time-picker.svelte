<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import * as Popover from '$lib/components/ui/popover';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import { cn } from '$lib/utils';

	interface Props {
		value: string;
		onValueChange?: (value: string) => void;
		disabled?: boolean;
		class?: string;
		placeholder?: string;
	}

	let { value = $bindable(), onValueChange, disabled = false, class: className, placeholder = '00:00' }: Props = $props();

	let open = $state(false);
	let hours = $state('00');
	let minutes = $state('00');

	// Parse the initial value
	$effect(() => {
		if (value) {
			const parts = value.split(':');
			if (parts.length === 2) {
				hours = parts[0].padStart(2, '0');
				minutes = parts[1].padStart(2, '0');
			}
		}
	});

	function updateValue() {
		const newValue = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
		value = newValue;
		onValueChange?.(newValue);
	}

	function handleHoursChange(e: Event) {
		const target = e.currentTarget as HTMLInputElement;
		let val = parseInt(target.value) || 0;
		val = Math.max(0, Math.min(23, val));
		hours = val.toString().padStart(2, '0');
		updateValue();
	}

	function handleMinutesChange(e: Event) {
		const target = e.currentTarget as HTMLInputElement;
		let val = parseInt(target.value) || 0;
		val = Math.max(0, Math.min(59, val));
		minutes = val.toString().padStart(2, '0');
		updateValue();
	}

	function handleInputChange(e: Event) {
		const target = e.currentTarget as HTMLInputElement;
		value = target.value;
		onValueChange?.(target.value);
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		<Button
			variant="outline"
			class={cn('w-full justify-start text-left font-normal', !value && 'text-muted-foreground', className)}
			{disabled}
		>
			<ClockIcon class="mr-2 size-4" />
			{value || placeholder}
		</Button>
	</Popover.Trigger>
	<Popover.Content class="w-auto p-4">
		<div class="space-y-4">
			<div class="space-y-2">
				<Label class="text-sm font-medium">Time</Label>
				<div class="flex items-center gap-2">
					<div class="flex-1 space-y-1">
						<Label class="text-muted-foreground text-xs">Hours</Label>
						<Input
							type="number"
							min="0"
							max="23"
							value={hours}
							oninput={handleHoursChange}
							class="font-mono text-center"
							{disabled}
						/>
					</div>
					<span class="text-muted-foreground mt-5 text-xl">:</span>
					<div class="flex-1 space-y-1">
						<Label class="text-muted-foreground text-xs">Minutes</Label>
						<Input
							type="number"
							min="0"
							max="59"
							value={minutes}
							oninput={handleMinutesChange}
							class="font-mono text-center"
							{disabled}
						/>
					</div>
				</div>
			</div>
		</div>
	</Popover.Content>
</Popover.Root>

