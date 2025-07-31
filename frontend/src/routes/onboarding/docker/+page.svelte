<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Select from '$lib/components/ui/select';
	import { Switch } from '$lib/components/ui/switch';
	import { settingsAPI } from '$lib/services/api';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { Loader2 } from '@lucide/svelte';

	let { data } = $props();
	let currentSettings = $state(data.settings);

	let isLoading = $state(false);

	let dockerSettings = $state({
		stacksDirectory: 'data/stacks',
		pollingEnabled: true,
		pollingInterval: '5'
	});

	async function handleNext() {
		isLoading = true;

		try {
			const currentSettings = await settingsAPI.getSettings();
			await settingsAPI.updateSettings({
				...currentSettings,
				stacksDirectory: dockerSettings.stacksDirectory,
				pollingEnabled: dockerSettings.pollingEnabled,
				pollingInterval: parseInt(dockerSettings.pollingInterval),
				onboardingCompleted: false,
				onboardingSteps: {
					...currentSettings.onboardingSteps,
					docker: true
				}
			});

			goto('/onboarding/security');
		} catch (error) {
			toast.error('Failed to save Docker settings');
		} finally {
			isLoading = false;
		}
	}

	function handleSkip() {
		goto('/onboarding/security');
	}
</script>

<div class="space-y-6">
	<div class="text-center">
		<h2 class="text-2xl font-bold">Docker Configuration</h2>
		<p class="text-muted-foreground mt-2">
			Configure how Arcane connects to your Docker environment
		</p>
	</div>

	<div class="grid gap-6 md:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<Card.Title>Basic Settings</Card.Title>
				<Card.Description>Configure the basic Docker connection settings</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="space-y-2">
					<Label for="stacks-directory">Stacks Directory</Label>
					<Input
						id="stacks-directory"
						bind:value={dockerSettings.stacksDirectory}
						placeholder="/opt/stacks"
					/>
					<p class="text-xs text-muted-foreground">
						Directory where Docker Compose files will be stored
					</p>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Polling Settings</Card.Title>
				<Card.Description>Configure how often Arcane checks Docker for updates</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="flex items-center justify-between">
					<div class="space-y-0.5">
						<Label>Enable Polling</Label>
						<p class="text-xs text-muted-foreground">Automatically refresh container states</p>
					</div>
					<Switch bind:checked={dockerSettings.pollingEnabled} />
				</div>

				{#if dockerSettings.pollingEnabled}
					<div class="space-y-2">
						<Label for="polling-interval">Polling Interval (seconds)</Label>
						<Select.Root type="single" bind:value={dockerSettings.pollingInterval}>
							<Select.Trigger>
								{dockerSettings.pollingInterval}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="5">5 seconds</Select.Item>
								<Select.Item value="10">10 seconds</Select.Item>
								<Select.Item value="30">30 seconds</Select.Item>
								<Select.Item value="60">1 minute</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>

	<div class="flex justify-between">
		<Button variant="outline" onclick={() => goto('/onboarding/password')}>Back</Button>
		<div class="flex gap-2">
			<Button variant="ghost" onclick={handleSkip}>Skip</Button>
			<Button onclick={handleNext} disabled={isLoading}>
				{#if isLoading}
					<Loader2 class="mr-2 size-4 animate-spin" />
				{/if}
				Next
			</Button>
		</div>
	</div>
</div>
