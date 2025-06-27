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

	let isLoading = $state(false);

	let securitySettings = $state({
		authType: 'local',
		oidcIssuer: '',
		oidcClientId: '',
		oidcClientSecret: '',
		oidcScope: 'openid profile email',
		sessionTimeout: 24,
		requireTLS: false
	});

	async function handleNext() {
		isLoading = true;

		try {
			const authSettings = {
				type: securitySettings.authType as 'local' | 'oidc',
				sessionTimeout: securitySettings.sessionTimeout,
				...(securitySettings.authType === 'oidc' && {
					oidc: {
						issuer: securitySettings.oidcIssuer,
						clientId: securitySettings.oidcClientId,
						clientSecret: securitySettings.oidcClientSecret,
						scope: securitySettings.oidcScope
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
					<Select.Root
						selected={{
							value: securitySettings.authType,
							label: securitySettings.authType === 'local' ? 'Local Authentication' : 'OIDC/OAuth2'
						}}
						onSelectedChange={(v) => v && (securitySettings.authType = v.value)}
					>
						<Select.Trigger>
							<Select.Value placeholder="Select authentication type" />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="local">Local Authentication</Select.Item>
							<Select.Item value="oidc">OIDC/OAuth2</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>

				<div class="space-y-2">
					<Label for="session-timeout">Session Timeout (hours)</Label>
					<Select.Root
						selected={{
							value: securitySettings.sessionTimeout,
							label: `${securitySettings.sessionTimeout} hours`
						}}
						onSelectedChange={(v) => v && (securitySettings.sessionTimeout = v.value)}
					>
						<Select.Trigger>
							<Select.Value placeholder="Select timeout" />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value={1}>1 hour</Select.Item>
							<Select.Item value={8}>8 hours</Select.Item>
							<Select.Item value={24}>24 hours</Select.Item>
							<Select.Item value={168}>1 week</Select.Item>
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
						<Label for="oidc-issuer">OIDC Issuer URL</Label>
						<Input
							id="oidc-issuer"
							bind:value={securitySettings.oidcIssuer}
							placeholder="https://your-provider.com"
						/>
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
						<Label for="oidc-scope">Scope</Label>
						<Input
							id="oidc-scope"
							bind:value={securitySettings.oidcScope}
							placeholder="openid profile email"
						/>
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
