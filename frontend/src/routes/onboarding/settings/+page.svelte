<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Switch } from '$lib/components/ui/switch';
	import { settingsAPI } from '$lib/services/api';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { Loader2 } from '@lucide/svelte';

	let { data } = $props();
	let currentSettings = $state(data.settings);

	let isLoading = $state(false);

	let appSettings = $state({
		autoUpdate: true,
		autoUpdateInterval: '300',
		pruneMode: 'dangling',
		maturityThresholdDays: 30,
		baseServerUrl: ''
	});

	async function handleNext() {
		isLoading = true;

		try {
			await settingsAPI.updateSettings({
				...currentSettings,
				autoUpdateEnabled: appSettings.autoUpdate,
				autoUpdateInterval: parseInt(appSettings.autoUpdateInterval),
				dockerPruneMode: appSettings.pruneMode,
				baseServerUrl: appSettings.baseServerUrl,
				onboardingCompleted: false,
				onboardingSteps: {
					...currentSettings.onboardingSteps,
					settings: true
				}
			});

			goto('/onboarding/complete');
		} catch (error) {
			toast.error('Failed to save application settings');
		} finally {
			isLoading = false;
		}
	}

	function handleSkip() {
		goto('/onboarding/complete');
	}
</script>

<div class="space-y-6">
	<div class="text-center">
		<h2 class="text-2xl font-bold">Application Settings</h2>
		<p class="text-muted-foreground mt-2">Configure general application behavior and features</p>
	</div>

	<div class="grid gap-6 md:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<Card.Title>Auto Update</Card.Title>
				<Card.Description>Configure automatic updating of containers and stacks</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="flex items-center justify-between">
					<div class="space-y-0.5">
						<Label>Enable Auto Update</Label>
						<p class="text-xs text-muted-foreground">Automatically check for and apply updates</p>
					</div>
					<Switch bind:checked={appSettings.autoUpdate} />
				</div>

				{#if appSettings.autoUpdate}
					<div class="space-y-2">
						<Label>Update Interval</Label>
						<Select.Root type="single" bind:value={appSettings.autoUpdateInterval}>
							<Select.Trigger>
								{appSettings.autoUpdateInterval}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="300">5 minutes</Select.Item>
								<Select.Item value="900">15 minutes</Select.Item>
								<Select.Item value="1800">30 minutes</Select.Item>
								<Select.Item value="3600">1 hour</Select.Item>
								<Select.Item value="21600">6 hours</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>System Maintenance</Card.Title>
				<Card.Description>Configure system cleanup and maintenance settings</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="space-y-2">
					<Label>Prune Mode</Label>
					<Select.Root type="single" bind:value={appSettings.pruneMode}>
						<Select.Trigger>
							{appSettings.pruneMode}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="dangling">Dangling Only</Select.Item>
							<Select.Item value="all">All Unused</Select.Item>
						</Select.Content>
					</Select.Root>
					<p class="text-xs text-muted-foreground">
						How aggressive to be when pruning unused resources
					</p>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="md:col-span-2">
			<Card.Header>
				<Card.Title>Network Settings</Card.Title>
				<Card.Description>Configure network and URL settings</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="space-y-2">
					<Label for="base-server-url">Base Server URL (Optional)</Label>
					<Input
						id="base-server-url"
						bind:value={appSettings.baseServerUrl}
						placeholder="https://arcane.yourdomain.com"
					/>
					<p class="text-xs text-muted-foreground">
						Used for generating external links and webhooks. Leave empty for auto-detection.
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<div class="flex justify-between">
		<Button variant="outline" onclick={() => goto('/onboarding/security')}>Back</Button>
		<div class="flex gap-2">
			<Button variant="ghost" onclick={handleSkip}>Skip</Button>
			<Button onclick={handleNext} disabled={isLoading}>
				{#if isLoading}
					<Loader2 class="mr-2 size-4 animate-spin" />
				{/if}
				Complete Setup
			</Button>
		</div>
	</div>
</div>
