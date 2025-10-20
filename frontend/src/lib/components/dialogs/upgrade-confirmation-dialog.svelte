<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle';
	import * as m from '$lib/paraglide/messages';

	let {
		open = $bindable(false),
		version,
		onConfirm,
		environmentName
	}: {
		open?: boolean;
		version: string;
		onConfirm: () => void;
		environmentName?: string;
	} = $props();

	const isRemoteEnvironment = $derived(!!environmentName);
	const targetDescription = $derived(
		isRemoteEnvironment 
			? `remote environment "${environmentName}"` 
			: 'this system'
	);
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[500px]">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<AlertTriangleIcon class="size-5 text-orange-500" />
				{m.upgrade_confirm_title()}
			</Dialog.Title>
			<Dialog.Description>
				{#if isRemoteEnvironment}
					You are about to upgrade {targetDescription} to v{version}.
				{:else}
					{m.upgrade_confirm_description({ version })}
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-3 py-4">
			<p class="text-sm font-medium">{m.upgrade_confirm_what_happens()}</p>
			<ul class="text-muted-foreground list-inside list-disc space-y-1 text-sm">
				<li>{m.upgrade_step_pull()}</li>
				<li>{m.upgrade_step_stop()}</li>
				<li>{m.upgrade_step_start()}</li>
				<li>{m.upgrade_step_preserve()}</li>
			</ul>

			<div class="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950/20">
				<p class="text-sm font-medium text-orange-800 dark:text-orange-200">
					⚠️ {m.upgrade_warning_interruption()}
				</p>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>
				{m.cancel()}
			</Button>
			<Button
				onclick={() => {
					onConfirm();
					open = false;
				}}
			>
				{m.upgrade_now()}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
