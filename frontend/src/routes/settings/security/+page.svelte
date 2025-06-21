<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Lock, Key, AlertTriangle, Info, Save, RefreshCw } from '@lucide/svelte';
	import settingsStore from '$lib/stores/config-store';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import type { Settings } from '$lib/types/settings.type';
	import { settingsAPI } from '$lib/services/api';

	let { data }: { data: PageData } = $props();
	let currentSettings = $state(data.settings);

	let showOidcConfigDialog = $state(false);
	let oidcConfigForm = $state({
		clientId: '',
		clientSecret: '',
		redirectUri: 'http://localhost:3000/auth/oidc/callback',
		authorizationEndpoint: '',
		tokenEndpoint: '',
		userinfoEndpoint: '',
		scopes: 'openid email profile'
	});

	let localAuthEnabled = $state(true);
	let oidcEnabled = $state(false);
	let sessionTimeout = $state(60);
	let passwordPolicy = $state('strong');

	let isLoading = $state({
		saving: false
	});

	let isOidcViewMode = $derived(data.oidcStatus.envForced && data.oidcStatus.envConfigured);

	$effect(() => {
		localAuthEnabled = currentSettings.auth?.localAuthEnabled ?? true;
		oidcEnabled = currentSettings.auth?.oidcEnabled ?? false;
		sessionTimeout = currentSettings.auth?.sessionTimeout ?? 60;
		passwordPolicy = currentSettings.auth?.passwordPolicy ?? 'strong';

		oidcConfigForm.clientId = currentSettings.auth?.oidc?.clientId || '';
		oidcConfigForm.redirectUri = currentSettings.auth?.oidc?.redirectUri || 'http://localhost:3000/auth/oidc/callback';
		oidcConfigForm.authorizationEndpoint = currentSettings.auth?.oidc?.authorizationEndpoint || '';
		oidcConfigForm.tokenEndpoint = currentSettings.auth?.oidc?.tokenEndpoint || '';
		oidcConfigForm.userinfoEndpoint = currentSettings.auth?.oidc?.userinfoEndpoint || '';
		oidcConfigForm.scopes = currentSettings.auth?.oidc?.scopes || 'openid email profile';
		oidcConfigForm.clientSecret = '';
	});

	async function updateSettingsConfig(updatedSettings: Partial<Settings>) {
		currentSettings = await settingsAPI.updateSettings({
			...currentSettings,
			...updatedSettings
		});
		settingsStore.reload();
	}

	function handleSecuritySettingUpdates() {
		isLoading.saving = true;
		updateSettingsConfig({
			auth: {
				...currentSettings.auth,
				localAuthEnabled: localAuthEnabled,
				oidcEnabled: oidcEnabled,
				sessionTimeout: sessionTimeout,
				passwordPolicy: passwordPolicy,
				...(oidcEnabled && !data.oidcStatus.envForced
					? {
							oidc: {
								clientId: oidcConfigForm.clientId,
								clientSecret: oidcConfigForm.clientSecret || '',
								redirectUri: oidcConfigForm.redirectUri,
								authorizationEndpoint: oidcConfigForm.authorizationEndpoint,
								tokenEndpoint: oidcConfigForm.tokenEndpoint,
								userinfoEndpoint: oidcConfigForm.userinfoEndpoint,
								scopes: oidcConfigForm.scopes
							}
						}
					: {})
			}
		})
			.then(async () => {
				toast.success(`Settings Saved Successfully`);
				await invalidateAll();
			})
			.finally(() => {
				isLoading.saving = false;
			});
	}

	function handleOidcSwitchChange(checked: boolean) {
		oidcEnabled = checked;

		if (checked && !data.oidcStatus.envForced && !data.oidcStatus.effectivelyConfigured) {
			showOidcConfigDialog = true;
		}
	}

	function openOidcDialog() {
		if (!isOidcViewMode) {
			oidcConfigForm.clientId = currentSettings.auth?.oidc?.clientId || '';
			oidcConfigForm.clientSecret = '';
			oidcConfigForm.redirectUri = currentSettings.auth?.oidc?.redirectUri || 'http://localhost:3000/auth/oidc/callback';
			oidcConfigForm.authorizationEndpoint = currentSettings.auth?.oidc?.authorizationEndpoint || '';
			oidcConfigForm.tokenEndpoint = currentSettings.auth?.oidc?.tokenEndpoint || '';
			oidcConfigForm.userinfoEndpoint = currentSettings.auth?.oidc?.userinfoEndpoint || '';
			oidcConfigForm.scopes = currentSettings.auth?.oidc?.scopes || 'openid email profile';
		}
		showOidcConfigDialog = true;
	}

	async function handleSaveOidcConfig() {
		try {
			oidcEnabled = true;
			toast.success('OIDC configuration will be saved with other settings.');
			showOidcConfigDialog = false;
		} catch (error) {
			console.error('Failed to prepare OIDC configuration:', error);
			toast.error('Failed to prepare OIDC configuration.', {
				description: error instanceof Error ? error.message : 'An unknown error occurred.'
			});
		}
	}
</script>

<div class="settings-page">
	<div class="settings-header">
		<div class="settings-header-content">
			<h1 class="settings-title">Security Settings</h1>
			<p class="settings-description">Configure authentication methods, session policies, and security settings</p>
		</div>

		<div class="settings-actions">
			<Button onclick={() => handleSecuritySettingUpdates()} disabled={isLoading.saving} class="arcane-button-save">
				{#if isLoading.saving}
					<RefreshCw class="size-4 animate-spin" />
					Saving...
				{:else}
					<Save class="size-4" />
					Save Settings
				{/if}
			</Button>
		</div>
	</div>

	<div class="settings-grid settings-grid-double">
		<Card.Root class="settings-card">
			<Card.Header class="settings-card-header">
				<div class="settings-card-title-wrapper">
					<div class="settings-card-icon bg-indigo-500/10">
						<Lock class="size-5 text-indigo-600" />
					</div>
					<div>
						<Card.Title class="settings-card-title">Authentication Methods</Card.Title>
						<Card.Description class="settings-card-description">Configure how users sign in to Arcane</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="space-y-4">
					<div class="bg-muted/30 flex items-center justify-between rounded-lg border p-4">
						<div class="space-y-0.5">
							<label for="localAuthSwitch" class="text-base font-medium">Local Authentication</label>
							<p class="text-muted-foreground text-sm">Username and password stored in the system</p>
							<p class="text-muted-foreground mt-1 text-xs">This is recommended to be enabled as a fallback option if OIDC authentication is unavailable.</p>
						</div>
						<Switch
							id="localAuthSwitch"
							checked={localAuthEnabled}
							onCheckedChange={(checked) => {
								localAuthEnabled = checked;
							}}
						/>
					</div>
					<div class="bg-muted/30 flex items-center justify-between rounded-lg border p-4">
						<div class="space-y-0.5">
							<label for="oidcAuthSwitch" class="text-base font-medium">OIDC Authentication</label>
							<p class="text-muted-foreground text-sm">
								Use an External OIDC Provider
								{#if data.oidcStatus.envForced}
									<span class="text-muted-foreground text-xs">(Forced ON by server environment)</span>
								{/if}
							</p>
							{#if data.oidcStatus.effectivelyEnabled || data.oidcStatus.envForced}
								{#if data.oidcStatus.envForced && !data.oidcStatus.envConfigured}
									<Button variant="link" class="text-destructive h-auto p-0 text-xs hover:underline" onclick={openOidcDialog}>
										<AlertTriangle class="mr-1 size-3" />
										Server forces OIDC, but env vars missing. Configure app settings or fix server env.
									</Button>
								{:else if data.oidcStatus.envForced && data.oidcStatus.envConfigured}
									<Button variant="link" class="h-auto p-0 text-xs text-sky-600 hover:underline" onclick={openOidcDialog}>
										<Info class="mr-1 size-3" />
										OIDC configured & forced by server. View Status.
									</Button>
								{:else if !data.oidcStatus.envForced && data.oidcStatus.effectivelyEnabled && data.oidcStatus.dbConfigured}
									<Button variant="link" class="h-auto p-0 text-xs text-sky-600 hover:underline" onclick={openOidcDialog}>
										<Info class="mr-1 size-3" />
										OIDC configured via application settings. Manage.
									</Button>
								{:else if !data.oidcStatus.envForced && data.oidcStatus.effectivelyEnabled && !data.oidcStatus.dbConfigured}
									<Button variant="link" class="text-destructive h-auto p-0 text-xs hover:underline" onclick={openOidcDialog}>
										<AlertTriangle class="mr-1 size-3" />
										OIDC enabled, but app settings incomplete. Configure.
									</Button>
								{/if}
							{/if}
						</div>
						<Switch id="oidcAuthSwitch" checked={oidcEnabled} disabled={data.oidcStatus.envForced} onCheckedChange={handleOidcSwitchChange} />
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Dialog.Root bind:open={showOidcConfigDialog}>
			<Dialog.Content class="sm:max-w-[600px]">
				<Dialog.Header>
					<Dialog.Title>
						{#if isOidcViewMode}OIDC Server Configuration Status
						{:else if data.oidcStatus.envForced && !data.oidcStatus.envConfigured}Configure OIDC (Server Override Warning)
						{:else}Configure OIDC Provider{/if}
					</Dialog.Title>
					<Dialog.Description>
						{#if isOidcViewMode}
							OIDC authentication is configured and forced ON by server-side environment variables. These settings are read-only.
							<p class="mt-2">The following OIDC settings are loaded from the server environment:</p>
						{:else if data.oidcStatus.envForced && !data.oidcStatus.envConfigured}
							OIDC usage is forced ON by the server environment (<code>PUBLIC_OIDC_ENABLED=true</code>), but critical server-side OIDC environment variables appear to be missing or incomplete. The settings below are from your application database. While you can save them here, it's strongly
							recommended to configure the OIDC settings directly in your server's environment for them to take full effect as intended by the server override.
						{:else}
							Configure the OIDC settings for your application. These settings will be saved to the database and used for OIDC authentication.
						{/if}
					</Dialog.Description>
				</Dialog.Header>

				{#if isOidcViewMode}
					<div class="max-h-[50vh] overflow-y-auto py-4 pr-2">
						<ul class="mt-1 list-inside list-disc space-y-1 text-sm">
							{#if currentSettings.auth?.oidc}
								<li><strong>Client ID:</strong> {currentSettings.auth.oidc.clientId}</li>
								<li>
									<strong>Client Secret:</strong>
									<span class="text-muted-foreground italic">(Sensitive - Not Displayed)</span>
								</li>
								<li><strong>Redirect URI:</strong> {currentSettings.auth.oidc.redirectUri}</li>
								<li>
									<strong>Authorization Endpoint:</strong>
									{currentSettings.auth.oidc.authorizationEndpoint}
								</li>
								<li><strong>Token Endpoint:</strong> {currentSettings.auth.oidc.tokenEndpoint}</li>
								<li>
									<strong>User Info Endpoint:</strong>
									{currentSettings.auth.oidc.userinfoEndpoint}
								</li>
								<li><strong>Scopes:</strong> {currentSettings.auth.oidc.scopes}</li>
							{:else}
								<li>
									<span class="text-destructive">OIDC configuration details not found in effective settings.</span>
								</li>
							{/if}
						</ul>
						<p class="text-muted-foreground mt-3 text-xs">Changes to these settings must be made in your server's environment configuration.</p>
					</div>
				{:else}
					<div class="grid max-h-[50vh] gap-4 overflow-y-auto py-4 pr-2">
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="oidcClientId" class="col-span-1 text-right">Client ID</Label>
							<Input id="oidcClientId" bind:value={oidcConfigForm.clientId} class="col-span-3" placeholder="Provided by your OIDC Provider" />
						</div>
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="oidcClientSecret" class="col-span-1 text-right">Client Secret</Label>
							<Input id="oidcClientSecret" type="password" bind:value={oidcConfigForm.clientSecret} class="col-span-3" placeholder="Provided by your OIDC Provider (leave blank to keep existing if any)" />
						</div>
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="oidcRedirectUri" class="col-span-1 text-right">Redirect URI</Label>
							<Input id="oidcRedirectUri" bind:value={oidcConfigForm.redirectUri} placeholder="e.g., http://localhost:3000/auth/oidc/callback" class="col-span-3" />
						</div>
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="oidcAuthEndpoint" class="col-span-1 text-right">Authorization URL</Label>
							<Input id="oidcAuthEndpoint" bind:value={oidcConfigForm.authorizationEndpoint} class="col-span-3" placeholder="OIDC Provider's Authorization Endpoint" />
						</div>
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="oidcTokenEndpoint" class="col-span-1 text-right">Token URL</Label>
							<Input id="oidcTokenEndpoint" bind:value={oidcConfigForm.tokenEndpoint} class="col-span-3" placeholder="OIDC Provider's Token Endpoint" />
						</div>
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="oidcUserinfoEndpoint" class="col-span-1 text-right">User Info URL</Label>
							<Input id="oidcUserinfoEndpoint" bind:value={oidcConfigForm.userinfoEndpoint} class="col-span-3" placeholder="OIDC Provider's UserInfo Endpoint" />
						</div>
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="oidcScopes" class="col-span-1 text-right">Scopes</Label>
							<Input id="oidcScopes" bind:value={oidcConfigForm.scopes} placeholder="e.g., openid email profile" class="col-span-3" />
						</div>
					</div>
				{/if}

				<Dialog.Footer>
					<Button variant="outline" onclick={() => (showOidcConfigDialog = false)}>Close</Button>
					{#if !isOidcViewMode}
						<Button onclick={handleSaveOidcConfig}>Configure OIDC</Button>
					{/if}
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>

		<Card.Root class="settings-card">
			<Card.Header class="settings-card-header">
				<div class="settings-card-title-wrapper">
					<div class="settings-card-icon bg-cyan-500/10">
						<Key class="size-5 text-cyan-600" />
					</div>
					<div>
						<Card.Title class="settings-card-title">Session Settings</Card.Title>
						<Card.Description class="settings-card-description">Configure session behavior and password policies</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="space-y-4">
					<div class="space-y-2">
						<label for="sessionTimeout" class="text-sm font-medium">Session Timeout (minutes)</label>
						<Input type="number" id="sessionTimeout" name="sessionTimeout" bind:value={sessionTimeout} min="15" max="1440" />
						<p class="text-muted-foreground text-xs">Time until inactive sessions are automatically logged out (15-1440 minutes)</p>
					</div>

					<div class="space-y-2">
						<label for="passwordPolicy" class="text-sm font-medium">Password Policy</label>
						<div class="grid grid-cols-3 gap-2">
							<Button
								variant={passwordPolicy === 'basic' ? 'default' : 'outline'}
								class={passwordPolicy === 'basic' ? 'arcane-button-create w-full' : 'arcane-button-restart w-full'}
								onclick={() => {
									passwordPolicy = 'basic';
								}}>Basic</Button
							>
							<Button
								variant={passwordPolicy === 'standard' ? 'default' : 'outline'}
								class={passwordPolicy === 'standard' ? 'arcane-button-create w-full' : 'arcane-button-restart w-full'}
								onclick={() => {
									passwordPolicy = 'standard';
								}}>Standard</Button
							>
							<Button
								variant={passwordPolicy === 'strong' ? 'default' : 'outline'}
								class={passwordPolicy === 'strong' ? 'arcane-button-create w-full' : 'arcane-button-restart w-full'}
								onclick={() => {
									passwordPolicy = 'strong';
								}}>Strong</Button
							>
						</div>
						<input type="hidden" id="passwordPolicy" name="passwordPolicy" value={passwordPolicy} />
						<p class="text-muted-foreground mt-1 text-xs">
							{#if passwordPolicy === 'basic'}
								Basic: Minimum 8 characters
							{:else if passwordPolicy === 'standard'}
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
