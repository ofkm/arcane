<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Switch } from '$lib/components/ui/switch';
	import { Badge } from '$lib/components/ui/badge';
	import { settingsAPI } from '$lib/services/api';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import {
		Loader2,
		Shield,
		ChevronRight,
		Key,
		Clock,
		Globe,
		Lock,
		Users,
		CheckCircle2
	} from '@lucide/svelte';
	import { fade, fly, scale } from 'svelte/transition';

	let isLoading = $state(false);

	let securitySettings = $state({
		authType: 'local',
		oidcIssuer: '',
		oidcClientId: '',
		oidcClientSecret: '',
		oidcScope: 'openid profile email',
		sessionTimeout: '24',
		requireTLS: false
	});

	const securityFeatures = [
		{
			title: 'Authentication',
			description: 'User login and access control',
			icon: Key
		},
		{
			title: 'Session Management',
			description: 'Automatic timeout and security',
			icon: Clock
		},
		{
			title: 'External Identity',
			description: 'OIDC/OAuth2 integration',
			icon: Globe
		},
		{
			title: 'Encryption',
			description: 'TLS and secure communications',
			icon: Lock
		}
	];

	async function handleNext() {
		isLoading = true;

		try {
			const authSettings = {
				localAuthEnabled: securitySettings.authType === 'local',
				oidcEnabled: securitySettings.authType === 'oidc',
				sessionTimeout: parseInt(securitySettings.sessionTimeout),
				passwordPolicy: 'strong',
				rbacEnabled: false,
				...(securitySettings.authType === 'oidc' && {
					oidc: {
						clientId: securitySettings.oidcClientId,
						clientSecret: securitySettings.oidcClientSecret,
						redirectUri: `${window.location.origin}/auth/oidc/callback`,
						authorizationEndpoint: `${securitySettings.oidcIssuer}/auth`,
						tokenEndpoint: `${securitySettings.oidcIssuer}/token`,
						userinfoEndpoint: `${securitySettings.oidcIssuer}/userinfo`,
						scopes: securitySettings.oidcScope
					}
				})
			};

			await settingsAPI.updateSettings({
				auth: authSettings,
				onboarding: {
					completed: false,
					steps: {
						welcome: true,
						password: true,
						docker: true,
						security: true
					}
				}
			});

			goto('/onboarding/settings');
		} catch (error) {
			toast.error('Failed to save security settings');
		} finally {
			isLoading = false;
		}
	}

	function handleSkip() {
		goto('/onboarding/settings');
	}
</script>

<div class="step-content flex flex-col h-full">
	<!-- Header -->
	<div class="text-center mb-8" in:fade={{ duration: 600, delay: 200 }}>
		<div class="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
			<Shield class="size-8 text-primary" />
		</div>
		<h1 class="text-3xl font-bold mb-2">Security Configuration</h1>
		<p class="text-muted-foreground text-lg">
			Configure authentication and security settings to protect your Docker management interface.
		</p>
	</div>

	<!-- Security Overview -->
	<div class="mb-8" in:fly={{ y: 20, duration: 500, delay: 400 }}>
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			{#each securityFeatures as feature, i}
				<div
					class="group rounded-xl border bg-gradient-to-br from-card to-muted/20 p-4 transition-all duration-300 hover:shadow-lg"
					in:fly={{ y: 30, duration: 500, delay: 600 + i * 100 }}
				>
					<div class="flex items-start gap-3">
						<div
							class="bg-primary/10 mt-1 rounded-full p-2 group-hover:bg-primary/20 transition-colors duration-300"
						>
							<feature.icon class="text-primary size-4" />
						</div>
						<div class="flex-1">
							<h3 class="font-medium text-sm mb-1">{feature.title}</h3>
							<p class="text-xs text-muted-foreground">{feature.description}</p>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Configuration Cards -->
	<div class="flex-1 flex flex-col justify-center">
		<div class="grid gap-6 md:grid-cols-2 mb-8" in:fly={{ y: 20, duration: 500, delay: 800 }}>
			<!-- Authentication Settings -->
			<div class="space-y-6 p-6 rounded-xl border bg-card/50 backdrop-blur-sm">
				<div class="flex items-center gap-3 mb-4">
					<div class="bg-primary/10 rounded-full p-2">
						<Key class="size-5 text-primary" />
					</div>
					<div>
						<h2 class="text-xl font-semibold">Authentication</h2>
						<p class="text-sm text-muted-foreground">Choose your authentication method</p>
					</div>
				</div>

				<div class="space-y-4">
					<div class="space-y-2">
						<Label class="text-base font-medium">Authentication Type</Label>
						<Select.Root type="single" bind:value={securitySettings.authType}>
							<Select.Trigger class="h-12 border-2 focus:border-primary">
								{securitySettings.authType}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="local">
									<div class="flex items-center gap-2">
										<Users class="size-4" />
										Local Authentication
									</div>
								</Select.Item>
								<Select.Item value="oidc">
									<div class="flex items-center gap-2">
										<Globe class="size-4" />
										OIDC/OAuth2
									</div>
								</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>

					<div class="space-y-2">
						<Label for="session-timeout" class="text-base font-medium flex items-center gap-2">
							<Clock class="size-4" />
							Session Timeout
						</Label>
						<Select.Root type="single" bind:value={securitySettings.sessionTimeout}>
							<Select.Trigger class="h-12 border-2 focus:border-primary">
								{securitySettings.sessionTimeout}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="1">1 hour</Select.Item>
								<Select.Item value="8">8 hours</Select.Item>
								<Select.Item value="24">24 hours</Select.Item>
								<Select.Item value="168">1 week</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
				</div>
			</div>

			<!-- Authentication Provider Settings -->
			{#if securitySettings.authType === 'oidc'}
				<div
					class="space-y-6 p-6 rounded-xl border bg-card/50 backdrop-blur-sm"
					in:fade={{ duration: 300 }}
				>
					<div class="flex items-center gap-3 mb-4">
						<div class="bg-primary/10 rounded-full p-2">
							<Globe class="size-5 text-primary" />
						</div>
						<div>
							<h2 class="text-xl font-semibold">OIDC Configuration</h2>
							<p class="text-sm text-muted-foreground">Configure your OIDC/OAuth2 provider</p>
						</div>
					</div>

					<div class="space-y-4">
						<div class="space-y-2">
							<Label for="oidc-issuer" class="text-base font-medium">OIDC Issuer URL</Label>
							<Input
								id="oidc-issuer"
								bind:value={securitySettings.oidcIssuer}
								placeholder="https://your-provider.com"
								class="h-12 border-2 focus:border-primary transition-all duration-300"
							/>
							<p class="text-xs text-muted-foreground">
								The base URL of your OIDC provider (e.g., Keycloak, Auth0)
							</p>
						</div>

						<div class="space-y-2">
							<Label for="oidc-client-id" class="text-base font-medium">Client ID</Label>
							<Input
								id="oidc-client-id"
								bind:value={securitySettings.oidcClientId}
								placeholder="your-client-id"
								class="h-12 border-2 focus:border-primary transition-all duration-300"
							/>
						</div>

						<div class="space-y-2">
							<Label for="oidc-client-secret" class="text-base font-medium">Client Secret</Label>
							<Input
								id="oidc-client-secret"
								type="password"
								bind:value={securitySettings.oidcClientSecret}
								placeholder="your-client-secret"
								class="h-12 border-2 focus:border-primary transition-all duration-300"
							/>
						</div>

						<div class="space-y-2">
							<Label for="oidc-scope" class="text-base font-medium">Scopes</Label>
							<Input
								id="oidc-scope"
								bind:value={securitySettings.oidcScope}
								placeholder="openid profile email"
								class="h-12 border-2 focus:border-primary transition-all duration-300"
							/>
							<p class="text-xs text-muted-foreground">Space-separated list of OAuth scopes</p>
						</div>

						<div class="rounded-lg bg-muted/50 border p-4">
							<p class="text-xs text-muted-foreground">
								<strong>Redirect URI:</strong> The following URL will be automatically configured:
								<code class="block mt-1 rounded bg-background px-2 py-1 font-mono text-xs">
									{window.location.origin}/auth/oidc/callback
								</code>
							</p>
						</div>
					</div>
				</div>
			{:else}
				<div
					class="space-y-6 p-6 rounded-xl border bg-card/50 backdrop-blur-sm"
					in:fade={{ duration: 300 }}
				>
					<div class="flex items-center gap-3 mb-4">
						<div class="bg-primary/10 rounded-full p-2">
							<Users class="size-5 text-primary" />
						</div>
						<div>
							<h2 class="text-xl font-semibold">Local Authentication</h2>
							<p class="text-sm text-muted-foreground">Using built-in user management</p>
						</div>
					</div>

					<div class="space-y-4">
						<div class="rounded-lg bg-green-50 border border-green-200 p-4">
							<div class="flex items-start gap-3">
								<CheckCircle2 class="size-5 text-green-600 mt-0.5" />
								<div>
									<h3 class="font-medium text-green-900 mb-1">Ready to Use</h3>
									<p class="text-sm text-green-800">
										You're using local authentication with the admin password you set in the
										previous step. This provides secure access to your Docker management interface.
									</p>
								</div>
							</div>
						</div>

						<div class="space-y-3">
							<h4 class="font-medium text-sm">Current Configuration:</h4>
							<div class="space-y-2 text-sm">
								<div class="flex items-center justify-between p-2 rounded bg-muted/30">
									<span>Authentication Method:</span>
									<Badge variant="secondary">Local</Badge>
								</div>
								<div class="flex items-center justify-between p-2 rounded bg-muted/30">
									<span>Session Timeout:</span>
									<Badge variant="secondary">{securitySettings.sessionTimeout} hours</Badge>
								</div>
								<div class="flex items-center justify-between p-2 rounded bg-muted/30">
									<span>Password Policy:</span>
									<Badge variant="secondary">Strong</Badge>
								</div>
							</div>
						</div>

						<p class="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded p-3">
							<strong>Note:</strong> You can always switch to OIDC authentication later in the application
							settings.
						</p>
					</div>
				</div>
			{/if}
		</div>

		<!-- Security Summary -->
		<div
			class="rounded-lg bg-blue-50 border border-blue-200 p-4 mb-8"
			in:fly={{ y: 10, duration: 400, delay: 1000 }}
		>
			<h3 class="font-medium text-sm text-blue-900 flex items-center gap-2 mb-2">
				<Shield class="size-4" />
				Security Summary
			</h3>
			<div class="text-sm text-blue-800 grid gap-1 md:grid-cols-2">
				<div>
					• Authentication: {securitySettings.authType === 'local' ? 'Local' : 'OIDC/OAuth2'}
				</div>
				<div>• Session timeout: {securitySettings.sessionTimeout} hours</div>
				{#if securitySettings.authType === 'oidc' && securitySettings.oidcIssuer}
					<div>• OIDC Provider: {new URL(securitySettings.oidcIssuer).hostname}</div>
				{/if}
				<div>• Security: Enhanced protection enabled</div>
			</div>
		</div>
	</div>

	<!-- Navigation -->
	<div class="flex justify-between" in:fly={{ y: 20, duration: 500, delay: 1200 }}>
		<Button variant="outline" onclick={() => goto('/onboarding/docker')} class="h-12 px-6">
			Back
		</Button>
		<div class="flex gap-2">
			<Button variant="ghost" onclick={handleSkip} class="h-12 px-6">Skip</Button>
			<Button
				onclick={handleNext}
				disabled={isLoading}
				class="h-12 px-8 bg-gradient-to-r from-primary to-accent hover:shadow-lg transition-all duration-300 group"
			>
				{#if isLoading}
					<Loader2 class="mr-2 size-4 animate-spin" />
					Saving...
				{:else}
					Continue to Settings
					<ChevronRight
						class="ml-2 size-4 group-hover:translate-x-1 transition-transform duration-300"
					/>
				{/if}
			</Button>
		</div>
	</div>
</div>
