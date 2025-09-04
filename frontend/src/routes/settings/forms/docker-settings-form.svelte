<script lang="ts">
	import ZapIcon from '@lucide/svelte/icons/zap';
	import InfoIcon from '@lucide/svelte/icons/info';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { toast } from 'svelte-sonner';
	import type { Settings } from '$lib/types/settings.type';
	import FormInput from '$lib/components/form/form-input.svelte';
	import { z } from 'zod/v4';
	import { createForm, preventDefault } from '$lib/utils/form.utils';
	import { Button } from '$lib/components/ui/button';
	import SwitchWithLabel from '$lib/components/form/labeled-switch.svelte';

	let {
		callback,
		settings
	}: {
		settings: Settings;
		callback: (appConfig: Partial<Settings>) => Promise<void>;
	} = $props();

	let isLoading = $state(false);

	const formSchema = z.object({
		pollingEnabled: z.boolean(),
		pollingInterval: z.number().int(),
		autoUpdate: z.boolean(),
		autoUpdateInterval: z.number().int(),
		dockerPruneMode: z.enum(['all', 'dangling'])
	});

	let { inputs: formInputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, settings));

	async function onSubmit() {
		const data = form.validate();
		if (!data) return;
		isLoading = true;

		await callback(data).finally(() => (isLoading = false));
		toast.success('Settings Updated Succesfully');
	}

	let pruneModeValue = $derived($formInputs.dockerPruneMode.value);
</script>

{#if settings.autoUpdate && settings.pollingEnabled}
	<div class="settings-alert">
		<Alert.Root variant="warning">
			<ZapIcon class="size-4" />
			<Alert.Title>Auto-update Enabled</Alert.Title>
			<Alert.Description>Automatic container updates are active with polling enabled</Alert.Description>
		</Alert.Root>
	</div>
{/if}

<form onsubmit={preventDefault(onSubmit)}>
	<fieldset class="flex flex-col gap-5">
		<div class="mt-5 flex justify-end">
			<Button type="submit">Save</Button>
		</div>
		<div class="flex flex-col gap-5">
			<SwitchWithLabel
				id="pollingEnabled"
				label="Enable Image Polling"
				description="Periodically check registries for newer image versions"
				bind:checked={$formInputs.pollingEnabled.value}
			/>
			{#if $formInputs.pollingEnabled.value}
				<FormInput
					bind:input={$formInputs.pollingInterval}
					type="number"
					id="pollingInterval"
					label="Polling Interval (minutes)"
					placeholder="60"
					description="How often to check for new images (5-1440 minutes)"
				/>

				{#if $formInputs.pollingInterval.value < 30}
					<Alert.Root variant="warning">
						<ZapIcon class="size-4" />
						<Alert.Title>Rate Limiting Warning</Alert.Title>
						<Alert.Description
							>Polling intervals below 30 minutes may trigger rate limits on Docker registries, potentially blocking your account
							temporarily. Consider using longer intervals for production environments.</Alert.Description
						>
					</Alert.Root>
				{/if}

				<SwitchWithLabel
					id="autoUpdateSwitch"
					label="Auto-update Containers"
					description="Automatically update containers when newer images are found"
					bind:checked={$formInputs.autoUpdate.value}
				/>

				{#if $formInputs.autoUpdate.value}
					<FormInput
						bind:input={$formInputs.autoUpdateInterval}
						type="number"
						id="autoUpdateInterval"
						label="Auto-update Interval (minutes)"
						placeholder="60"
						description="How often to perform automatic updates (5-1440 minutes)"
					/>
				{/if}

				<Alert.Root>
					<InfoIcon />
					<Alert.Title>Automation Summary</Alert.Title>
					<Alert.Description>
						<ul class="list-inside list-disc text-sm">
							{#if $formInputs.autoUpdate.value}
								<li>Images checked every {$formInputs.pollingInterval.value || 60} minutes</li>
							{:else}
								<li>Manual updates only (auto-update disabled)</li>
							{/if}
						</ul>
					</Alert.Description>
				</Alert.Root>
			{/if}
			<Label for="pruneMode" class="text-base font-medium">Prune Action Behavior</Label>

			<RadioGroup.Root value={$formInputs.dockerPruneMode.value} class="space-y-3" id="pruneMode">
				<div class="hover:bg-muted/50 flex items-start space-x-3 rounded-lg border p-3 transition-colors">
					<RadioGroup.Item value="all" id="prune-all" class="mt-0.5" />
					<div class="space-y-1">
						<Label for="prune-all" class="cursor-pointer font-medium">All Unused Images</Label>
						<p class="text-muted-foreground text-sm">
							Remove all images not referenced by containers (equivalent to <code
								class="bg-background rounded px-1 py-0.5 text-xs">docker image prune -a</code
							>)
						</p>
					</div>
				</div>

				<div class="hover:bg-muted/50 flex items-start space-x-3 rounded-lg border p-3 transition-colors">
					<RadioGroup.Item value="dangling" id="prune-dangling" class="mt-0.5" />
					<div class="space-y-1">
						<Label for="prune-dangling" class="cursor-pointer font-medium">Dangling Images Only</Label>
						<p class="text-muted-foreground text-sm">
							Remove only untagged images (equivalent to <code class="bg-background rounded px-1 py-0.5 text-xs"
								>docker image prune</code
							>)
						</p>
					</div>
				</div>
			</RadioGroup.Root>
			<p class="text-muted-foreground text-sm">
				<strong>Note:</strong> This setting affects the "Prune Unused Images" action on the Images page.
				{pruneModeValue === 'all'
					? 'All unused images will be removed, which frees up more space but may require re-downloading images later.'
					: 'Only dangling images will be removed, which is safer but may leave some unused images behind.'}
			</p>
		</div>
	</fieldset>
</form>
