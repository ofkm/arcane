<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { AlertCircle, ChevronRight, Shield, Eye, EyeOff } from '@lucide/svelte';
	import { preventDefault } from '$lib/utils/form.utils';
	import { userAPI } from '$lib/services/api';
	import { goto } from '$app/navigation';
	import type { Settings } from '$lib/types/settings.type';
	import settingsStore from '$lib/stores/config-store';
	import { settingsAPI } from '$lib/services/api';
	import { fade, fly, scale } from 'svelte/transition';

	let { data } = $props();
	let currentSettings = $state(data.settings);

	const updatedSettings: Partial<Settings> = {
		onboarding: {
			steps: {
				welcome: true,
				password: true,
				settings: false
			},
			completed: false
		}
	};

	let password = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let loading = $state(false);
	let showPassword = $state(false);
	let showConfirmPassword = $state(false);

	const passwordStrength = $derived(() => {
		if (!password) return { strength: 0, label: '', color: '' };

		let score = 0;
		if (password.length >= 8) score++;
		if (/[A-Z]/.test(password)) score++;
		if (/[a-z]/.test(password)) score++;
		if (/[0-9]/.test(password)) score++;
		if (/[^A-Za-z0-9]/.test(password)) score++;

		const levels = [
			{ strength: 0, label: 'Very Weak', color: 'bg-red-500' },
			{ strength: 1, label: 'Weak', color: 'bg-orange-500' },
			{ strength: 2, label: 'Fair', color: 'bg-yellow-500' },
			{ strength: 3, label: 'Good', color: 'bg-blue-500' },
			{ strength: 4, label: 'Strong', color: 'bg-green-500' },
			{ strength: 5, label: 'Very Strong', color: 'bg-green-600' }
		];

		return levels[score];
	});

	async function continueToNextStep() {
		currentSettings = await settingsAPI.updateSettings({
			...currentSettings,
			...updatedSettings
		});

		settingsStore.reload();
		goto('/onboarding/docker');
	}

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
			goto('/onboarding/docker', { invalidateAll: true });
		} catch (err) {
			console.error('Error in handleSubmit:', err);
			error = err instanceof Error ? err.message : 'An unexpected error occurred';
		} finally {
			loading = false;
		}
	}
</script>

<div class="step-content flex flex-col h-full">
	<!-- Header -->
	<div class="text-center mb-8" in:fade={{ duration: 600, delay: 200 }}>
		<div class="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
			<Shield class="size-8 text-primary" />
		</div>
		<h1 class="text-3xl font-bold mb-2">Secure Your Account</h1>
		<p class="text-muted-foreground text-lg">
			For security reasons, please change the default admin password to something secure and
			memorable.
		</p>
	</div>

	<!-- Error Alert -->
	{#if error}
		<div in:scale={{ duration: 300, start: 0.95 }}>
			<Alert.Root class="mb-6" variant="destructive">
				<AlertCircle class="size-4" />
				<Alert.Title>Error</Alert.Title>
				<Alert.Description>{error}</Alert.Description>
			</Alert.Root>
		</div>
	{/if}

	<!-- Form -->
	<div class="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
		<form
			class="space-y-6"
			onsubmit={preventDefault(handleSubmit)}
			in:fly={{ y: 20, duration: 500, delay: 400 }}
		>
			<!-- New Password Field -->
			<div class="space-y-2">
				<Label for="password" class="text-base font-medium">New Password</Label>
				<div class="relative">
					<Input
						id="password"
						type={showPassword ? 'text' : 'password'}
						bind:value={password}
						placeholder="Enter your new password"
						class="pr-12 h-12 text-lg border-2 focus:border-primary transition-all duration-300"
						required
					/>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						class="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
						onclick={() => (showPassword = !showPassword)}
					>
						{#if showPassword}
							<EyeOff class="size-4" />
						{:else}
							<Eye class="size-4" />
						{/if}
					</Button>
				</div>

				<!-- Password Strength Indicator -->
				{#if password}
					<div class="space-y-2" in:fade={{ duration: 300 }}>
						<div class="flex items-center justify-between text-sm">
							<span class="text-muted-foreground">Password strength:</span>
							<span class={`font-medium ${passwordStrength().color.replace('bg-', 'text-')}`}>
								{passwordStrength().label}
							</span>
						</div>
						<div class="h-2 bg-muted rounded-full overflow-hidden">
							<div
								class={`h-full transition-all duration-500 ${passwordStrength().color}`}
								style="width: {(passwordStrength().strength / 5) * 100}%"
							></div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Confirm Password Field -->
			<div class="space-y-2">
				<Label for="confirmPassword" class="text-base font-medium">Confirm Password</Label>
				<div class="relative">
					<Input
						id="confirmPassword"
						type={showConfirmPassword ? 'text' : 'password'}
						bind:value={confirmPassword}
						placeholder="Confirm your new password"
						class="pr-12 h-12 text-lg border-2 focus:border-primary transition-all duration-300"
						required
					/>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						class="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
						onclick={() => (showConfirmPassword = !showConfirmPassword)}
					>
						{#if showConfirmPassword}
							<EyeOff class="size-4" />
						{:else}
							<Eye class="size-4" />
						{/if}
					</Button>
				</div>

				<!-- Password Match Indicator -->
				{#if confirmPassword}
					<div in:fade={{ duration: 300 }}>
						{#if password === confirmPassword}
							<div class="text-sm text-green-600 flex items-center gap-2">
								<div class="size-4 bg-green-600 rounded-full flex items-center justify-center">
									<div class="size-2 bg-white rounded-full"></div>
								</div>
								Passwords match
							</div>
						{:else}
							<div class="text-sm text-red-600 flex items-center gap-2">
								<div class="size-4 bg-red-600 rounded-full flex items-center justify-center">
									<div class="size-1 bg-white rounded-full"></div>
								</div>
								Passwords don't match
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Security Tips -->
			<div
				class="rounded-lg bg-muted/50 border p-4 space-y-2"
				in:fly={{ y: 10, duration: 400, delay: 600 }}
			>
				<h3 class="font-medium text-sm">Password Tips:</h3>
				<ul class="text-sm text-muted-foreground space-y-1">
					<li class="flex items-center gap-2">
						<div
							class={`size-1.5 rounded-full ${password.length >= 8 ? 'bg-green-500' : 'bg-muted'}`}
						></div>
						At least 8 characters long
					</li>
					<li class="flex items-center gap-2">
						<div
							class={`size-1.5 rounded-full ${/[A-Z]/.test(password) ? 'bg-green-500' : 'bg-muted'}`}
						></div>
						Include uppercase letters
					</li>
					<li class="flex items-center gap-2">
						<div
							class={`size-1.5 rounded-full ${/[0-9]/.test(password) ? 'bg-green-500' : 'bg-muted'}`}
						></div>
						Include numbers
					</li>
				</ul>
			</div>

			<!-- Submit Button -->
			<Button
				type="submit"
				disabled={loading || !password || !confirmPassword || password !== confirmPassword}
				class="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-accent hover:shadow-lg transition-all duration-300 group"
			>
				<span class="flex items-center gap-2">
					{#if loading}
						<div
							class="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
						></div>
						Securing Account...
					{:else}
						Continue
						<ChevronRight
							class="size-4 group-hover:translate-x-1 transition-transform duration-300"
						/>
					{/if}
				</span>
			</Button>
		</form>
	</div>
</div>
