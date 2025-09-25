<script lang="ts">
	import * as Select from '$lib/components/ui/select/index.js';
	import { getLocale, type Locale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages';
	import userStore from '$lib/stores/user-store';
	import { setLocale } from '$lib/utils/locale.util';
	import { Label } from '$lib/components/ui/label/index.js';
	import { userService } from '$lib/services/user-service';

	const currentLocale = getLocale();
	const controlId = 'localePicker';

	const locales: Record<string, string> = {
		en: 'English',
		eo: 'Esperanto',
		es: 'Español',
		fr: 'Français',
		nl: 'Nederlands',
		zh: 'Chinese'
	};

	async function updateLocale(locale: Locale) {
		if ($userStore) {
			await userService.update($userStore.id, { ...$userStore, locale });
		}
		await setLocale(locale);
	}
</script>

<div class="px-3 py-2">
	<div class="grid gap-2">
		<Label for={controlId} class="text-sm font-medium leading-none">
			{m.language()}
		</Label>
		<Select.Root type="single" value={currentLocale} onValueChange={(v) => updateLocale(v as Locale)}>
			<Select.Trigger id={controlId} class="h-9 w-full justify-between" aria-label={m.common_select_locale()}>
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
