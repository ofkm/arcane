<script lang="ts">
	import { z } from 'zod/v4';
	import { createForm, preventDefault } from '$lib/utils/form.utils';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import FormInput from '$lib/components/form/form-input.svelte';
	import SwitchWithLabel from '$lib/components/form/labeled-switch.svelte';
	import OidcConfigDialog from '$lib/components/dialogs/oidc-config-dialog.svelte';
	import { toast } from 'svelte-sonner';
	import type { Settings } from '$lib/types/settings.type';
	import type { OidcStatusInfo } from '$lib/types/settings.type';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { m } from '$lib/paraglide/messages';
	import LockIcon from '@lucide/svelte/icons/lock';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import KeyIcon from '@lucide/svelte/icons/key';
	import SaveIcon from '@lucide/svelte/icons/save';

	let {
		settings,
		oidcStatus,
		callback
	}: {
		settings: Settings;
		oidcStatus: OidcStatusInfo;
		callback: (appConfig: Partial<Settings>) => Promise<void>;
	} = $props();

	let isLoading = $state({ saving: false });
	let showOidcConfigDialog = $state(false);

	let oidcConfigForm = $state({
		clientId: '',
		clientSecret: '',
		issuerUrl: '',
		scopes: 'openid email profile',
		adminClaim: '',
		adminValue: ''
	});

	const formSchema = z
		.object({
			authLocalEnabled: z.boolean(),
			authOidcEnabled: z.boolean(),
			authSessionTimeout: z
				.number(m.security_session_timeout_required())
				.int(m.security_session_timeout_integer())
				.min(15, m.security_session_timeout_min())
				.max(1440, m.security_session_timeout_max()),
			authPasswordPolicy: z.enum(['basic', 'standard', 'strong'])
		})
		.superRefine((data, ctx) => {
			// If server forces OIDC, the constraint is already satisfied
			if (oidcStatus.envForced) return;
			if (!data.authLocalEnabled && !data.authOidcEnabled) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: m.security_enable_one_provider(),
					path: ['authLocalEnabled']
				});
			}
		});

	let { inputs: formInputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, settings));

	// Track if any changes have been made
	const hasChanges = $derived(() => {
		return (
			$formInputs.authLocalEnabled.value !== settings.authLocalEnabled ||
			$formInputs.authOidcEnabled.value !== settings.authOidcEnabled ||
			$formInputs.authSessionTimeout.value !== settings.authSessionTimeout ||
			$formInputs.authPasswordPolicy.value !== settings.authPasswordPolicy
		);
	});

	// Helper: treat OIDC as active if forced by server or enabled in form
	const isOidcActive = () => $formInputs.authOidcEnabled.value || oidcStatus.envForced;

	async function onSubmit() {
		const data = form.validate();
		if (!data) {
			toast.error('Please check the form for errors');
			return;
		}

		isLoading.saving = true;

		let authOidcConfig = settings.authOidcConfig;
		if (data.authOidcEnabled && !oidcStatus.envForced) {
			authOidcConfig = JSON.stringify({
				clientId: oidcConfigForm.clientId,
				clientSecret: oidcConfigForm.clientSecret || '',
				issuerUrl: oidcConfigForm.issuerUrl,
				scopes: oidcConfigForm.scopes,
				adminClaim: oidcConfigForm.adminClaim || '',
				adminValue: oidcConfigForm.adminValue || ''
			});
		}

		await callback({
			authLocalEnabled: data.authLocalEnabled,
			authOidcEnabled: data.authOidcEnabled,
			authSessionTimeout: data.authSessionTimeout,
			authPasswordPolicy: data.authPasswordPolicy
		})
			.then(() => toast.success(m.security_settings_saved()))
			.catch((error) => {
				console.error('Failed to save settings:', error);
				toast.error('Failed to save settings. Please try again.');
			})
			.finally(() => (isLoading.saving = false));
	}

	// Only depend on envForced; open config when enabling and not forced
	function handleOidcSwitchChange(checked: boolean) {
		$formInputs.authOidcEnabled.value = checked;

		if (!checked && !$formInputs.authLocalEnabled.value && !oidcStatus.envForced) {
			$formInputs.authLocalEnabled.value = true;
			toast.info(m.security_local_enabled_info());
		}

		if (checked && !oidcStatus.envForced) {
			showOidcConfigDialog = true;
		}
	}

	function handleLocalSwitchChange(checked: boolean) {
		if (!checked && !isOidcActive()) {
			$formInputs.authLocalEnabled.value = true;
			toast.error(m.security_enable_one_provider_error());
			return;
		}
		$formInputs.authLocalEnabled.value = checked;
	}

	function openOidcDialog() {
		if (settings.authOidcConfig) {
			const cfg = JSON.parse(settings.authOidcConfig);
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
			isLoading.saving = true;
			$formInputs.authOidcEnabled.value = true;

			const data = form.validate();
			if (!data) {
				isLoading.saving = false;
				return;
			}

			const authOidcConfig = JSON.stringify({
				clientId: oidcConfigForm.clientId,
				clientSecret: oidcConfigForm.clientSecret || '',
				issuerUrl: oidcConfigForm.issuerUrl,
				scopes: oidcConfigForm.scopes,
				adminClaim: oidcConfigForm.adminClaim || '',
				adminValue: oidcConfigForm.adminValue || ''
			});

			await callback({
				authOidcEnabled: true,
				authOidcConfig
			});

			toast.success(m.security_oidc_saved());
			showOidcConfigDialog = false;
		} finally {
			isLoading.saving = false;
		}
	}
</script>

<div class="space-y-4 sm:space-y-6">
	<!-- Authentication Methods Card -->
	<Card.Root class="overflow-hidden">
		<Card.Header class="bg-muted/20 border-b">
			<div class="flex items-center gap-3">
				<div class="bg-primary/10 text-primary ring-primary/20 flex size-8 items-center justify-center rounded-lg ring-1">
					<LockIcon class="size-4" />
				</div>
				<div>
					<Card.Title class="text-base">{m.security_authentication_heading()}</Card.Title>
					<Card.Description class="text-xs">Configure login methods for your application</Card.Description>
				</div>
			</div>
		</Card.Header>
		<Card.Content class="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 sm:pt-3">
			<div class="space-y-3">
				<SwitchWithLabel
					id="localAuthSwitch"
					label={m.security_local_auth_label()}
					description={m.security_local_auth_description()}
					checked={$formInputs.authLocalEnabled.value}
					onCheckedChange={handleLocalSwitchChange}
				/>

				<div class="space-y-2">
					<SwitchWithLabel
						id="oidcAuthSwitch"
						label={m.security_oidc_auth_label()}
						description={oidcStatus.envForced ? m.security_oidc_auth_description_forced() : m.security_oidc_auth_description()}
						disabled={oidcStatus.envForced}
						checked={$formInputs.authOidcEnabled.value}
						onCheckedChange={handleOidcSwitchChange}
					/>

					{#if isOidcActive()}
						<div class="pl-8 sm:pl-11">
							{#if oidcStatus.envForced}
								{#if !oidcStatus.envConfigured}
									<Button variant="link" class="text-destructive h-auto p-0 text-xs hover:underline" onclick={openOidcDialog}>
										{m.security_server_forces_oidc_missing_env()}
									</Button>
								{:else}
									<Button variant="link" class="h-auto p-0 text-xs text-sky-600 hover:underline" onclick={openOidcDialog}>
										{m.security_oidc_configured_forced_view()}
									</Button>
								{/if}
							{:else}
								<Button variant="link" class="h-auto p-0 text-xs text-sky-600 hover:underline" onclick={openOidcDialog}>
									{m.security_manage_oidc_config()}
								</Button>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Session Settings Card -->
	<Card.Root class="overflow-hidden">
		<Card.Header class="bg-muted/20 border-b">
			<div class="flex items-center gap-3">
				<div class="bg-primary/10 text-primary ring-primary/20 flex size-8 items-center justify-center rounded-lg ring-1">
					<ClockIcon class="size-4" />
				</div>
				<div>
					<Card.Title class="text-base">{m.security_session_heading()}</Card.Title>
					<Card.Description class="text-xs">Configure session timeout and duration</Card.Description>
				</div>
			</div>
		</Card.Header>
		<Card.Content class="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 sm:pt-3">
			<FormInput
				type="number"
				id="sessionTimeout"
				label={m.security_session_timeout_label()}
				placeholder={m.security_session_timeout_placeholder()}
				bind:input={$formInputs.authSessionTimeout}
				description={m.security_session_timeout_description()}
			/>
		</Card.Content>
	</Card.Root>

	<!-- Password Policy Card -->
	<Card.Root class="overflow-hidden">
		<Card.Header class="bg-muted/20 border-b">
			<div class="flex items-center gap-3">
				<div class="bg-primary/10 text-primary ring-primary/20 flex size-8 items-center justify-center rounded-lg ring-1">
					<KeyIcon class="size-4" />
				</div>
				<div>
					<Card.Title class="text-base">{m.security_password_policy_label()}</Card.Title>
					<Card.Description class="text-xs">Set password strength requirements</Card.Description>
				</div>
			</div>
		</Card.Header>
		<Card.Content class="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 sm:pt-3">
			<Tooltip.Provider>
				<div class="grid grid-cols-1 gap-2 sm:gap-3 sm:grid-cols-3" role="group" aria-labelledby="passwordPolicyLabel">
					<Tooltip.Root>
						<Tooltip.Trigger>
							<Button
								variant={$formInputs.authPasswordPolicy.value === 'basic' ? 'default' : 'outline'}
								class={$formInputs.authPasswordPolicy.value === 'basic'
									? 'arcane-button-create w-full text-xs sm:text-sm h-12'
									: 'arcane-button-restart w-full text-xs sm:text-sm h-12'}
								onclick={() => ($formInputs.authPasswordPolicy.value = 'basic')}
								type="button"
								>{m.security_password_policy_basic()}
							</Button>
						</Tooltip.Trigger>
						<Tooltip.Content side="top" align="center">{m.security_password_policy_basic_tooltip()}</Tooltip.Content>
					</Tooltip.Root>

					<Tooltip.Root>
						<Tooltip.Trigger>
							<Button
								variant={$formInputs.authPasswordPolicy.value === 'standard' ? 'default' : 'outline'}
								class={$formInputs.authPasswordPolicy.value === 'standard'
									? 'arcane-button-create w-full text-xs sm:text-sm h-12'
									: 'arcane-button-restart w-full text-xs sm:text-sm h-12'}
								onclick={() => ($formInputs.authPasswordPolicy.value = 'standard')}
								type="button"
								>{m.security_password_policy_standard()}
							</Button>
						</Tooltip.Trigger>
						<Tooltip.Content side="top" align="center">{m.security_password_policy_standard_tooltip()}</Tooltip.Content>
					</Tooltip.Root>

					<Tooltip.Root>
						<Tooltip.Trigger>
							<Button
								variant={$formInputs.authPasswordPolicy.value === 'strong' ? 'default' : 'outline'}
								class={$formInputs.authPasswordPolicy.value === 'strong'
									? 'arcane-button-create w-full text-xs sm:text-sm h-12'
									: 'arcane-button-restart w-full text-xs sm:text-sm h-12'}
								onclick={() => ($formInputs.authPasswordPolicy.value = 'strong')}
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

<!-- Save Actions -->
<div class="mt-8 flex items-center justify-between border-t pt-6">
	<div class="text-sm text-muted-foreground">
		{#if hasChanges()}
			<span class="text-orange-600 dark:text-orange-400">• Unsaved changes</span>
		{:else}
			<span class="text-green-600 dark:text-green-400">• All changes saved</span>
		{/if}
	</div>
	
	<div class="flex gap-3">
		{#if hasChanges()}
			<Button 
				variant="outline" 
				onclick={() => window.location.reload()}
				disabled={isLoading.saving}
			>
				{m.common_reset()}
			</Button>
		{/if}
		
		<form onsubmit={preventDefault(onSubmit)} class="inline">
			<Button 
				type="submit" 
				disabled={isLoading.saving || !hasChanges()} 
				class="min-w-[120px]"
			>
				{#if isLoading.saving}
					<div class="mr-2 size-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
					{m.common_saving()}
				{:else}
					<SaveIcon class="mr-2 size-4" />
					{m.common_save()}
				{/if}
			</Button>
		</form>
	</div>
</div>

<OidcConfigDialog
	bind:open={showOidcConfigDialog}
	currentSettings={settings}
	{oidcStatus}
	bind:oidcForm={oidcConfigForm}
	onSave={handleSaveOidcConfig}
/>
