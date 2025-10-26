<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import CircleAlertIcon from '@lucide/svelte/icons/alert-circle';
	import LogInIcon from '@lucide/svelte/icons/log-in';
	import LockIcon from '@lucide/svelte/icons/lock';
	import UserIcon from '@lucide/svelte/icons/user';
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import userStore from '$lib/stores/user-store';
	import { m } from '$lib/paraglide/messages';
	import { authService } from '$lib/services/auth-service';
	import { getApplicationLogo } from '$lib/utils/image.util';

	let { data }: { data: PageData } = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);
	let username = $state('');
	let password = $state('');

	// Make logo URL reactive to accent color changes
	let logoUrl = $derived(getApplicationLogo());

	const oidcEnabledBySettings = data.settings?.authOidcEnabled === true;
	const showOidcLoginButton = $derived(oidcEnabledBySettings);

	const localAuthEnabledBySettings = data.settings?.authLocalEnabled !== false;
	const showLocalLoginForm = $derived(localAuthEnabledBySettings);

	function handleOidcLogin() {
		const currentRedirect = data.redirectTo || '/dashboard';
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
			const user = await authService.login({ username, password });
			userStore.setUser(user);
			const redirectTo = data.redirectTo || '/dashboard';
			goto(redirectTo, { replaceState: true });
		} catch (err) {
			error = err instanceof Error ? err.message : 'Login failed';
		} finally {
			loading = false;
		}
	}

	const showDivider = $derived(showOidcLoginButton && showLocalLoginForm);

	// Add random delay for each orb to create natural animation
	const orb1Delay = Math.random() * 2;
	const orb2Delay = Math.random() * 2;
	const orb3Delay = Math.random() * 2;
	const orb4Delay = Math.random() * 2;
</script>

<div class="fixed inset-0 overflow-hidden">
	<div class="orb orb-1" style="--orb-delay: {orb1Delay}s;"></div>
	<div class="orb orb-2" style="--orb-delay: {orb2Delay}s;"></div>
	<div class="orb orb-3" style="--orb-delay: {orb3Delay}s;"></div>
	<div class="orb orb-4" style="--orb-delay: {orb4Delay}s;"></div>
</div>

<div class="relative flex min-h-screen flex-col items-center justify-center p-6 md:p-10">
	<div class="w-full max-w-md">
		<div class="mb-8 flex justify-center">
			<div class="glass-light bubble bubble-shadow-lg flex items-center justify-center rounded-2xl p-6">
				<img class="h-24 w-auto" src={logoUrl} alt={m.layout_title()} />
			</div>
		</div>

		<Card.Root class="bubble bubble-shadow-lg flex flex-col gap-6 overflow-hidden">
			<Card.Content class="p-8">
				<div class="mb-8 flex flex-col items-center text-center">
					<h1 class="text-3xl font-bold tracking-tight">{m.auth_welcome_back_title()}</h1>
					<p class="text-muted-foreground mt-2 text-balance text-sm">{m.auth_login_subtitle()}</p>
				</div>

				<div class="space-y-4">
					{#if data.error}
						<Alert.Root variant="destructive" class="glass-light">
							<CircleAlertIcon class="size-4" />
							<Alert.Title>{m.auth_login_problem_title()}</Alert.Title>
							<Alert.Description>
								{#if data.error === 'oidc_invalid_response'}
									{m.auth_oidc_invalid_response()}
								{:else if data.error === 'oidc_misconfigured'}
									{m.auth_oidc_misconfigured()}
								{:else if data.error === 'oidc_userinfo_failed'}
									{m.auth_oidc_userinfo_failed()}
								{:else if data.error === 'oidc_missing_sub'}
									{m.auth_oidc_missing_sub()}
								{:else if data.error === 'oidc_email_collision'}
									{m.auth_oidc_email_collision()}
								{:else if data.error === 'oidc_token_error'}
									{m.auth_oidc_token_error()}
								{:else if data.error === 'user_processing_failed'}
									{m.auth_user_processing_failed()}
								{:else}
									{m.auth_unexpected_error()}
								{/if}
							</Alert.Description>
						</Alert.Root>
					{/if}

					{#if error}
						<Alert.Root variant="destructive" class="glass-light">
							<CircleAlertIcon class="size-4" />
							<Alert.Title>{m.auth_failed_title()}</Alert.Title>
							<Alert.Description>{error}</Alert.Description>
						</Alert.Root>
					{/if}

					{#if !showLocalLoginForm && !showOidcLoginButton}
						<Alert.Root variant="destructive" class="glass-light">
							<CircleAlertIcon class="size-4" />
							<Alert.Title>{m.auth_no_login_methods_title()}</Alert.Title>
							<Alert.Description>{m.auth_no_login_methods_description()}</Alert.Description>
						</Alert.Root>
					{/if}

					{#if showOidcLoginButton && !showLocalLoginForm}
						<Button onclick={handleOidcLogin} class="hover-lift w-full" size="lg">
							<LogInIcon class="mr-2 size-4" />
							{m.auth_oidc_signin()}
						</Button>
					{/if}

					{#if showLocalLoginForm}
						<form onsubmit={handleLogin} class="space-y-4">
							<div class="space-y-2">
								<Label for="username" class="text-xs">{m.common_username()}</Label>
								<div class="relative">
									<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
										<UserIcon class="text-muted-foreground size-4" />
									</div>
									<Input
										id="username"
										name="username"
										type="text"
										autocomplete="username"
										required
										bind:value={username}
										class="glass-light pl-9"
										placeholder={m.auth_username_placeholder()}
										disabled={loading}
									/>
								</div>
							</div>
							<div class="space-y-2">
								<Label for="password" class="text-xs">{m.common_password()}</Label>
								<div class="relative">
									<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
										<LockIcon class="text-muted-foreground size-4" />
									</div>
									<Input
										id="password"
										name="password"
										type="password"
										autocomplete="current-password"
										required
										bind:value={password}
										class="glass-light pl-9"
										placeholder={m.auth_password_placeholder()}
										disabled={loading}
									/>
								</div>
							</div>
							<Button type="submit" class="hover-lift w-full" size="lg" disabled={loading} aria-busy={loading}>
								{#if loading}
									<div class="mr-2 size-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
									{m.auth_signing_in()}
								{:else}
									<LogInIcon class="mr-2 size-4" />
									{m.auth_signin_button()}
								{/if}
							</Button>
						</form>

						{#if showDivider}
							<div class="relative my-4">
								<div class="absolute inset-0 flex items-center">
									<div class="w-full border-t border-border/60"></div>
								</div>
								<div class="relative flex justify-center text-xs">
									<span class="glass-light bubble-pill text-muted-foreground px-3 py-1">
										{m.auth_or_continue()}
									</span>
								</div>
							</div>
						{/if}

						{#if showOidcLoginButton && showDivider}
							<Button onclick={handleOidcLogin} variant="outline" class="hover-lift w-full" size="lg">
								<LogInIcon class="mr-2 size-4" />
								{m.auth_oidc_signin()}
							</Button>
						{/if}
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>

<div class="fixed bottom-4 left-0 right-0 p-4">
	<div class="text-muted-foreground flex items-center justify-center">
		<a
			href="https://github.com/ofkm/arcane"
			target="_blank"
			rel="noopener noreferrer"
			class="glass-light bubble-pill text-xs hover:text-primary transition-colors"
		>
			{m.common_view_on_github()}
		</a>
	</div>
</div>

<style>
	.orb {
		position: absolute;
		border-radius: 50%;
		filter: blur(85px);
		opacity: 0.3;
		animation: orb-float 15s ease-in-out infinite;
		animation-delay: var(--orb-delay, 0s);
	}

	.orb-1 {
		width: 500px;
		height: 500px;
		background: var(--primary);
		left: 10%;
		top: -150px;
		animation-duration: 18s;
	}

	.orb-2 {
		width: 420px;
		height: 420px;
		background: var(--primary);
		right: 15%;
		bottom: -150px;
		animation-duration: 22s;
	}

	.orb-3 {
		width: 380px;
		height: 380px;
		background: var(--primary);
		right: -120px;
		top: 20%;
		animation-duration: 20s;
	}

	.orb-4 {
		width: 320px;
		height: 320px;
		background: var(--primary);
		left: -100px;
		bottom: 30%;
		animation-duration: 16s;
	}

	@keyframes orb-float {
		0% {
			transform: translate(0, 0) scale(1);
		}
		25% {
			transform: translate(80px, -60px) scale(1.15);
		}
		50% {
			transform: translate(40px, 40px) scale(0.95);
		}
		75% {
			transform: translate(-60px, 80px) scale(1.1);
		}
		100% {
			transform: translate(0, 0) scale(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.orb {
			animation: none;
		}
	}
</style>
