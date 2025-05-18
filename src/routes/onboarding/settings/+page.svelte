<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { AlertCircle, ChevronRight } from '@lucide/svelte';
	import { settingsStore, saveSettingsToServer, updateSettingsStore } from '$lib/stores/settings-store';
	import { preventDefault } from '$lib/utils/form.utils';
	import { goto } from '$app/navigation';
	import { isDev } from '$lib/constants';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let error = $state('');
	let loading = $state(false);

	onMount(() => {
		if (browser && !$settingsStore.onboarding?.steps?.password) {
			goto('/onboarding/welcome');
			return;
		}

		updateSettingsStore({
			onboarding: {
				...$settingsStore.onboarding,
				completed: $settingsStore.onboarding?.completed ?? false,
				completedAt: $settingsStore.onboarding?.completedAt ?? '',
				steps: {
					...$settingsStore.onboarding?.steps,
					password: true
				}
			}
		});
	});

	let dockerHost = $derived($settingsStore.dockerHost || 'unix:///var/run/docker.sock');
	let pollingEnabled = $derived($settingsStore.pollingEnabled !== undefined ? $settingsStore.pollingEnabled : true);
	let pollingInterval = $derived($settingsStore.pollingInterval || 10);
	let autoUpdate = $derived($settingsStore.autoUpdate !== undefined ? $settingsStore.autoUpdate : false);

	const defaultStacksDirectory = isDev ? './.dev-data/stacks' : 'data/stacks';

	async function handleSubmit() {
		loading = true;
		error = '';

		try {
			const currentSettings = { ...$settingsStore };

			const settingsPayload = {
				dockerHost,
				stacksDirectory: currentSettings.stacksDirectory || defaultStacksDirectory,
				pollingEnabled,
				pollingInterval: parseInt(pollingInterval.toString()),
				autoUpdate,
				autoUpdateInterval: 60,
				pruneMode: 'all' as 'all' | 'dangling',
				registryCredentials: [],
				auth: {
					...(currentSettings.auth || {}),
					localAuthEnabled: true,
					sessionTimeout: 30,
					passwordPolicy: 'strong' as 'basic' | 'standard' | 'strong',
					rbacEnabled: false
				},
				onboarding: {
					completed: true,
					completedAt: new Date().toISOString(),
					steps: {
						...(currentSettings.onboarding?.steps || {}),
						welcome: true,
						password: true,
						settings: true
					}
				}
			};

			updateSettingsStore(settingsPayload);

			await saveSettingsToServer();

			goto('/onboarding/complete');
		} catch (err) {
			error = err instanceof Error ? err.message : 'An unexpected error occurred';
			console.error('Error saving settings:', err);
		} finally {
			loading = false;
		}
	}
</script>

<div class="max-w-2xl mx-auto">
	<h1 class="text-3xl font-bold mb-4">Initial Setup</h1>

	<p class="mb-6 text-muted-foreground">Configure basic settings for Arcane. You can change these later from the Settings page.</p>

	{#if error}
		<Alert.Root class="mb-6" variant="destructive">
			<AlertCircle class="mr-2 size-4" />
			<Alert.Title>Error</Alert.Title>
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{/if}

	<form class="space-y-5" onsubmit={preventDefault(handleSubmit)}>
		<Card.Root class="border shadow-sm">
			<Card.Header class="py-4">
				<Card.Title>Docker Connection</Card.Title>
				<Card.Description>Configure how Arcane connects to Docker</Card.Description>
			</Card.Header>
			<Card.Content class="pt-0 pb-4">
				<div class="space-y-3">
					<Label for="dockerHost" class="text-base block mb-2">Docker Host</Label>
					<Input id="dockerHost" bind:value={dockerHost} placeholder="unix:///var/run/docker.sock" class="px-4 bg-muted/10 h-12" />
					<p class="text-xs text-muted-foreground">
						Examples: Unix: <code class="bg-muted/30 px-1 py-0.5 rounded">unix:///var/run/docker.sock</code>
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
						<p class="text-sm text-muted-foreground">Periodically check container status</p>
					</div>
					<Switch id="pollingSwitch" checked={pollingEnabled} onCheckedChange={(checked) => (pollingEnabled = checked)} />
				</div>

				{#if pollingEnabled}
					<div class="px-4">
						<Label for="pollingInterval" class="text-base block mb-2">Polling Interval (minutes)</Label>
						<Input id="pollingInterval" type="number" bind:value={pollingInterval} min="5" max="60" class="px-4 bg-muted/10 h-12" />
						<p class="text-xs text-muted-foreground mt-1">Set between 5-60 minutes.</p>
					</div>
				{/if}

				<div class="flex items-center justify-between rounded-lg border p-4">
					<div>
						<Label for="autoUpdateSwitch" class="font-medium">Auto Update Containers</Label>
						<p class="text-sm text-muted-foreground">Update containers when newer images are available</p>
					</div>
					<Switch id="autoUpdateSwitch" checked={autoUpdate} onCheckedChange={(checked) => (autoUpdate = checked)} />
				</div>
			</Card.Content>
		</Card.Root>

		<div class="flex justify-center pt-4">
			<Button type="submit" disabled={loading} class="px-8 flex items-center gap-2 h-12 w-[80%]">
				{#if loading}
					<span class="inline-block border-2 border-t-transparent border-white rounded-full animate-spin size-4"></span>
				{/if}
				Continue
				<ChevronRight class="size-4" />
			</Button>
		</div>
	</form>
</div>
