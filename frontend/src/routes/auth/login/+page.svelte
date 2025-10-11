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
	import settingsStore from '$lib/stores/config-store';
	import { m } from '$lib/paraglide/messages';
	import { settingsService } from '$lib/services/settings-service';
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
			// Load settings to determine onboarding redirect
			const settings = await settingsService.getSettings();
			settingsStore.set(settings);
			const redirectTo = data.redirectTo || '/dashboard';
			goto(!settings.onboardingCompleted ? '/onboarding/welcome' : redirectTo, { replaceState: true });
		} catch (err) {
			error = err instanceof Error ? err.message : 'Login failed';
		} finally {
			loading = false;
		}
	}

	const showDivider = $derived(showOidcLoginButton && showLocalLoginForm);
</script>

<div class="bg-muted flex min-h-screen flex-col items-center justify-center p-6 md:p-10">
	<div class="w-full max-w-sm md:max-w-3xl">
		<div class="flex flex-col gap-6">
			<Card.Root class="flex flex-col gap-6 overflow-hidden p-0">
				<Card.Content class="grid p-0 md:grid-cols-2">
					<div class={showOidcLoginButton && !showLocalLoginForm ? 'flex items-center justify-center p-6 md:p-8' : 'p-6 md:p-8'}>
						<div class="flex flex-col gap-6">
							<div class="flex flex-col items-center text-center">
								<h1 class="text-2xl font-bold">{m.auth_welcome_back_title()}</h1>
								<p class="text-muted-foreground text-balance">{m.auth_login_subtitle()}</p>
							</div>

							{#if data.error}
								<Alert.Root variant="destructive">
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
								<Alert.Root variant="destructive">
									<CircleAlertIcon class="size-4" />
									<Alert.Title>{m.auth_failed_title()}</Alert.Title>
									<Alert.Description>{error}</Alert.Description>
								</Alert.Root>
							{/if}

							{#if !showLocalLoginForm && !showOidcLoginButton}
								<Alert.Root variant="destructive">
									<CircleAlertIcon class="size-4" />
									<Alert.Title>{m.auth_no_login_methods_title()}</Alert.Title>
									<Alert.Description>{m.auth_no_login_methods_description()}</Alert.Description>
								</Alert.Root>
							{/if}

							{#if showOidcLoginButton && !showLocalLoginForm}
								<Button onclick={handleOidcLogin} class="w-full">
									<LogInIcon class="mr-2 size-4" />
									{m.auth_oidc_signin()}
								</Button>
							{/if}

							{#if showLocalLoginForm}
								<form onsubmit={handleLogin} class="contents">
									<div class="grid gap-3">
										<Label for="username">{m.common_username()}</Label>
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
												class="pl-9"
												placeholder={m.auth_username_placeholder()}
												disabled={loading}
											/>
										</div>
									</div>
									<div class="grid gap-3">
										<Label for="password">{m.common_password()}</Label>
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
												class="pl-9"
												placeholder={m.auth_password_placeholder()}
												disabled={loading}
											/>
										</div>
									</div>
									<Button type="submit" class="w-full" disabled={loading} aria-busy={loading}>
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
									<div
										class="after:border-border/60 relative my-2 text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t"
									>
										<span
											class="bg-card/70 text-muted-foreground supports-[backdrop-filter]:bg-card/50 relative z-10 inline-flex items-center rounded-full px-3 py-0.5 text-xs backdrop-blur"
										>
											{m.auth_or_continue()}
										</span>
									</div>
								{/if}

								{#if showOidcLoginButton && showDivider}
									<Button onclick={handleOidcLogin} variant="outline" class="w-full">
										<LogInIcon class="mr-2 size-4" />
										{m.auth_oidc_signin()}
									</Button>
								{/if}
							{/if}
						</div>
					</div>

					<div
						class="hidden h-full w-full bg-gradient-to-br from-blue-600/10 via-indigo-600/10 to-purple-600/10 md:flex md:items-center md:justify-center"
					>
						<div class="space-y-4 p-8 text-center">
							<div class="mb-8">
								<img class="mx-auto h-32 w-auto opacity-60" src={logoUrl} alt={m.layout_title()} />
							</div>
							<h2 class="text-foreground/80 text-2xl font-bold">{m.layout_title()}</h2>
							<p class="text-muted-foreground max-w-xs text-balance">{m.auth_tagline()}</p>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>

<div class="fixed bottom-0 left-0 right-0 p-4">
	<div class="text-muted-foreground text-balance text-center text-xs">
		<div class="flex items-center justify-center gap-4">
			<a
				href="https://github.com/ofkm/arcane"
				target="_blank"
				rel="noopener noreferrer"
				class="bg-card/70 text-muted-foreground supports-[backdrop-filter]:bg-card/50 hover:text-primary relative inline-flex items-center rounded-full px-3 py-0.5 text-xs backdrop-blur transition-colors"
			>
				{m.common_view_on_github()}
			</a>
		</div>
	</div>
</div>
