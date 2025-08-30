<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import LockIcon from '@lucide/svelte/icons/lock';
	import KeyIcon from '@lucide/svelte/icons/key';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import InfoIcon from '@lucide/svelte/icons/info';
	import SaveIcon from '@lucide/svelte/icons/save';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
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
			settingsStore.set(currentSettings);
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
	<div class="space-y-8">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div class="space-y-1">
				<h1 class="text-3xl font-bold tracking-tight">Security Settings</h1>
				<p class="text-muted-foreground max-w-2xl text-sm">
					Configure authentication methods, session policies, and security settings.
				</p>
			</div>

			<div>
				<Button onclick={() => handleSecuritySettingUpdates()} disabled={isLoading.saving} class="h-10 min-w-[140px]">
					{#if isLoading.saving}
						<RefreshCwIcon class="size-4 animate-spin" />
						Saving...
					{:else}
						<SaveIcon class="size-4" />
						Save Settings
					{/if}
				</Button>
			</div>
		</div>

		<div class="grid gap-6 md:grid-cols-2">
			<Card.Root class="settings-card rounded-lg border shadow-sm">
				<Card.Header class="settings-card-header pb-2">
					<div class="settings-card-title-wrapper flex items-center gap-3">
						<div class="settings-card-icon rounded-md bg-indigo-500/10 p-2">
							<LockIcon class="size-5 text-indigo-600" />
						</div>
						<div>
							<Card.Title class="settings-card-title text-lg">Authentication Methods</Card.Title>
							<Card.Description class="settings-card-description text-sm">Configure how users sign in to Arcane</Card.Description>
						</div>
					</div>
				</Card.Header>
				<Card.Content class="pt-0">
					<div class="space-y-4">
						<div class="bg-muted/30 flex items-start justify-between rounded-lg border p-4">
							<div class="space-y-1 pr-4">
								<label for="localAuthSwitch" class="text-sm font-medium">Local Authentication</label>
								<p class="text-muted-foreground text-xs">
									Username and password stored in the system. Recommended as a fallback if OIDC is unavailable.
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

						<div class="bg-muted/30 flex items-start justify-between rounded-lg border p-4">
							<div class="space-y-1 pr-4">
								<label for="oidcAuthSwitch" class="text-sm font-medium">OIDC Authentication</label>
								<p class="text-muted-foreground text-xs">
									Use an external OIDC provider
									{#if data.oidcStatus.envForced}
										<span class="text-muted-foreground text-[11px]">(Forced ON by server environment) </span>
									{/if}
								</p>

								{#if data.oidcStatus.effectivelyEnabled || data.oidcStatus.envForced}
									<div class="mt-1">
										{#if data.oidcStatus.envForced && !data.oidcStatus.envConfigured}
											<Button variant="link" class="text-destructive h-auto p-0 text-xs hover:underline" onclick={openOidcDialog}>
												<TriangleAlertIcon class="mr-1 size-3" />
												Server forces OIDC, but env vars missing. Configure app settings or fix server env.
											</Button>
										{:else if data.oidcStatus.envForced && data.oidcStatus.envConfigured}
											<Button variant="link" class="h-auto p-0 text-xs text-sky-600 hover:underline" onclick={openOidcDialog}>
												<InfoIcon class="mr-1 size-3" />
												OIDC configured & forced by server. View Status.
											</Button>
										{:else if !data.oidcStatus.envForced && data.oidcStatus.effectivelyEnabled && data.oidcStatus.dbConfigured}
											<Button variant="link" class="h-auto p-0 text-xs text-sky-600 hover:underline" onclick={openOidcDialog}>
												<InfoIcon class="mr-1 size-3" />
												OIDC configured via application settings. Manage.
											</Button>
										{:else if !data.oidcStatus.envForced && data.oidcStatus.effectivelyEnabled && !data.oidcStatus.dbConfigured}
											<Button variant="link" class="text-destructive h-auto p-0 text-xs hover:underline" onclick={openOidcDialog}>
												<TriangleAlertIcon class="mr-1 size-3" />
												OIDC enabled, but app settings incomplete. Configure.
											</Button>
										{/if}
									</div>
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

			<Card.Root class="settings-card rounded-lg border shadow-sm">
				<Card.Header class="settings-card-header pb-2">
					<div class="settings-card-title-wrapper flex items-center gap-3">
						<div class="settings-card-icon rounded-md bg-cyan-500/10 p-2">
							<KeyIcon class="size-5 text-cyan-600" />
						</div>
						<div>
							<Card.Title class="settings-card-title text-lg">Session Settings</Card.Title>
							<Card.Description class="settings-card-description text-sm">
								Configure session behavior and password policies
							</Card.Description>
						</div>
					</div>
				</Card.Header>
				<Card.Content class="pt-0">
					<div class="space-y-5">
						<div class="space-y-2">
							<label for="sessionTimeout" class="text-sm font-medium">Session Timeout (minutes)</label>
							<Input type="number" id="sessionTimeout" name="sessionTimeout" bind:value={sessionTimeout} min="15" max="1440" />
							<p class="text-muted-foreground text-xs">Inactive sessions will be logged out automatically (15–1440 minutes).</p>
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
</div>
