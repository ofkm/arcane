<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { AlertCircle, ChevronRight } from '@lucide/svelte';
	import { preventDefault } from '$lib/utils/form.utils';

	let password = '';
	let confirmPassword = '';
	let error = '';
	let loading = false;

	async function handleSubmit() {
		loading = true;
		error = '';

		// Validate passwords
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
			// Call API to change password
			const response = await fetch('/api/users/password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					currentPassword: 'arcane-admin', // Default password
					newPassword: password
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to change password');
			}

			// Redirect to next step
			window.location.href = '/onboarding/settings';
		} catch (err) {
			error = err instanceof Error ? err.message : 'An unexpected error occurred';
		} finally {
			loading = false;
		}
	}
</script>

<div class="max-w-lg mx-auto">
	<h1 class="text-3xl font-bold mb-8 text-center">Change Admin Password</h1>

	<div class="mb-8 space-y-2">
		<p class="text-center text-lg">For security reasons, please change the default admin password.</p>
		<p class="text-center text-muted-foreground">
			Your account currently uses the default password: <code class="bg-muted/30 px-1.5 py-0.5 rounded">arcane-admin</code>
		</p>
	</div>

	{#if error}
		<Alert.Root class="mb-8" variant="destructive">
			<AlertCircle class="h-5 w-5 mr-2" />
			<Alert.Title>Error</Alert.Title>
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{/if}

	<form class="space-y-8" onsubmit={preventDefault(handleSubmit)}>
		<div class="space-y-6">
			<div class="space-y-4">
				<Label for="password" class="text-base block mb-2">New Password</Label>
				<Input id="password" type="password" bind:value={password} placeholder="Enter new password" class="h-12 px-4 bg-muted/10" required />
			</div>

			<div class="space-y-4">
				<Label for="confirmPassword" class="text-base block mb-2">Confirm Password</Label>
				<Input id="confirmPassword" type="password" bind:value={confirmPassword} placeholder="Confirm new password" class="h-12 px-4 bg-muted/10" required />
			</div>
		</div>

		<div class="flex justify-between pt-8">
			<Button href="/onboarding/welcome" variant="outline" class="h-12 px-6">Back</Button>
			<Button type="submit" disabled={loading} class="h-12 px-8 flex items-center gap-2">
				{#if loading}
					<span class="inline-block w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
				{/if}
				Continue
				<ChevronRight class="h-4 w-4 ml-1" />
			</Button>
		</div>
	</form>
</div>
