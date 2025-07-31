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
	import settingsStore from '$lib/stores/config-store';

	let { data } = $props();
	let currentSettings = $state(data.settings);

	let isLoading = $state(false);

	let securitySettings = $state({
		authType: 'local',
		oidcIssuerUrl: '',
		oidcClientId: '',
		oidcClientSecret: '',
		oidcScopes: 'openid email profile',
		sessionTimeout: '24'
	});

	async function handleNext() {
		isLoading = true;

		try {
			let authOidcConfig = '';
			if (securitySettings.authType === 'oidc') {
				authOidcConfig = JSON.stringify({
					clientId: securitySettings.oidcClientId,
					clientSecret: securitySettings.oidcClientSecret,
					issuerUrl: securitySettings.oidcIssuerUrl,
					scopes: securitySettings.oidcScopes
				});
			}

			const updatedSettings = await settingsAPI.updateSettings({
				...currentSettings,
				authLocalEnabled: securitySettings.authType === 'local',
				authOidcEnabled: securitySettings.authType === 'oidc',
				authSessionTimeout: parseInt(securitySettings.sessionTimeout) * 3600,
				authPasswordPolicy: 'strong',
				authRbacEnabled: false,
				authOidcConfig: authOidcConfig,
				onboardingCompleted: false,
				onboardingSteps: {
					...currentSettings.onboardingSteps,
					security: true
				}
			});

			currentSettings = updatedSettings;
			settingsStore.set(updatedSettings);

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

<div class="space-y-6">
	<div class="text-center">
		<h2 class="text-2xl font-bold">Security Configuration</h2>
		<p class="text-muted-foreground mt-2">Configure authentication and security settings</p>
	</div>

	<div class="grid gap-6 md:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<Card.Title>Authentication</Card.Title>
				<Card.Description>Choose your authentication method</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="space-y-2">
					<Label>Authentication Type</Label>
					<Select.Root type="single" bind:value={securitySettings.authType}>
						<Select.Trigger>
							{securitySettings.authType}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="local">Local Authentication</Select.Item>
							<Select.Item value="oidc">OIDC/OAuth2</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>

				<div class="space-y-2">
					<Label for="session-timeout">Session Timeout (hours)</Label>
					<Select.Root type="single" bind:value={securitySettings.sessionTimeout}>
						<Select.Trigger>
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
			</Card.Content>
		</Card.Root>

		{#if securitySettings.authType === 'oidc'}
			<Card.Root>
				<Card.Header>
					<Card.Title>OIDC Configuration</Card.Title>
					<Card.Description>Configure your OIDC/OAuth2 provider</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="space-y-2">
						<Label for="oidc-issuer-url">Issuer URL</Label>
						<Input
							id="oidc-issuer-url"
							bind:value={securitySettings.oidcIssuerUrl}
							placeholder="https://your-provider.com"
						/>
						<p class="text-xs text-muted-foreground">
							The base URL of your OIDC provider (e.g., Keycloak, Auth0)
						</p>
					</div>

					<div class="space-y-2">
						<Label for="oidc-client-id">Client ID</Label>
						<Input
							id="oidc-client-id"
							bind:value={securitySettings.oidcClientId}
							placeholder="your-client-id"
						/>
					</div>

					<div class="space-y-2">
						<Label for="oidc-client-secret">Client Secret</Label>
						<Input
							id="oidc-client-secret"
							type="password"
							bind:value={securitySettings.oidcClientSecret}
							placeholder="your-client-secret"
						/>
					</div>

					<div class="space-y-2">
						<Label for="oidc-scopes">Scopes</Label>
						<Input
							id="oidc-scopes"
							bind:value={securitySettings.oidcScopes}
							placeholder="openid email profile"
						/>
						<p class="text-xs text-muted-foreground">Space-separated list of OAuth scopes</p>
					</div>

					<div class="rounded-lg bg-muted/50 p-3">
						<p class="text-xs text-muted-foreground">
							<strong>Note:</strong> The redirect URI will be automatically set to:
							<code class="rounded bg-background px-1"
								>{window.location.origin}/auth/oidc/callback</code
							>
						</p>
					</div>
				</Card.Content>
			</Card.Root>
		{:else}
			<Card.Root>
				<Card.Header>
					<Card.Title>Local Authentication</Card.Title>
					<Card.Description>Using local username/password authentication</Card.Description>
				</Card.Header>
				<Card.Content>
					<p class="text-sm text-muted-foreground">
						You're using local authentication with the admin password you set in the previous step.
						You can always switch to OIDC later in the settings.
					</p>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>

	<div class="flex justify-between">
		<Button variant="outline" onclick={() => goto('/onboarding/docker')}>Back</Button>
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
