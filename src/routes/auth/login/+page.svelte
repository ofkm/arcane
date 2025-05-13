<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { AlertCircle, LogIn } from '@lucide/svelte';
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { env } from '$env/dynamic/public';

	type ActionData = {
		error?: string;
		username?: string;
	};

	let { data, form }: { data: PageData; form: ActionData | null } = $props();

	let loading = $state(false);

	const oidcForcedByEnv = env.PUBLIC_OIDC_ENABLED === 'true';
	const oidcEnabledBySettings = data.settings?.auth?.oidcEnabled === true;
	const showOidcLoginButton = $derived(oidcForcedByEnv || oidcEnabledBySettings);

	const localAuthEnabledBySettings = data.settings?.auth?.localAuthEnabled !== false;
	const showLocalLoginForm = $derived(localAuthEnabledBySettings);

	function handleOidcLogin() {
		const currentRedirect = data.redirectTo || '/';
		goto(`/auth/oidc/login?redirect=${encodeURIComponent(currentRedirect)}`);
	}

	const showDivider = $derived(showOidcLoginButton && showLocalLoginForm);
</script>

<div class="flex max-h-screen flex-col justify-center my-auto py-12 sm:px-6 lg:px-8">
	<div class="mx-auto w-full max-w-md">
		<img class="h-40 w-auto mx-auto" src="/img/arcane.png" alt="Arcane" />
		<h2 class="mt-2 text-center text-2xl font-bold leading-9 tracking-tight">Sign in to Arcane</h2>
	</div>

	<div class="mt-10 mx-auto w-full max-w-[480px]">
		<div class="bg-card px-6 py-5 shadow sm:rounded-lg sm:px-12">
			{#if data.error}
				<Alert.Root class="mb-4" variant="destructive">
					<AlertCircle class="h-4 w-4 mr-2" />
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
			{#if form?.error}
				<Alert.Root class="mb-4" variant="destructive">
					<AlertCircle class="h-4 w-4 mr-2" />
					<Alert.Title>Authentication Failed</Alert.Title>
					<Alert.Description>{form.error}</Alert.Description>
				</Alert.Root>
			{/if}

			{#if !showLocalLoginForm && !showOidcLoginButton}
				<Alert.Root variant="destructive">
					<AlertCircle class="h-4 w-4 mr-2" />
					<Alert.Title>No Login Methods Configured</Alert.Title>
					<Alert.Description>There are currently no login methods enabled. Please contact an administrator.</Alert.Description>
				</Alert.Root>
			{/if}

			{#if showLocalLoginForm}
				<form
					class="space-y-6"
					method="POST"
					action="?/login"
					use:enhance={() => {
						loading = true;
						return async ({ result, update }) => {
							loading = false;
							if (result.type === 'error') {
								console.error('An unexpected error occurred during login form submission');
							}
							if (result.type !== 'redirect') {
								await update();
							}
						};
					}}
				>
					<input type="hidden" name="redirectTo" value={data.redirectTo} />
					<div>
						<Label for="username" class="block text-sm font-medium leading-6">Username or Email</Label>
						<div class="mt-2">
							<Input id="username" name="username" type="text" autocomplete="username" required value={form?.username ?? ''} />
						</div>
					</div>

					<div>
						<Label for="password" class="block text-sm font-medium leading-6">Password</Label>
						<div class="mt-2">
							<Input id="password" name="password" type="password" autocomplete="current-password" required />
						</div>
					</div>

					<div>
						<Button type="submit" class="w-full" disabled={loading} aria-busy={loading}>
							{#if loading}
								<span class="loading loading-spinner loading-xs mr-2"></span>
							{/if}
							Sign in
						</Button>
					</div>
				</form>
			{/if}

			{#if showDivider}
				<div class="mt-6">
					<div class="relative">
						<div class="absolute inset-0 flex items-center">
							<div class="w-full border-t border-border"></div>
						</div>
						<div class="relative flex justify-center text-sm">
							<span class="bg-card px-2 text-muted-foreground">Or continue with</span>
						</div>
					</div>
				</div>
			{/if}

			{#if showOidcLoginButton}
				<div class="mt-6 {showLocalLoginForm ? '' : 'pt-0'}">
					<Button onclick={handleOidcLogin} variant="outline" class="w-full">
						<LogIn class="mr-2 h-4 w-4" />
						Sign in with OIDC Provider
					</Button>
				</div>
			{/if}
		</div>
	</div>
</div>
