<script lang="ts">
	import { onMount } from 'svelte'; // Import onMount
	import { env as publicEnv } from '$env/dynamic/public'; // Import public env
	import type { PageData } from '../$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Lock, Key, AlertTriangle, Info } from '@lucide/svelte';
	import { settingsStore, saveSettingsToServer } from '$lib/stores/settings-store';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { toast } from 'svelte-sonner';

	let { data } = $props<{ data: PageData }>();

	const isOidcForcedByPublicEnv = publicEnv.PUBLIC_OIDC_ENABLED === 'true';

	let showOidcConfigDialog = $state(false);
	let oidcConfigForm = $state({
		clientId: data.settings?.auth?.oidc?.clientId || '',
		clientSecret: '',
		redirectUri: data.settings?.auth?.oidc?.redirectUri || 'http://localhost:3000/auth/oidc/callback',
		authorizationEndpoint: data.settings?.auth?.oidc?.authorizationEndpoint || '',
		tokenEndpoint: data.settings?.auth?.oidc?.tokenEndpoint || '',
		userinfoEndpoint: data.settings?.auth?.oidc?.userinfoEndpoint || '',
		scopes: data.settings?.auth?.oidc?.scopes || 'openid email profile'
	});

	let isOidcViewMode = $derived(data.oidcEnvVarsConfigured);
	let oidcConfiguredViaAppSettings = $derived(!!(data.settings?.auth?.oidc?.clientId && data.settings?.auth?.oidc?.redirectUri && data.settings?.auth?.oidc?.authorizationEndpoint && data.settings?.auth?.oidc?.tokenEndpoint));

	onMount(() => {
		if (isOidcForcedByPublicEnv) {
			if (!$settingsStore.auth?.oidcEnabled) {
				settingsStore.update((current) => ({
					...current,
					auth: {
						...(current.auth || {}),
						oidcEnabled: true
					}
				}));
			}
			if (!data.oidcEnvVarsConfigured) {
				showOidcConfigDialog = true;
			}
		}
	});

	function handleOidcSwitchChange(checked: boolean) {
		settingsStore.update((current) => ({
			...current,
			auth: {
				...(current.auth || {}),
				oidcEnabled: checked
			}
		}));

		if (checked && !data.oidcEnvVarsConfigured) {
			showOidcConfigDialog = true;
		}
	}

	function openOidcDialog() {
		showOidcConfigDialog = true;
	}

	async function handleSaveOidcConfig() {
		try {
			settingsStore.update((current) => {
				const existingAuth = { ...(current.auth || {}) };
				const newOidcConfig = {
					clientId: oidcConfigForm.clientId,
					clientSecret: oidcConfigForm.clientSecret,
					redirectUri: oidcConfigForm.redirectUri,
					authorizationEndpoint: oidcConfigForm.authorizationEndpoint,
					tokenEndpoint: oidcConfigForm.tokenEndpoint,
					userinfoEndpoint: oidcConfigForm.userinfoEndpoint,
					scopes: oidcConfigForm.scopes
				};

				return {
					...current,
					auth: {
						...existingAuth,
						oidcEnabled: true,
						oidc: newOidcConfig
					}
				};
			});

			await saveSettingsToServer();

			toast.success('OIDC configuration saved successfully.');
			showOidcConfigDialog = false;
		} catch (error) {
			console.error('Failed to save OIDC configuration:', error);
			toast.error('Failed to save OIDC configuration.', {
				description: error instanceof Error ? error.message : 'An unknown error occurred.'
			});
		}
	}
</script>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
	<Card.Root class="border shadow-sm">
		<Card.Header class="pb-3">
			<div class="flex items-center gap-2">
				<div class="bg-indigo-500/10 p-2 rounded-full">
					<Lock class="h-5 w-5 text-indigo-500" />
				</div>
				<div>
					<Card.Title>Authentication Methods</Card.Title>
					<Card.Description>Configure how users sign in</Card.Description>
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			<div class="space-y-4">
				<div class="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
					<div class="space-y-0.5">
						<label for="localAuthSwitch" class="text-base font-medium">Local Authentication</label>
						<p class="text-sm text-muted-foreground">Username and password stored in the system</p>
						<p class="text-xs text-muted-foreground mt-1">This is recommended to be enabled as a fallback option if OIDC authentication is unavailable.</p>
					</div>
					<Switch
						id="localAuthSwitch"
						checked={$settingsStore.auth?.localAuthEnabled ?? true}
						onCheckedChange={(checked) => {
							settingsStore.update((current) => ({
								...current,
								auth: {
									...(current.auth || {}),
									localAuthEnabled: checked
								}
							}));
						}}
					/>
				</div>
				<div class="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
					<div class="space-y-0.5">
						<label for="oidcAuthSwitch" class="text-base font-medium">OIDC Authentication</label>
						<p class="text-sm text-muted-foreground">
							Use an External OIDC Provider
							{#if isOidcForcedByPublicEnv}
								<span class="text-xs text-muted-foreground">(Forced ON by environment)</span>
							{/if}
						</p>
						{#if isOidcForcedByPublicEnv || $settingsStore.auth?.oidcEnabled}
							{#if isOidcForcedByPublicEnv && !data.oidcEnvVarsConfigured}
								<Button variant="link" class="p-0 h-auto text-xs text-destructive hover:underline" onclick={openOidcDialog}>
									<AlertTriangle class="h-3 w-3 mr-1" />
									OIDC is forced ON, but critical server settings are missing. Click for details.
								</Button>
							{:else if data.oidcEnvVarsConfigured}
								<Button variant="link" class="p-0 h-auto text-xs text-sky-600 hover:underline" onclick={openOidcDialog}>
									<Info class="h-3 w-3 mr-1" />
									OIDC is configured on server. View Status.
								</Button>
							{:else if oidcConfiguredViaAppSettings}
								<Button variant="link" class="p-0 h-auto text-xs text-sky-600 hover:underline" onclick={openOidcDialog}>
									<Info class="h-3 w-3 mr-1" />
									OIDC configured via application settings. Click to Manage Them.
								</Button>
							{:else if !showOidcConfigDialog}
								<!-- This case: Not forced by public env, store has it enabled, but neither server vars nor app settings are fully configured -->
								<Button variant="link" class="p-0 h-auto text-xs text-destructive hover:underline" onclick={openOidcDialog}>
									<AlertTriangle class="h-3 w-3 mr-1" />
									OIDC application settings not configured. Click to configure.
								</Button>
							{/if}
						{/if}
					</div>
					<Switch id="oidcAuthSwitch" checked={isOidcForcedByPublicEnv || ($settingsStore.auth?.oidcEnabled ?? false)} disabled={isOidcForcedByPublicEnv} onCheckedChange={handleOidcSwitchChange} />
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- OIDC Configuration/Status Dialog -->
	<Dialog.Root bind:open={showOidcConfigDialog}>
		<Dialog.Content class="sm:max-w-[600px]">
			<Dialog.Header>
				<Dialog.Title
					>{#if isOidcViewMode}OIDC Configuration Status{:else}Configure OIDC Provider{/if}</Dialog.Title
				>
				<Dialog.Description>
					{#if isOidcViewMode}
						OIDC authentication is configured using server-side environment variables.
						{#if $settingsStore.auth?.oidcEnabled}
							It is currently active.
						{:else if isOidcForcedByPublicEnv}
							It is forced ON by environment variables but may require application settings to be saved if this is the first run.
						{:else}
							It is configured but currently disabled in application settings. You can enable it using the switch.
						{/if}
						<p class="mt-2">The following OIDC settings are loaded from the server environment:</p>
						<ul class="list-disc list-inside mt-1 text-xs space-y-1">
							{#if data.settings?.auth?.oidc}
								<li><strong>Client ID:</strong> {data.settings.auth.oidc.clientId}</li>
								<li><strong>Client Secret:</strong> <span class="italic text-muted-foreground">(Sensitive - Not Displayed)</span></li>
								<li><strong>Redirect URI:</strong> {data.settings.auth.oidc.redirectUri}</li>
								<li><strong>Authorization Endpoint:</strong> {data.settings.auth.oidc.authorizationEndpoint}</li>
								<li><strong>Token Endpoint:</strong> {data.settings.auth.oidc.tokenEndpoint}</li>
								<li><strong>User Info Endpoint:</strong> {data.settings.auth.oidc.userinfoEndpoint}</li>
								<li><strong>Scopes:</strong> {data.settings.auth.oidc.scopes}</li>
							{:else}
								<li><span class="text-destructive">OIDC configuration details not found in settings.</span></li>
							{/if}
						</ul>
						<p class="mt-2 text-xs">Changes to these settings must be made in your server's environment configuration.</p>
					{:else}
						Configure the OIDC settings for your application. These settings will be saved and used for OIDC authentication.
						{#if isOidcForcedByPublicEnv && !data.oidcEnvVarsConfigured}
							<br />
							<strong class="text-orange-600 text-xs mt-1 block">OIDC usage is currently forced ON by <code>PUBLIC_OIDC_ENABLED</code>, but critical server-side OIDC environment variables appear to be missing. Please configure them below and save, or ensure the corresponding server environment variables are set.</strong>
						{:else if isOidcForcedByPublicEnv}
							<br />
							<strong class="text-orange-600 text-xs mt-1 block">OIDC usage is currently forced ON by <code>PUBLIC_OIDC_ENABLED</code>.</strong>
						{/if}
					{/if}
				</Dialog.Description>
			</Dialog.Header>

			{#if !isOidcViewMode}
				<!-- Form for setup/configuration -->
				<div class="grid gap-4 py-4 max-h-[50vh] overflow-y-auto pr-2">
					<div class="grid grid-cols-4 items-center gap-4">
						<Label for="oidcClientId" class="text-right col-span-1">Client ID</Label>
						<Input id="oidcClientId" bind:value={oidcConfigForm.clientId} class="col-span-3" placeholder="Provided by your OIDC Provider" />
					</div>
					<div class="grid grid-cols-4 items-center gap-4">
						<Label for="oidcClientSecret" class="text-right col-span-1">Client Secret</Label>
						<Input id="oidcClientSecret" type="password" bind:value={oidcConfigForm.clientSecret} class="col-span-3" placeholder="Provided by your OIDC Provider" />
					</div>
					<div class="grid grid-cols-4 items-center gap-4">
						<Label for="oidcRedirectUri" class="text-right col-span-1">Redirect URI</Label>
						<Input id="oidcRedirectUri" bind:value={oidcConfigForm.redirectUri} placeholder="e.g., http://localhost:3000/auth/oidc/callback" class="col-span-3" />
					</div>
					<div class="grid grid-cols-4 items-center gap-4">
						<Label for="oidcAuthEndpoint" class="text-right col-span-1">Authorization URL</Label>
						<Input id="oidcAuthEndpoint" bind:value={oidcConfigForm.authorizationEndpoint} class="col-span-3" placeholder="OIDC Provider's Authorization Endpoint" />
					</div>
					<div class="grid grid-cols-4 items-center gap-4">
						<Label for="oidcTokenEndpoint" class="text-right col-span-1">Token URL</Label>
						<Input id="oidcTokenEndpoint" bind:value={oidcConfigForm.tokenEndpoint} class="col-span-3" placeholder="OIDC Provider's Token Endpoint" />
					</div>
					<div class="grid grid-cols-4 items-center gap-4">
						<Label for="oidcUserinfoEndpoint" class="text-right col-span-1">User Info URL</Label>
						<Input id="oidcUserinfoEndpoint" bind:value={oidcConfigForm.userinfoEndpoint} class="col-span-3" placeholder="OIDC Provider's UserInfo Endpoint" />
					</div>
					<div class="grid grid-cols-4 items-center gap-4">
						<Label for="oidcScopes" class="text-right col-span-1">Scopes</Label>
						<Input id="oidcScopes" bind:value={oidcConfigForm.scopes} placeholder="e.g., openid email profile" class="col-span-3" />
					</div>
				</div>
			{/if}

			<Dialog.Footer>
				<Button variant="outline" onclick={() => (showOidcConfigDialog = false)}>Close</Button>
				{#if !isOidcViewMode}
					<Button onclick={handleSaveOidcConfig}>Save Configuration</Button>
				{/if}
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>

	<div class="space-y-6">
		<Card.Root class="border shadow-sm">
			<Card.Header class="pb-3">
				<div class="flex items-center gap-2">
					<div class="bg-cyan-500/10 p-2 rounded-full">
						<Key class="h-5 w-5 text-cyan-500" />
					</div>
					<div>
						<Card.Title>Session Settings</Card.Title>
						<Card.Description>Configure session behavior</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="space-y-4">
					<div class="space-y-2">
						<label for="sessionTimeout" class="text-sm font-medium">Session Timeout (minutes)</label>
						<Input
							type="number"
							id="sessionTimeout"
							name="sessionTimeout"
							value={$settingsStore.auth?.sessionTimeout ?? 60}
							min="15"
							max="1440"
							oninput={(event) => {
								const target = event.target as HTMLInputElement;
								settingsStore.update((current) => ({
									...current,
									auth: {
										...(current.auth ?? {}),
										sessionTimeout: parseInt(target.value)
									}
								}));
							}}
						/>
						<p class="text-xs text-muted-foreground">Time until inactive sessions are automatically logged out (15-1440 minutes)</p>
					</div>

					<div class="space-y-2">
						<label for="passwordPolicy" class="text-sm font-medium">Password Policy</label>
						<div class="grid grid-cols-3 gap-2">
							<Button
								variant={($settingsStore.auth?.passwordPolicy || 'strong') === 'basic' ? 'default' : 'outline'}
								class="w-full"
								onclick={() => {
									settingsStore.update((current) => ({
										...current,
										auth: {
											...current.auth,
											passwordPolicy: 'basic'
										}
									}));
								}}>Basic</Button
							>
							<Button
								variant={($settingsStore.auth?.passwordPolicy || 'strong') === 'standard' ? 'default' : 'outline'}
								class="w-full"
								onclick={() => {
									settingsStore.update((current) => ({
										...current,
										auth: {
											...current.auth,
											passwordPolicy: 'standard'
										}
									}));
								}}>Standard</Button
							>
							<Button
								variant={($settingsStore.auth?.passwordPolicy || 'strong') === 'strong' ? 'default' : 'outline'}
								class="w-full"
								onclick={() => {
									settingsStore.update((current) => ({
										...current,
										auth: {
											...current.auth,
											passwordPolicy: 'strong'
										}
									}));
								}}>Strong</Button
							>
						</div>
						<input type="hidden" id="passwordPolicy" name="passwordPolicy" value={$settingsStore.auth?.passwordPolicy || 'strong'} />
						<p class="text-xs text-muted-foreground mt-1">
							{#if $settingsStore.auth?.passwordPolicy === 'basic'}
								Basic: Minimum 8 characters
							{:else if $settingsStore.auth?.passwordPolicy === 'standard'}
								Standard: Minimum 10 characters, requires mixed case and numbers
							{:else}
								Strong: Minimum 12 characters, requires mixed case, numbers and special characters
							{/if}
						</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
