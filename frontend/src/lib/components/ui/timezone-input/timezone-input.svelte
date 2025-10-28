<script lang="ts">
	import * as Command from '$lib/components/ui/command';
	import * as Popover from '$lib/components/ui/popover';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import { isValidTimezone, searchTimezones, type TimezoneOption } from '$lib/utils/timezone';
	import { m } from '$lib/paraglide/messages';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';

	interface Props {
		value: string;
		onValueChange?: (value: string) => void;
		disabled?: boolean;
		placeholder?: string;
	}

	let { value = $bindable(), onValueChange, disabled = false, placeholder = m.timezone_select_placeholder() }: Props = $props();

	let open = $state(false);
	let searchQuery = $state('');
	let isValid = $derived(isValidTimezone(value));
	let filteredTimezones = $derived(searchTimezones(searchQuery));

	function selectTimezone(timezone: TimezoneOption) {
		value = timezone.value;
		onValueChange?.(timezone.value);
		open = false;
		searchQuery = '';
	}

	function handleInputChange(newValue: string) {
		value = newValue;
		onValueChange?.(newValue);
		open = false;
		searchQuery = '';
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		<Button
			variant="outline"
			role="combobox"
			aria-expanded={open}
			{disabled}
			class={cn('w-full justify-between', !isValid && value && 'border-destructive text-destructive')}
		>
			<span class="truncate">{value || placeholder}</span>
			<ChevronsUpDownIcon class="ml-2 size-4 shrink-0 opacity-50" />
		</Button>
	</Popover.Trigger>
	<Popover.Content class="w-[min(400px,90vw)] p-0" align="start" side="bottom" sideOffset={4} avoidCollisions={false}>
		<Command.Root shouldFilter={false}>
			<Command.Input bind:value={searchQuery} placeholder={m.timezone_search_placeholder()} class="h-9" />
			<Command.Empty class="py-6">
				{#if searchQuery && isValidTimezone(searchQuery)}
					<button
						type="button"
						onclick={() => handleInputChange(searchQuery)}
						class="text-primary hover:bg-accent w-full px-2 py-1.5 text-left text-sm"
					>
						{m.timezone_use_custom({ timezone: searchQuery })}
					</button>
				{:else}
					{m.timezone_no_results()}
				{/if}
			</Command.Empty>
			<Command.Group>
				<Command.List class="h-[300px] overflow-y-auto">
					{#each filteredTimezones as timezone}
						<Command.Item value={timezone.value} onSelect={() => selectTimezone(timezone)} class="cursor-pointer">
							<CheckIcon class={cn('mr-2 size-4', value === timezone.value ? 'opacity-100' : 'opacity-0')} />
							<div class="flex flex-1 items-center justify-between gap-2">
								<span class="truncate">{timezone.label}</span>
								{#if timezone.offset}
									<span class="text-muted-foreground shrink-0 text-xs">{timezone.offset}</span>
								{/if}
							</div>
						</Command.Item>
					{/each}
				</Command.List>
			</Command.Group>
		</Command.Root>
	</Popover.Content>
</Popover.Root>

{#if value && !isValid}
	<p class="text-destructive mt-1 text-xs">{m.timezone_invalid_format()}</p>
{/if}
