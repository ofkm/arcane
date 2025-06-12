<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { AlertCircle, LogIn, Lock, User } from '@lucide/svelte';
	import type { PageData } from './$types';
	import { goto, invalidateAll } from '$app/navigation';
	import { env } from '$env/dynamic/public';
	import { authService } from '$lib/services/api/auth-api-service';

	let { data }: { data: PageData } = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);
	let username = $state('');
	let password = $state('');

	const oidcForcedByEnv = env.PUBLIC_OIDC_ENABLED === 'true';
	const oidcEnabledBySettings = data.settings?.auth?.oidcEnabled === true;
	const showOidcLoginButton = $derived(oidcForcedByEnv || oidcEnabledBySettings);

	const localAuthEnabledBySettings = data.settings?.auth?.localAuthEnabled !== false;
	const showLocalLoginForm = $derived(localAuthEnabledBySettings);

	function handleOidcLogin() {
		const currentRedirect = data.redirectTo || '/';
		goto(`/auth/oidc/login?redirect=${encodeURIComponent(currentRedirect)}`);
	}

	async function handleLogin(event: Event) {
		event.preventDefault();

		if (!username || !password) {
			error = 'Please enter both username and password';
			return;
		}

		loading = true;
		error = null;

		try {
			await authService.login({ username, password });
			await invalidateAll();
			const redirectTo = data.redirectTo || '/';
			goto(redirectTo);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Login failed';
		} finally {
			loading = false;
		}
	}

	const showDivider = $derived(showOidcLoginButton && showLocalLoginForm);
</script>

<div class="bg-background/50 flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
	<div class="w-full max-w-md space-y-8">
		<!-- Logo and Title -->
		<div class="text-center">
			<div class="flex justify-center">
				<img class="h-40 w-auto" src="/img/arcane.svg" alt="Arcane" />
			</div>
			<h1 class="text-2xl font-bold tracking-tight">Sign in to Arcane</h1>
			<p class="text-muted-foreground mt-2 text-sm">Manage your Container Environment</p>
		</div>

		<!-- Login Card -->
		<div class="bg-card rounded-xl border p-6 shadow-sm sm:p-8">
			<!-- Error Messages -->
			{#if data.error}
				<Alert.Root class="mb-6" variant="destructive">
					<AlertCircle class="mr-2 size-4" />
					<Alert.Title>Login Problem</Alert.Title>
					<Alert.Description>
						{#if data.error === 'oidc_invalid_response'}
							There was an issue with the OIDC login response. Please try again.
						{:else if data.error === 'oidc_misconfigured'}
							OIDC is not configured correctly on the server. Please contact an administrator.
						{:else if data.error === 'oidc_userinfo_failed'}
							Could not retrieve your user information from the OIDC provider.
						{:else if data.error === 'oidc_missing_sub'}
							Your OIDC provider did not return a subject identifier.
						{:else if data.error === 'oidc_email_collision'}
							An account with your email already exists but is linked to a different OIDC identity. Please contact an administrator.
						{:else if data.error === 'oidc_token_error'}
							There was an error obtaining tokens from the OIDC provider.
						{:else if data.error === 'user_processing_failed'}
							An error occurred while processing your user account.
						{:else}
							An unexpected error occurred. Please try again.
						{/if}
					</Alert.Description>
				</Alert.Root>
			{/if}

			{#if error}
				<Alert.Root class="mb-6" variant="destructive">
					<AlertCircle class="mr-2 size-4" />
					<Alert.Title>Authentication Failed</Alert.Title>
					<Alert.Description>{error}</Alert.Description>
				</Alert.Root>
			{/if}

			{#if !showLocalLoginForm && !showOidcLoginButton}
				<Alert.Root variant="destructive">
					<AlertCircle class="mr-2 size-4" />
					<Alert.Title>No Login Methods Configured</Alert.Title>
					<Alert.Description>There are currently no login methods enabled. Please contact an administrator.</Alert.Description>
				</Alert.Root>
			{/if}

			<!-- OIDC Login Button (when only OIDC is available) -->
			{#if showOidcLoginButton && !showLocalLoginForm}
				<div class="pt-2">
					<Button onclick={handleOidcLogin} variant="default" class="arcane-button-restart w-full py-6 text-base">
						<LogIn class="mr-3 size-5" />
						Sign in with OIDC Provider
					</Button>
				</div>
			{/if}

			<!-- Local Login Form -->
			{#if showLocalLoginForm}
				<form onsubmit={handleLogin} class="space-y-6">
					<div class="space-y-4">
						<!-- Username Field -->
						<div>
							<Label for="username" class="mb-1.5 block text-sm font-medium">Username</Label>
							<div class="relative">
								<div class="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
									<User class="size-4" />
								</div>
								<Input id="username" name="username" type="text" autocomplete="username" required bind:value={username} class="pl-10" placeholder="Enter your username or email" disabled={loading} />
							</div>
						</div>

						<!-- Password Field -->
						<div>
							<Label for="password" class="mb-1.5 block text-sm font-medium">Password</Label>
							<div class="relative">
								<div class="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
									<Lock class="size-4" />
								</div>
								<Input id="password" name="password" type="password" autocomplete="current-password" required bind:value={password} class="pl-10" placeholder="Enter your password" disabled={loading} />
							</div>
						</div>
					</div>

					<!-- Sign In Button -->
					<div class="pt-2">
						<Button type="submit" class="arcane-button-create w-full py-6 text-base" disabled={loading} aria-busy={loading}>
							{#if loading}
								<div class="mr-2 size-4 animate-spin rounded-full border-2 border-t-transparent"></div>
							{/if}
							Sign in
						</Button>
					</div>
				</form>

				<!-- Divider -->
				{#if showDivider}
					<div class="relative my-8">
						<div class="absolute inset-0 flex items-center">
							<div class="border-border w-full border-t"></div>
						</div>
						<div class="relative flex justify-center text-xs">
							<span class="bg-card text-muted-foreground px-4">Or continue with</span>
						</div>
					</div>
				{/if}

				<!-- OIDC Login Button (when both methods are available) -->
				{#if showOidcLoginButton && showDivider}
					<Button onclick={handleOidcLogin} variant="outline" class="arcane-button-restart w-full py-5">
						<LogIn class="mr-2 size-4" />
						Sign in with OIDC Provider
					</Button>
				{/if}
			{/if}
		</div>

		<!-- Footer Text -->
		<p class="text-muted-foreground text-center text-xs">
			<a href="https://github.com/ofkm/arcane" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">View on GitHub</a>
		</p>
	</div>
</div>
