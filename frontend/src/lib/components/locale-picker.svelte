<script lang="ts">
	import * as Select from '$lib/components/ui/select/index.js';
	import { getLocale, type Locale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages';
	import userStore from '$lib/stores/user-store';
	import { setLocale } from '$lib/utils/locale.util';
	import { Label } from '$lib/components/ui/label/index.js';
	import { userService } from '$lib/services/user-service';

	let {
		inline = false,
		id = 'localePicker',
		class: className = '',
		onOpenChange
	}: {
		inline?: boolean;
		id?: string;
		class?: string;
		onOpenChange?: (open: boolean) => void;
	} = $props();

	const currentLocale = $state(getLocale());
	let isOpen = $state(false);

	const locales: Record<string, string> = {
		de: 'Deutsch',
		en: 'English',
		eo: 'Esperanto',
		es: 'Español',
		fr: 'Français',
		nl: 'Nederlands',
		zh: 'Chinese'
	};

	async function updateLocale(locale: Locale) {
		try {
			if ($userStore) {
				await userService.update($userStore.id, { ...$userStore, locale });
			}
			await setLocale(locale);
		} catch (err) {
			console.error('Failed to update locale', err);
		}
	}
</script>

<div class={`locale-picker ${className}`}>
	{#if inline}
		<Select.Root
			type="single"
			value={currentLocale}
			onValueChange={(v) => updateLocale(v as Locale)}
			open={isOpen}
			onOpenChange={(open) => {
				isOpen = open;
				onOpenChange?.(open);
			}}
		>
			<Select.Trigger {id} class="bg-background/50 border-border/30 text-foreground h-9 w-32 text-sm font-medium">
				<span class="truncate">{locales[currentLocale]}</span>
			</Select.Trigger>
			<Select.Content class="min-w-[160px] max-w-[280px]">
				{#each Object.entries(locales) as [value, label]}
					<Select.Item class="text-sm" {value}>{label}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	{:else}
		<div class="px-3 py-2">
			<div class="grid gap-2">
				<Label for={id} class="text-sm font-medium leading-none">
					{m.language()}
				</Label>
				<Select.Root
					type="single"
					value={currentLocale}
					onValueChange={(v) => updateLocale(v as Locale)}
					open={isOpen}
					onOpenChange={(open) => {
						isOpen = open;
						onOpenChange?.(open);
					}}
				>
					<Select.Trigger {id} class="h-9 w-full justify-between" aria-label={m.common_select_locale()}>
						<span class="truncate">{locales[currentLocale]}</span>
					</Select.Trigger>
					<Select.Content>
						{#each Object.entries(locales) as [value, label]}
							<Select.Item {value}>{label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</div>
	{/if}
</div>
