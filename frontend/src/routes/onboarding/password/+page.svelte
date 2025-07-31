<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { AlertCircle, ChevronRight } from '@lucide/svelte';
	import { preventDefault } from '$lib/utils/form.utils';
	import { userAPI } from '$lib/services/api';
	import { goto } from '$app/navigation';
	import settingsStore from '$lib/stores/config-store';
	import { settingsAPI } from '$lib/services/api';

	let { data } = $props();
	let currentSettings = $state(data.settings);

	async function continueToNextStep() {
		const updatedSettings = await settingsAPI.updateSettings({
			...currentSettings,
			onboardingCompleted: false,
			onboardingSteps: {
				...currentSettings.onboardingSteps,
				password: true
			}
		});

		currentSettings = updatedSettings;
		settingsStore.set(updatedSettings);

		goto('/onboarding/docker');
	}

	let password = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSubmit() {
		loading = true;
		error = '';

		if (!password || password.length < 8) {
			error = 'Password must be at least 8 characters long';
			loading = false;
			return;
		}

		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			loading = false;
			return;
		}

		try {
			await userAPI.changePassword({
				currentPassword: 'arcane-admin',
				newPassword: password
			});

			await continueToNextStep();
		} catch (err) {
			console.error('Error in handleSubmit:', err);
			error = err instanceof Error ? err.message : 'An unexpected error occurred';
		} finally {
			loading = false;
		}
	}
</script>

<div class="mx-auto max-w-lg">
	<h1 class="mb-8 text-center text-3xl font-bold">Change Admin Password</h1>

	<div class="mb-8 space-y-2">
		<p class="text-md text-center">
			For security reasons, please change the default admin password.
		</p>
	</div>

	{#if error}
		<Alert.Root class="mb-8" variant="destructive">
			<AlertCircle class="mr-2 size-5" />
			<Alert.Title>Error</Alert.Title>
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{/if}

	<form class="space-y-8" onsubmit={preventDefault(handleSubmit)}>
		<div class="space-y-6">
			<div class="space-y-4">
				<Label for="password" class="mb-2 block text-base">New Password</Label>
				<Input
					id="password"
					type="password"
					bind:value={password}
					placeholder="Enter new password"
					class="bg-muted/10 h-12 px-4"
					required
				/>
			</div>

			<div class="space-y-4">
				<Label for="confirmPassword" class="mb-2 block text-base">Confirm Password</Label>
				<Input
					id="confirmPassword"
					type="password"
					bind:value={confirmPassword}
					placeholder="Confirm new password"
					class="bg-muted/10 h-12 px-4"
					required
				/>
			</div>
		</div>

		<div class="flex justify-center pt-8">
			<Button type="submit" disabled={loading} class="flex h-12 w-[80%] items-center px-8">
				{#if loading}
					<span
						class="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent"
					></span>
				{/if}
				Continue
				<ChevronRight class="size-4" />
			</Button>
		</div>
	</form>
</div>
