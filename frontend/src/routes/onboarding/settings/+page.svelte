<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { AlertCircle, ChevronRight } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import type { Settings } from '$lib/types/settings.type';
	import settingsStore from '$lib/stores/config-store';
	import { settingsAPI } from '$lib/services/api';

	let { data } = $props();
	let currentSettings = $state(data.settings);

	let error = $state('');
	let loading = $state(false);
	let dockerHost = $state(data.settings.dockerHost);
	let stacksDirectory = $state(data.settings.stacksDirectory);
	let pollingEnabled = $state(data.settings.pollingEnabled);
	let pollingInterval = $state(data.settings.pollingInterval);
	let autoUpdate = $state(data.settings.autoUpdate);

	function getUpdatedSettings(): Partial<Settings> {
		return {
			dockerHost,
			stacksDirectory,
			pollingEnabled,
			pollingInterval,
			autoUpdate,
			onboarding: {
				steps: {
					welcome: true,
					password: true,
					settings: true
				},
				completed: true,
				completedAt: new Date().toISOString()
			}
		};
	}

	async function continueToNextStep() {
		currentSettings = await settingsAPI.updateSettings({
			...currentSettings,
			...getUpdatedSettings()
		});

		settingsStore.reload();

		goto('/onboarding/complete', { invalidateAll: true });
	}
</script>

<div class="mx-auto max-w-2xl">
	<h1 class="mb-4 text-3xl font-bold">Initial Setup</h1>

	<p class="text-muted-foreground mb-6">Configure basic settings for Arcane. You can change these later from the Settings page.</p>

	{#if error}
		<Alert.Root class="mb-6" variant="destructive">
			<AlertCircle class="mr-2 size-4" />
			<Alert.Title>Error</Alert.Title>
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{/if}

	<form class="space-y-5" onsubmit={() => continueToNextStep()}>
		<Card.Root class="border shadow-sm">
			<Card.Header class="py-4">
				<Card.Title>Docker Connection</Card.Title>
				<Card.Description>Configure how Arcane connects to Docker</Card.Description>
			</Card.Header>
			<Card.Content class="pt-0 pb-4">
				<div class="space-y-3">
					<Label for="dockerHost" class="mb-2 block text-base">Docker Host</Label>
					<Input id="dockerHost" bind:value={dockerHost} placeholder="unix:///var/run/docker.sock" class="bg-muted/10 h-12 px-4" />
					<p class="text-muted-foreground text-xs">
						Examples: Unix: <code class="bg-muted/30 rounded px-1 py-0.5">unix:///var/run/docker.sock</code>
					</p>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border shadow-sm">
			<Card.Header class="py-4">
				<Card.Title>Monitoring & Updates</Card.Title>
				<Card.Description>Configure how Arcane monitors containers</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4 pt-0 pb-4">
				<div class="flex items-center justify-between rounded-lg border p-4">
					<div>
						<Label for="pollingSwitch" class="font-medium">Container Status Polling</Label>
						<p class="text-muted-foreground text-sm">Periodically check container status</p>
					</div>
					<Switch id="pollingSwitch" checked={pollingEnabled} onCheckedChange={(checked) => (pollingEnabled = checked)} />
				</div>

				{#if pollingEnabled}
					<div class="px-4">
						<Label for="pollingInterval" class="mb-2 block text-base">Polling Interval (minutes)</Label>
						<Input id="pollingInterval" type="number" bind:value={pollingInterval} min="5" max="60" class="bg-muted/10 h-12 px-4" />
						<p class="text-muted-foreground mt-1 text-xs">Set between 5-60 minutes.</p>
					</div>
				{/if}

				<div class="flex items-center justify-between rounded-lg border p-4">
					<div>
						<Label for="autoUpdateSwitch" class="font-medium">Auto Update Containers</Label>
						<p class="text-muted-foreground text-sm">Update containers when newer images are available</p>
					</div>
					<Switch id="autoUpdateSwitch" checked={autoUpdate} onCheckedChange={(checked) => (autoUpdate = checked)} />
				</div>
			</Card.Content>
		</Card.Root>

		<div class="flex justify-center pt-4">
			<Button type="submit" disabled={loading} class="flex h-12 w-[80%] items-center gap-2 px-8">
				{#if loading}
					<span class="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
				{/if}
				Continue
				<ChevronRight class="size-4" />
			</Button>
		</div>
	</form>
</div>
