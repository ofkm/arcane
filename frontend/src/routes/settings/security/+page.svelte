<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Lock, Key, AlertTriangle, Info, Save, RefreshCw } from '@lucide/svelte';
	import settingsStore from '$lib/stores/config-store';
	import OidcConfigDialog from '$lib/components/dialogs/oidc-config-dialog.svelte';
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
		issuerUrl: '',
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
		localAuthEnabled = currentSettings.authLocalEnabled ?? true;
		oidcEnabled = currentSettings.authOidcEnabled ?? false;
		sessionTimeout = currentSettings.authSessionTimeout ?? 60;
		passwordPolicy = currentSettings.authPasswordPolicy ?? 'strong';

		// Parse OIDC config from string if it exists
		if (currentSettings.authOidcConfig) {
			try {
				const oidcConfig = JSON.parse(currentSettings.authOidcConfig);
				oidcConfigForm.clientId = oidcConfig.clientId || '';
				oidcConfigForm.scopes = oidcConfig.scopes || 'openid email profile';
				oidcConfigForm.issuerUrl = oidcConfig.issuerUrl || '';
			} catch (e) {
				console.warn('Failed to parse OIDC config:', e);
			}
		}
		oidcConfigForm.clientSecret = '';
	});

	async function updateSettingsConfig(updatedSettings: Partial<Settings>) {
		try {
			currentSettings = await settingsAPI.updateSettings({
				...currentSettings,
				...updatedSettings
			});
			settingsStore.reload();
		} catch (error) {
			console.error('Error updating settings:', error);
			throw error;
		}
	}

	function handleSecuritySettingUpdates() {
		isLoading.saving = true;

		// Prepare OIDC config if needed
		let oidcConfigString = currentSettings.authOidcConfig;
		if (oidcEnabled && !data.oidcStatus.envForced) {
			oidcConfigString = JSON.stringify({
				clientId: oidcConfigForm.clientId,
				clientSecret: oidcConfigForm.clientSecret || '',
				issuerUrl: oidcConfigForm.issuerUrl,
				scopes: oidcConfigForm.scopes
			});
		}

		updateSettingsConfig({
			authLocalEnabled: localAuthEnabled,
			authOidcEnabled: oidcEnabled,
			authSessionTimeout: sessionTimeout,
			authPasswordPolicy: passwordPolicy,
			authOidcConfig: oidcConfigString
		})
			.then(async () => {
				toast.success(`Settings Saved Successfully`);
				await invalidateAll();
			})
			.catch((error) => {
				toast.error('Failed to save settings');
				console.error('Settings save error:', error);
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
			// Parse current config if it exists
			if (currentSettings.authOidcConfig) {
				try {
					const oidcConfig = JSON.parse(currentSettings.authOidcConfig);
					oidcConfigForm.clientId = oidcConfig.clientId || '';
					oidcConfigForm.issuerUrl = oidcConfig.issuerUrl || '';
					oidcConfigForm.scopes = oidcConfig.scopes || 'openid email profile';
				} catch (e) {
					console.warn('Failed to parse OIDC config:', e);
				}
			}
			oidcConfigForm.clientSecret = '';
		}
		showOidcConfigDialog = true;
	}

	async function handleSaveOidcConfig() {
		try {
			isLoading.saving = true;
			oidcEnabled = true;

			const oidcConfigString = JSON.stringify({
				clientId: oidcConfigForm.clientId,
				clientSecret: oidcConfigForm.clientSecret || '',
				issuerUrl: oidcConfigForm.issuerUrl,
				scopes: oidcConfigForm.scopes
			});

			await updateSettingsConfig({
				authLocalEnabled: localAuthEnabled,
				authOidcEnabled: true,
				authSessionTimeout: sessionTimeout,
				authPasswordPolicy: passwordPolicy,
				authOidcConfig: oidcConfigString
			});

			toast.success('OIDC configuration saved successfully.');
			showOidcConfigDialog = false;
			await invalidateAll();
		} catch (error) {
			console.error('Failed to save OIDC configuration:', error);
			toast.error('Failed to save OIDC configuration.', {
				description: error instanceof Error ? error.message : 'An unknown error occurred.'
			});
		} finally {
			isLoading.saving = false;
		}
	}
</script>

<div class="settings-page">
	<div class="settings-header">
		<div class="settings-header-content">
			<h1 class="settings-title">Security Settings</h1>
			<p class="settings-description">
				Configure authentication methods, session policies, and security settings
			</p>
		</div>

		<div class="settings-actions">
			<Button
				onclick={() => handleSecuritySettingUpdates()}
				disabled={isLoading.saving}
				class="arcane-button-save"
			>
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
						<Card.Description class="settings-card-description"
							>Configure how users sign in to Arcane</Card.Description
						>
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
									<span class="text-muted-foreground text-xs"
										>(Forced ON by server environment)</span
									>
								{/if}
							</p>
							{#if data.oidcStatus.effectivelyEnabled || data.oidcStatus.envForced}
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
							{/if}
						</div>
						<Switch
							id="oidcAuthSwitch"
							checked={oidcEnabled}
							disabled={data.oidcStatus.envForced}
							onCheckedChange={handleOidcSwitchChange}
						/>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<OidcConfigDialog
			bind:open={showOidcConfigDialog}
			{currentSettings}
			oidcStatus={data.oidcStatus}
			bind:oidcForm={oidcConfigForm}
			onSave={handleSaveOidcConfig}
		/>

		<Card.Root class="settings-card">
			<Card.Header class="settings-card-header">
				<div class="settings-card-title-wrapper">
					<div class="settings-card-icon bg-cyan-500/10">
						<Key class="size-5 text-cyan-600" />
					</div>
					<div>
						<Card.Title class="settings-card-title">Session Settings</Card.Title>
						<Card.Description class="settings-card-description"
							>Configure session behavior and password policies</Card.Description
						>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="space-y-4">
					<div class="space-y-2">
						<label for="sessionTimeout" class="text-sm font-medium">Session Timeout (minutes)</label
						>
						<Input
							type="number"
							id="sessionTimeout"
							name="sessionTimeout"
							bind:value={sessionTimeout}
							min="15"
							max="1440"
						/>
						<p class="text-muted-foreground text-xs">
							Time until inactive sessions are automatically logged out (15-1440 minutes)
						</p>
					</div>

					<div class="space-y-2">
						<label for="passwordPolicy" class="text-sm font-medium">Password Policy</label>
						<div class="grid grid-cols-3 gap-2">
							<Button
								variant={passwordPolicy === 'basic' ? 'default' : 'outline'}
								class={passwordPolicy === 'basic'
									? 'arcane-button-create w-full'
									: 'arcane-button-restart w-full'}
								onclick={() => {
									passwordPolicy = 'basic';
								}}>Basic</Button
							>
							<Button
								variant={passwordPolicy === 'standard' ? 'default' : 'outline'}
								class={passwordPolicy === 'standard'
									? 'arcane-button-create w-full'
									: 'arcane-button-restart w-full'}
								onclick={() => {
									passwordPolicy = 'standard';
								}}>Standard</Button
							>
							<Button
								variant={passwordPolicy === 'strong' ? 'default' : 'outline'}
								class={passwordPolicy === 'strong'
									? 'arcane-button-create w-full'
									: 'arcane-button-restart w-full'}
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
