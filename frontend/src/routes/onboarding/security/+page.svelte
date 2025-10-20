<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import * as FieldSet from '$lib/components/ui/field-set';
	import FormInput from '$lib/components/form/form-input.svelte';
	import SwitchWithLabel from '$lib/components/form/labeled-switch.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import OidcConfigDialog from '$lib/components/dialogs/oidc-config-dialog.svelte';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { createForm, preventDefault } from '$lib/utils/form.utils';
	import { z } from 'zod/v4';
	import { m } from '$lib/paraglide/messages';
	import { settingsService } from '$lib/services/settings-service';

	let { data }: { data: PageData } = $props();
	let currentSettings = $state(data.settings);
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

	// Match the settings form schema and logic
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
		.superRefine((val, ctx) => {
			if (data.oidcStatus.envForced) return;
			if (!val.authLocalEnabled && !val.authOidcEnabled) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: m.security_enable_one_provider(),
					path: ['authLocalEnabled']
				});
			}
		});

	let { inputs: formInputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, currentSettings));

	const isOidcActive = () => $formInputs.authOidcEnabled.value || data.oidcStatus.envForced;

	function openOidcDialog() {
		if (currentSettings.authOidcConfig) {
			try {
				const cfg = JSON.parse(currentSettings.authOidcConfig);
				oidcConfigForm.clientId = cfg.clientId || '';
				oidcConfigForm.issuerUrl = cfg.issuerUrl || '';
				oidcConfigForm.scopes = cfg.scopes || 'openid email profile';
				oidcConfigForm.adminClaim = cfg.adminClaim || '';
				oidcConfigForm.adminValue = cfg.adminValue || '';
			} catch {}
		}
		oidcConfigForm.clientSecret = '';
		showOidcConfigDialog = true;
	}

	function handleOidcSwitchChange(checked: boolean) {
		$formInputs.authOidcEnabled.value = checked;

		if (!checked && !$formInputs.authLocalEnabled.value && !data.oidcStatus.envForced) {
			$formInputs.authLocalEnabled.value = true;
			toast.info(m.security_local_enabled_info());
		}

		if (checked && !data.oidcStatus.envForced) {
			openOidcDialog();
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

	async function handleSaveOidcConfig() {
		try {
			isLoading.saving = true;
			$formInputs.authOidcEnabled.value = true;

			const validated = form.validate();
			if (!validated) {
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

			const payload = {
				...currentSettings,
				authOidcEnabled: true,
				authOidcConfig
			};

			await settingsService.updateSettings(payload);
			toast.success(m.security_oidc_saved());
			showOidcConfigDialog = false;
		} finally {
			isLoading.saving = false;
		}
	}

	async function handleNext() {
		const validated = form.validate();
		if (!validated) return;

		isLoading.saving = true;
		try {
			const payload = {
				...currentSettings,
				...validated,
				onboardingCompleted: false,
				onboardingSteps: {
					...currentSettings.onboardingSteps,
					security: true
				}
			};

			await settingsService.updateSettings(payload);
			goto('/onboarding/settings');
		} catch {
			toast.error(m.security_settings_save_failed());
		} finally {
			isLoading.saving = false;
		}
	}

	function handleBack() {
		goto('/onboarding/docker');
	}

	function handleSkip() {
		goto('/onboarding/settings');
	}
</script>

<div class="space-y-6">
	<div class="text-center">
		<h2 class="text-2xl font-bold">{m.security_title()}</h2>
		<p class="text-muted-foreground mt-2">{m.security_description()}</p>
	</div>

	<form onsubmit={preventDefault(handleNext)} class="space-y-6">
		<FieldSet.Root>
			<FieldSet.Content class="flex flex-col gap-8">
				<div class="min-w-0 space-y-4">
					<h2 class="text-muted-foreground text-sm font-semibold">{m.security_authentication_heading()}</h2>

					<SwitchWithLabel
						id="localAuthSwitch"
						label={m.security_local_auth_label()}
						description={m.security_local_auth_description()}
						error={$formInputs.authLocalEnabled.error}
						bind:checked={$formInputs.authLocalEnabled.value}
						onCheckedChange={handleLocalSwitchChange}
					/>

					<div class="space-y-2">
						<SwitchWithLabel
							id="oidcAuthSwitch"
							label={m.security_oidc_auth_label()}
							description={data.oidcStatus.envForced
								? m.security_oidc_auth_description_forced()
								: m.security_oidc_auth_description()}
							error={$formInputs.authOidcEnabled.error}
							disabled={data.oidcStatus.envForced}
							checked={$formInputs.authOidcEnabled.value}
							onCheckedChange={handleOidcSwitchChange}
						/>

						{#if isOidcActive()}
							<div class="pl-11">
								{#if data.oidcStatus.envForced}
									{#if !data.oidcStatus.envConfigured}
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

				<div class="min-w-0 space-y-4">
					<h2 class="text-muted-foreground text-sm font-semibold">{m.security_session_heading()}</h2>

					<FormInput
						type="number"
						id="sessionTimeout"
						label={m.security_session_timeout_label()}
						placeholder={m.security_session_timeout_placeholder()}
						bind:input={$formInputs.authSessionTimeout}
						description={m.security_session_timeout_description()}
					/>

					<div class="space-y-2">
						<span class="text-sm font-medium" id="passwordPolicyLabel">{m.security_password_policy_label()}</span>
						<Tooltip.Provider>
							<div class="mt-2 grid grid-cols-3 gap-2" role="group" aria-labelledby="passwordPolicyLabel">
								<Tooltip.Root>
									<Tooltip.Trigger>
										<Button
											variant={$formInputs.authPasswordPolicy.value === 'basic' ? 'default' : 'outline'}
											class={$formInputs.authPasswordPolicy.value === 'basic'
												? 'arcane-button-create w-full'
												: 'arcane-button-restart w-full'}
											onclick={() => ($formInputs.authPasswordPolicy.value = 'basic')}
											type="button"
											>{m.common_basic()}
										</Button>
									</Tooltip.Trigger>
									<Tooltip.Content side="top" align="center">{m.security_password_policy_basic_tooltip()}</Tooltip.Content>
								</Tooltip.Root>

								<Tooltip.Root>
									<Tooltip.Trigger>
										<Button
											variant={$formInputs.authPasswordPolicy.value === 'standard' ? 'default' : 'outline'}
											class={$formInputs.authPasswordPolicy.value === 'standard'
												? 'arcane-button-create w-full'
												: 'arcane-button-restart w-full'}
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
												? 'arcane-button-create w-full'
												: 'arcane-button-restart w-full'}
											onclick={() => ($formInputs.authPasswordPolicy.value = 'strong')}
											type="button"
											>{m.security_password_policy_strong()}
										</Button>
									</Tooltip.Trigger>
									<Tooltip.Content side="top" align="center">{m.security_password_policy_strong_tooltip()}</Tooltip.Content>
								</Tooltip.Root>
							</div>
						</Tooltip.Provider>
					</div>
				</div>
			</FieldSet.Content>

			<FieldSet.Footer>
				<div class="flex w-full place-items-center justify-between">
					<span class="text-muted-foreground text-sm">{m.security_save_instructions()}</span>
					<div class="flex gap-2">
						<Button type="button" variant="outline" onclick={handleBack}>{m.common_back()}</Button>
						<Button type="button" variant="ghost" onclick={handleSkip}>{m.common_skip()}</Button>
						<Button type="submit" disabled={isLoading.saving}>
							{#if isLoading.saving}
								<Spinner class="mr-2 size-4" />
							{/if}
							{m.common_continue?.() ?? 'Continue'}
						</Button>
					</div>
				</div>
			</FieldSet.Footer>
		</FieldSet.Root>
	</form>

	<OidcConfigDialog
		bind:open={showOidcConfigDialog}
		{currentSettings}
		oidcStatus={data.oidcStatus}
		bind:oidcForm={oidcConfigForm}
		onSave={handleSaveOidcConfig}
	/>
</div>
