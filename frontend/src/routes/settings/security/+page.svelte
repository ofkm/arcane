<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Lock, Key, AlertTriangle, Info, Save, RefreshCw } from '@lucide/svelte';
	import {
		settingsStore,
		saveSettingsToServer,
		updateSettingsStore
	} from '$lib/stores/settings-store';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import { handleApiResultWithCallbacks } from '$lib/utils/api.util';
	import { tryCatch } from '$lib/utils/try-catch';

	let { data }: { data: PageData } = $props();

	let showOidcConfigDialog = $state(false);
	let oidcConfigForm = $state({
		clientId: data.settings?.auth?.oidc?.clientId || '',
		clientSecret: '',
		redirectUri:
			data.settings?.auth?.oidc?.redirectUri || 'http://localhost:3000/auth/oidc/callback',
		authorizationEndpoint: data.settings?.auth?.oidc?.authorizationEndpoint || '',
		tokenEndpoint: data.settings?.auth?.oidc?.tokenEndpoint || '',
		userinfoEndpoint: data.settings?.auth?.oidc?.userinfoEndpoint || '',
		scopes: data.settings?.auth?.oidc?.scopes || 'openid email profile'
	});

	// Loading states
	let isLoading = $state({
		saving: false
	});

	let isOidcViewMode = $derived(data.oidcStatus.envForced && data.oidcStatus.envConfigured);

	$effect(() => {
		if (data.settings) {
			updateSettingsStore(data.settings);
			oidcConfigForm.clientId = data.settings.auth?.oidc?.clientId || '';
			oidcConfigForm.redirectUri =
				data.settings.auth?.oidc?.redirectUri || 'http://localhost:3000/auth/oidc/callback';
			oidcConfigForm.authorizationEndpoint = data.settings.auth?.oidc?.authorizationEndpoint || '';
			oidcConfigForm.tokenEndpoint = data.settings.auth?.oidc?.tokenEndpoint || '';
			oidcConfigForm.userinfoEndpoint = data.settings.auth?.oidc?.userinfoEndpoint || '';
			oidcConfigForm.scopes = data.settings.auth?.oidc?.scopes || 'openid email profile';
			oidcConfigForm.clientSecret = '';
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

		if (checked && !data.oidcStatus.envForced && !data.oidcStatus.effectivelyConfigured) {
			showOidcConfigDialog = true;
		}
	}

	function openOidcDialog() {
		if (!isOidcViewMode) {
			oidcConfigForm.clientId = data.settings?.auth?.oidc?.clientId || '';
			oidcConfigForm.clientSecret = '';
			oidcConfigForm.redirectUri =
				data.settings?.auth?.oidc?.redirectUri || 'http://localhost:3000/auth/oidc/callback';
			oidcConfigForm.authorizationEndpoint = data.settings?.auth?.oidc?.authorizationEndpoint || '';
			oidcConfigForm.tokenEndpoint = data.settings?.auth?.oidc?.tokenEndpoint || '';
			oidcConfigForm.userinfoEndpoint = data.settings?.auth?.oidc?.userinfoEndpoint || '';
			oidcConfigForm.scopes = data.settings?.auth?.oidc?.scopes || 'openid email profile';
		}
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
			await invalidateAll();

			toast.success('OIDC configuration saved successfully.');
			showOidcConfigDialog = false;
		} catch (error) {
			console.error('Failed to save OIDC configuration:', error);
			toast.error('Failed to save OIDC configuration.', {
				description: error instanceof Error ? error.message : 'An unknown error occurred.'
			});
		}
	}

	// Save settings function
	async function saveSettings() {
		if (isLoading.saving) return;
		isLoading.saving = true;

		handleApiResultWithCallbacks({
			result: await tryCatch(saveSettingsToServer()),
			message: 'Error Saving Settings',
			setLoadingState: (value) => (isLoading.saving = value),
			onSuccess: async () => {
				toast.success(`Settings Saved Successfully`);
				await invalidateAll();
			}
		});
	}
</script>

<svelte:head>
	<title>Security Settings - Arcane</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Security Settings</h1>
			<p class="text-muted-foreground mt-1 text-sm">
				Configure authentication methods and security policies
			</p>
		</div>

		<Button onclick={saveSettings} disabled={isLoading.saving} class="arcane-button-save h-10">
			{#if isLoading.saving}
				<RefreshCw class="size-4 animate-spin" />
				Saving...
			{:else}
				<Save class="size-4" />
				Save Settings
			{/if}
		</Button>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<Card.Root class="border shadow-sm">
			<Card.Header class="pb-3">
				<div class="flex items-center gap-2">
					<div class="rounded-full bg-indigo-500/10 p-2">
						<Lock class="size-5 text-indigo-500" />
					</div>
					<div>
						<Card.Title>Authentication Methods</Card.Title>
						<Card.Description>Configure how users sign in</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="space-y-4">
					<div class="bg-muted/30 flex items-center justify-between rounded-lg border p-4">
						<div class="space-y-0.5">
							<label for="localAuthSwitch" class="text-base font-medium">Local Authentication</label
							>
							<p class="text-muted-foreground text-sm">
								Username and password stored in the system
							</p>
							<p class="text-muted-foreground mt-1 text-xs">
								This is recommended to be enabled as a fallback option if OIDC authentication is
								unavailable.
							</p>
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
					<div class="bg-muted/30 flex items-center justify-between rounded-lg border p-4">
						<div class="space-y-0.5">
							<label for="oidcAuthSwitch" class="text-base font-medium">OIDC Authentication</label>
							<p class="text-muted-foreground text-sm">
								Use an External OIDC Provider
								{#if 'envForced' in data.oidcStatus && data.oidcStatus.envForced}
									<span class="text-muted-foreground text-xs"
										>(Forced ON by server environment)</span
									>
								{/if}
							</p>
							{#if 'envForced' in data.oidcStatus && (data.oidcStatus.effectivelyEnabled || data.oidcStatus.envForced)}
								{#if data.oidcStatus.envForced && !data.oidcStatus.envConfigured}
									<Button
										variant="link"
										class="text-destructive h-auto p-0 text-xs hover:underline"
										onclick={openOidcDialog}
									>
										<AlertTriangle class="mr-1 size-3" />
										Server forces OIDC, but env vars missing. Configure app settings or fix server env.
									</Button>
								{:else if data.oidcStatus.envForced && data.oidcStatus.envConfigured}
									<Button
										variant="link"
										class="h-auto p-0 text-xs text-sky-600 hover:underline"
										onclick={openOidcDialog}
									>
										<Info class="mr-1 size-3" />
										OIDC configured & forced by server. View Status.
									</Button>
								{:else if !data.oidcStatus.envForced && data.oidcStatus.effectivelyEnabled && data.oidcStatus.dbConfigured}
									<Button
										variant="link"
										class="h-auto p-0 text-xs text-sky-600 hover:underline"
										onclick={openOidcDialog}
									>
										<Info class="mr-1 size-3" />
										OIDC configured via application settings. Manage.
									</Button>
								{:else if !data.oidcStatus.envForced && data.oidcStatus.effectivelyEnabled && !data.oidcStatus.dbConfigured}
									<Button
										variant="link"
										class="text-destructive h-auto p-0 text-xs hover:underline"
										onclick={openOidcDialog}
									>
										<AlertTriangle class="mr-1 size-3" />
										OIDC enabled, but app settings incomplete. Configure.
									</Button>
								{/if}
							{:else if 'enabled' in data.oidcStatus && data.oidcStatus.enabled}
								<Button
									variant="link"
									class="h-auto p-0 text-xs text-sky-600 hover:underline"
									onclick={openOidcDialog}
								>
									<Info class="mr-1 size-3" />
									OIDC enabled (legacy mode). Manage.
								</Button>
							{/if}
						</div>
						<Switch
							id="oidcAuthSwitch"
							checked={'effectivelyEnabled' in data.oidcStatus
								? data.oidcStatus.effectivelyEnabled
								: data.oidcStatus.enabled}
							disabled={'envForced' in data.oidcStatus && data.oidcStatus.envForced}
							onCheckedChange={handleOidcSwitchChange}
						/>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- OIDC Configuration/Status Dialog -->
		<Dialog.Root bind:open={showOidcConfigDialog}>
			<Dialog.Content class="sm:max-w-[600px]">
				<Dialog.Header>
					<Dialog.Title>
						{#if isOidcViewMode}OIDC Server Configuration Status
						{:else if data.oidcStatus.envForced && !data.oidcStatus.envConfigured}Configure OIDC
							(Server Override Warning)
						{:else}Configure OIDC Provider{/if}
					</Dialog.Title>
					<Dialog.Description>
						{#if isOidcViewMode}
							OIDC authentication is configured and forced ON by server-side environment variables.
							These settings are read-only.
							<p class="mt-2">
								The following OIDC settings are loaded from the server environment:
							</p>
						{:else if data.oidcStatus.envForced && !data.oidcStatus.envConfigured}
							OIDC usage is forced ON by the server environment (<code
								>PUBLIC_OIDC_ENABLED=true</code
							>), but critical server-side OIDC environment variables appear to be missing or
							incomplete. The settings below are from your application database. While you can save
							them here, it's strongly recommended to configure the OIDC settings directly in your
							server's environment for them to take full effect as intended by the server override.
						{:else}
							Configure the OIDC settings for your application. These settings will be saved to the
							database and used for OIDC authentication.
						{/if}
					</Dialog.Description>
				</Dialog.Header>

				{#if isOidcViewMode}
					<div class="max-h-[50vh] overflow-y-auto py-4 pr-2">
						<ul class="mt-1 list-inside list-disc space-y-1 text-sm">
							{#if data.settings?.auth?.oidc}
								<li><strong>Client ID:</strong> {data.settings.auth.oidc.clientId}</li>
								<li>
									<strong>Client Secret:</strong>
									<span class="text-muted-foreground italic">(Sensitive - Not Displayed)</span>
								</li>
								<li><strong>Redirect URI:</strong> {data.settings.auth.oidc.redirectUri}</li>
								<li>
									<strong>Authorization Endpoint:</strong>
									{data.settings.auth.oidc.authorizationEndpoint}
								</li>
								<li><strong>Token Endpoint:</strong> {data.settings.auth.oidc.tokenEndpoint}</li>
								<li>
									<strong>User Info Endpoint:</strong>
									{data.settings.auth.oidc.userinfoEndpoint}
								</li>
								<li><strong>Scopes:</strong> {data.settings.auth.oidc.scopes}</li>
							{:else}
								<li>
									<span class="text-destructive"
										>OIDC configuration details not found in effective settings.</span
									>
								</li>
							{/if}
						</ul>
						<p class="text-muted-foreground mt-3 text-xs">
							Changes to these settings must be made in your server's environment configuration.
						</p>
					</div>
				{:else}
					<!-- Form for setup/configuration -->
					<div class="grid max-h-[50vh] gap-4 overflow-y-auto py-4 pr-2">
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="oidcClientId" class="col-span-1 text-right">Client ID</Label>
							<Input
								id="oidcClientId"
								bind:value={oidcConfigForm.clientId}
								class="col-span-3"
								placeholder="Provided by your OIDC Provider"
							/>
						</div>
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="oidcClientSecret" class="col-span-1 text-right">Client Secret</Label>
							<Input
								id="oidcClientSecret"
								type="password"
								bind:value={oidcConfigForm.clientSecret}
								class="col-span-3"
								placeholder="Provided by your OIDC Provider (leave blank to keep existing if any)"
							/>
						</div>
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="oidcRedirectUri" class="col-span-1 text-right">Redirect URI</Label>
							<Input
								id="oidcRedirectUri"
								bind:value={oidcConfigForm.redirectUri}
								placeholder="e.g., http://localhost:3000/auth/oidc/callback"
								class="col-span-3"
							/>
						</div>
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="oidcAuthEndpoint" class="col-span-1 text-right">Authorization URL</Label>
							<Input
								id="oidcAuthEndpoint"
								bind:value={oidcConfigForm.authorizationEndpoint}
								class="col-span-3"
								placeholder="OIDC Provider's Authorization Endpoint"
							/>
						</div>
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="oidcTokenEndpoint" class="col-span-1 text-right">Token URL</Label>
							<Input
								id="oidcTokenEndpoint"
								bind:value={oidcConfigForm.tokenEndpoint}
								class="col-span-3"
								placeholder="OIDC Provider's Token Endpoint"
							/>
						</div>
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="oidcUserinfoEndpoint" class="col-span-1 text-right">User Info URL</Label>
							<Input
								id="oidcUserinfoEndpoint"
								bind:value={oidcConfigForm.userinfoEndpoint}
								class="col-span-3"
								placeholder="OIDC Provider's UserInfo Endpoint"
							/>
						</div>
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="oidcScopes" class="col-span-1 text-right">Scopes</Label>
							<Input
								id="oidcScopes"
								bind:value={oidcConfigForm.scopes}
								placeholder="e.g., openid email profile"
								class="col-span-3"
							/>
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
						<div class="rounded-full bg-cyan-500/10 p-2">
							<Key class="size-5 text-cyan-500" />
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
							<label for="sessionTimeout" class="text-sm font-medium"
								>Session Timeout (minutes)</label
							>
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
							<p class="text-muted-foreground text-xs">
								Time until inactive sessions are automatically logged out (15-1440 minutes)
							</p>
						</div>

						<div class="space-y-2">
							<label for="passwordPolicy" class="text-sm font-medium">Password Policy</label>
							<div class="grid grid-cols-3 gap-2">
								<Button
									variant={($settingsStore.auth?.passwordPolicy || 'strong') === 'basic'
										? 'default'
										: 'outline'}
									class={($settingsStore.auth?.passwordPolicy || 'strong') === 'basic'
										? 'arcane-button-create w-full'
										: 'arcane-button-restart w-full'}
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
									variant={($settingsStore.auth?.passwordPolicy || 'strong') === 'standard'
										? 'default'
										: 'outline'}
									class={($settingsStore.auth?.passwordPolicy || 'strong') === 'standard'
										? 'arcane-button-create w-full'
										: 'arcane-button-restart w-full'}
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
									variant={($settingsStore.auth?.passwordPolicy || 'strong') === 'strong'
										? 'default'
										: 'outline'}
									class={($settingsStore.auth?.passwordPolicy || 'strong') === 'strong'
										? 'arcane-button-create w-full'
										: 'arcane-button-restart w-full'}
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
							<input
								type="hidden"
								id="passwordPolicy"
								name="passwordPolicy"
								value={$settingsStore.auth?.passwordPolicy || 'strong'}
							/>
							<p class="text-muted-foreground mt-1 text-xs">
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

	<!-- Hidden CSRF token if needed -->
	<input type="hidden" id="csrf_token" value={data.csrf} />
</div>
