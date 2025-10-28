<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import InfoIcon from '@lucide/svelte/icons/info';
	import * as m from '$lib/paraglide/messages';

	let {
		open = $bindable(false),
		version,
		onConfirm,
		environmentName,
		upgrading = $bindable(false)
	}: {
		open?: boolean;
		version: string;
		onConfirm: () => void;
		environmentName?: string;
		upgrading?: boolean;
	} = $props();

	const isRemoteEnvironment = $derived(!!environmentName);
	const targetDescription = $derived(isRemoteEnvironment ? `remote environment "${environmentName}"` : m.upgrade_this_system());

	function handleConfirm() {
		upgrading = true;
		onConfirm();
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="sm:max-w-[500px]"
		onInteractOutside={(e: Event) => {
			if (upgrading) e.preventDefault();
		}}
	>
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				{#if upgrading}
					{m.upgrade_in_progress()}
				{:else}
					{m.upgrade_confirm_title()}
				{/if}
			</Dialog.Title>
			<Dialog.Description>
				{#if upgrading}
					{m.upgrade_wait_message()}
				{:else if isRemoteEnvironment}
					{m.upgrade_remote_description({ targetDescription, version })}
				{:else}
					{m.upgrade_confirm_description({ version })}
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		{#if upgrading}
			<div class="space-y-4 py-4">
				<div class="flex items-center justify-center gap-2 text-sm">
					<LoaderCircleIcon class="size-5 animate-spin text-blue-500" />
					<span class="font-medium">{m.upgrade_progress_message()}</span>
				</div>

				<div class="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/20">
					<p class="flex items-center gap-2 text-sm font-medium text-blue-800 dark:text-blue-200">
						<InfoIcon class="size-4" />
						{m.upgrade_reload_message()}
					</p>
				</div>
			</div>
		{:else}
			<div class="space-y-3 py-4">
				<p class="text-sm font-medium">{m.upgrade_confirm_what_happens()}</p>
				<ul class="text-muted-foreground list-inside list-disc space-y-1 text-sm">
					<li>{m.upgrade_step_pull()}</li>
					<li>{m.upgrade_step_stop()}</li>
					<li>{m.upgrade_step_start()}</li>
					<li>{m.upgrade_step_preserve()}</li>
				</ul>

				<div class="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950/20">
					<p class="flex items-center gap-2 text-sm font-medium text-orange-800 dark:text-orange-200">
						<AlertTriangleIcon class="size-4" />
						{m.upgrade_warning_interruption()}
					</p>
				</div>
			</div>

			<Dialog.Footer>
				<Button variant="outline" onclick={() => (open = false)}>
					{m.cancel()}
				</Button>
				<Button onclick={handleConfirm}>
					{m.upgrade_now()}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
