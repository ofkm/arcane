<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { getContext } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import SwitchWithLabel from '$lib/components/form/labeled-switch.svelte';
	import OidcConfigDialog from '$lib/components/dialogs/oidc-config-dialog.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';
	import { m } from '$lib/paraglide/messages';
	import LockIcon from '@lucide/svelte/icons/lock';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import KeyIcon from '@lucide/svelte/icons/key';
	import TextInputWithLabel from '$lib/components/form/text-input-with-label.svelte';
	import settingsStore from '$lib/stores/config-store';
	import { SettingsPageLayout } from '$lib/layouts';
	import { createSettingsState } from '$lib/components/settings';

	let { data }: { data: PageData } = $props();

	const isReadOnly = $derived.by(() => $settingsStore.uiConfigDisabled);

	let showOidcConfigDialog = $state(false);

	let oidcConfigForm = $state({
		clientId: '',
		clientSecret: '',
		issuerUrl: '',
		scopes: 'openid email profile',
		adminClaim: '',
		adminValue: ''
	});

	const settingsState = createSettingsState(
		{
			authLocalEnabled: data.settings!.authLocalEnabled,
			authOidcEnabled: data.settings!.authOidcEnabled,
			authSessionTimeout: data.settings!.authSessionTimeout,
			authPasswordPolicy: data.settings!.authPasswordPolicy
		},
		[{ key: 'authLocalEnabled' }, { key: 'authOidcEnabled' }, { key: 'authSessionTimeout' }, { key: 'authPasswordPolicy' }]
	);

	const { bindings, values, originalValues, setupStoreSync } = settingsState.createPageSetup(
		() => toast.success(m.security_settings_saved()),
		(error: any) => {
			console.error('Failed to save settings:', error);
			toast.error(m.security_settings_save_failed());
		}
	);

	setupStoreSync($settingsStore, ['authLocalEnabled', 'authOidcEnabled', 'authSessionTimeout', 'authPasswordPolicy']);

	// Helper: treat OIDC as active if forced by server or enabled in form
	const isOidcActive = () => values.authOidcEnabled || data.oidcStatus.envForced;

	// Only depend on envForced; open config when enabling and not forced
	function handleOidcSwitchChange(checked: boolean) {
		bindings.switch('authOidcEnabled').onCheckedChange(checked);

		if (!checked && !values.authLocalEnabled && !data.oidcStatus.envForced) {
			bindings.switch('authLocalEnabled').onCheckedChange(true);
			toast.info(m.security_local_enabled_info());
		}

		if (checked && !data.oidcStatus.envForced) {
			showOidcConfigDialog = true;
		}
	}

	function handleLocalSwitchChange(checked: boolean) {
		if (!checked && !isOidcActive()) {
			bindings.switch('authLocalEnabled').onCheckedChange(true);
			toast.error(m.security_enable_one_provider_error());
			return;
		}
		bindings.switch('authLocalEnabled').onCheckedChange(checked);
	}

	function openOidcDialog() {
		if (data.settings!.authOidcConfig) {
			const cfg = JSON.parse(data.settings!.authOidcConfig);
			oidcConfigForm.clientId = cfg.clientId || '';
			oidcConfigForm.issuerUrl = cfg.issuerUrl || '';
			oidcConfigForm.scopes = cfg.scopes || 'openid email profile';
			oidcConfigForm.adminClaim = cfg.adminClaim || '';
			oidcConfigForm.adminValue = cfg.adminValue || '';
		}
		oidcConfigForm.clientSecret = '';
		showOidcConfigDialog = true;
	}

	async function handleSaveOidcConfig() {
		try {
			const authOidcConfig = JSON.stringify({
				clientId: oidcConfigForm.clientId,
				clientSecret: oidcConfigForm.clientSecret || '',
				issuerUrl: oidcConfigForm.issuerUrl,
				scopes: oidcConfigForm.scopes,
				adminClaim: oidcConfigForm.adminClaim || '',
				adminValue: oidcConfigForm.adminValue || ''
			});

			// Update the settings with OIDC config
			await settingsState.save(
				() => {
					toast.success(m.security_settings_saved());
					showOidcConfigDialog = false;
				},
				(error) => {
					console.error('Failed to save OIDC config:', error);
					toast.error('Failed to save OIDC configuration. Please try again.');
				}
			);
		} catch (error) {
			console.error('Failed to save OIDC config:', error);
			toast.error('Failed to save OIDC configuration. Please try again.');
		}
	}
</script>

<SettingsPageLayout
	title={m.security_title()}
	description={m.security_description()}
	icon={LockIcon}
	pageType="form"
	showReadOnlyTag={isReadOnly}
>
	{#snippet mainContent()}
		<fieldset disabled={isReadOnly} class="relative">
			<div class="space-y-4 sm:space-y-6">
				<Card.Root>
					<Card.Header icon={LockIcon}>
						<div class="flex flex-col space-y-1.5">
							<Card.Title>Authentication</Card.Title>
							<Card.Description>Configure authentication methods</Card.Description>
						</div>
					</Card.Header>
					<Card.Content class="px-3 py-4 sm:px-6">
						<div class="space-y-3">
							<SwitchWithLabel
								id="authLocalEnabled"
								label={m.security_local_auth_label()}
								description={m.security_local_auth_description()}
								bind:checked={values.authLocalEnabled}
								onCheckedChange={handleLocalSwitchChange}
							/>

							<SwitchWithLabel
								id="authOidcEnabled"
								label={m.security_oidc_auth_label()}
								description={m.security_oidc_auth_description()}
								bind:checked={values.authOidcEnabled}
								disabled={data.oidcStatus.envForced}
								onCheckedChange={handleOidcSwitchChange}
							/>

							{#if data.oidcStatus.envForced}
								<div class="text-muted-foreground text-xs">OIDC is forced by environment configuration</div>
							{/if}

							{#if values.authOidcEnabled && !data.oidcStatus.envForced}
								<div class="border-primary/20 border-l-2 pl-3">
									<Button variant="outline" size="sm" onclick={openOidcDialog}>Configure OIDC</Button>
								</div>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header icon={ClockIcon}>
						<div class="flex flex-col space-y-1.5">
							<Card.Title>Session Settings</Card.Title>
							<Card.Description>Configure session timeout and security</Card.Description>
						</div>
					</Card.Header>
					<Card.Content class="px-3 py-4 sm:px-6">
						<TextInputWithLabel
							bind:value={values.authSessionTimeout}
							label={m.security_session_timeout_label()}
							placeholder={m.security_session_timeout_placeholder()}
							helpText={m.security_session_timeout_description()}
							type="number"
							onChange={(value) => bindings.textInput('authSessionTimeout').onChange(Number(value))}
						/>
					</Card.Content>
				</Card.Root>
				<Card.Root>
					<Card.Header icon={KeyIcon} class="items-start">
						<div class="flex flex-col space-y-1.5">
							<Card.Title>{m.security_password_policy_label()}</Card.Title>
							<Card.Description>Set password strength requirements</Card.Description>
						</div>
					</Card.Header>
					<Card.Content class="px-3 py-4 sm:px-6">
						<Tooltip.Provider>
							<div class="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3" role="group" aria-labelledby="passwordPolicyLabel">
								<Tooltip.Root>
									<Tooltip.Trigger>
										<Button
											variant={values.authPasswordPolicy === 'basic' ? 'default' : 'outline'}
											class={values.authPasswordPolicy === 'basic'
												? 'arcane-button-create h-12 w-full text-xs sm:text-sm'
												: 'arcane-button-restart h-12 w-full text-xs sm:text-sm'}
											onclick={() => bindings.textInput('authPasswordPolicy').onChange('basic')}
											type="button"
											>{m.common_basic()}
										</Button>
									</Tooltip.Trigger>
									<Tooltip.Content side="top" align="center">{m.security_password_policy_basic_tooltip()}</Tooltip.Content>
								</Tooltip.Root>

								<Tooltip.Root>
									<Tooltip.Trigger>
										<Button
											variant={values.authPasswordPolicy === 'standard' ? 'default' : 'outline'}
											class={values.authPasswordPolicy === 'standard'
												? 'arcane-button-create h-12 w-full text-xs sm:text-sm'
												: 'arcane-button-restart h-12 w-full text-xs sm:text-sm'}
											onclick={() => bindings.textInput('authPasswordPolicy').onChange('standard')}
											type="button"
											>{m.security_password_policy_standard()}
										</Button>
									</Tooltip.Trigger>
									<Tooltip.Content side="top" align="center">{m.security_password_policy_standard_tooltip()}</Tooltip.Content>
								</Tooltip.Root>

								<Tooltip.Root>
									<Tooltip.Trigger>
										<Button
											variant={values.authPasswordPolicy === 'strong' ? 'default' : 'outline'}
											class={values.authPasswordPolicy === 'strong'
												? 'arcane-button-create h-12 w-full text-xs sm:text-sm'
												: 'arcane-button-restart h-12 w-full text-xs sm:text-sm'}
											onclick={() => bindings.textInput('authPasswordPolicy').onChange('strong')}
											type="button"
											>{m.security_password_policy_strong()}
										</Button>
									</Tooltip.Trigger>
									<Tooltip.Content side="top" align="center">{m.security_password_policy_strong_tooltip()}</Tooltip.Content>
								</Tooltip.Root>
							</div>
						</Tooltip.Provider>
					</Card.Content>
				</Card.Root>
			</div>
		</fieldset>
	{/snippet}
</SettingsPageLayout>

<OidcConfigDialog
	bind:open={showOidcConfigDialog}
	currentSettings={data.settings!}
	oidcStatus={data.oidcStatus}
	bind:oidcForm={oidcConfigForm}
	onSave={handleSaveOidcConfig}
/>
