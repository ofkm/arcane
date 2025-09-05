<script lang="ts">
	import { z } from 'zod/v4';
	import { createForm, preventDefault } from '$lib/utils/form.utils';
	import * as FieldSet from '$lib/components/ui/field-set';
	import { Button } from '$lib/components/ui/button';
	import FormInput from '$lib/components/form/form-input.svelte';
	import SwitchWithLabel from '$lib/components/form/labeled-switch.svelte';
	import OidcConfigDialog from '$lib/components/dialogs/oidc-config-dialog.svelte';
	import { toast } from 'svelte-sonner';
	import type { Settings } from '$lib/types/settings.type';
	import type { OidcStatus } from '$lib/services/api/oidc-api-service';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';

	let {
		settings,
		oidcStatus,
		callback
	}: {
		settings: Settings;
		oidcStatus: OidcStatus;
		callback: (appConfig: Partial<Settings>) => Promise<void>;
	} = $props();

	let isLoading = $state({ saving: false });
	let showOidcConfigDialog = $state(false);

	let oidcConfigForm = $state({
		clientId: '',
		clientSecret: '',
		issuerUrl: '',
		scopes: 'openid email profile'
	});

	const formSchema = z.object({
		authLocalEnabled: z.boolean(),
		authOidcEnabled: z.boolean(),
		authSessionTimeout: z
			.number('Session timeout is required')
			.int('Must be an integer')
			.min(15, 'Minimum is 15 minutes')
			.max(1440, 'Maximum is 1440 minutes'),
		authPasswordPolicy: z.enum(['basic', 'standard', 'strong'])
	});

	let { inputs: formInputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, settings));

	async function onSubmit() {
		const data = form.validate();
		if (!data) return;

		isLoading.saving = true;

		let authOidcConfig = settings.authOidcConfig;
		if (data.authOidcEnabled && !oidcStatus.envForced) {
			authOidcConfig = JSON.stringify({
				clientId: oidcConfigForm.clientId,
				clientSecret: oidcConfigForm.clientSecret || '',
				issuerUrl: oidcConfigForm.issuerUrl,
				scopes: oidcConfigForm.scopes
			});
		}

		await callback({
			authLocalEnabled: data.authLocalEnabled,
			authOidcEnabled: data.authOidcEnabled,
			authSessionTimeout: data.authSessionTimeout,
			authPasswordPolicy: data.authPasswordPolicy
		})
			.then(() => toast.success('Settings Saved Successfully'))
			.finally(() => (isLoading.saving = false));
	}
	const effectivelyEnabled = $derived(oidcStatus.envForced || oidcStatus.dbEnabled);

	function handleOidcSwitchChange(checked: boolean) {
		$formInputs.authOidcEnabled.value = checked;

		if (checked && !oidcStatus.envForced && !effectivelyEnabled) {
			showOidcConfigDialog = true;
		}
	}

	function openOidcDialog() {
		if (settings.authOidcConfig) {
			const cfg = JSON.parse(settings.authOidcConfig);
			oidcConfigForm.clientId = cfg.clientId || '';
			oidcConfigForm.issuerUrl = cfg.issuerUrl || '';
			oidcConfigForm.scopes = cfg.scopes || 'openid email profile';
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
				scopes: oidcConfigForm.scopes
			});

			await callback({
				authOidcEnabled: true,
				authOidcConfig
			});

			toast.success('OIDC configuration saved successfully.');
			showOidcConfigDialog = false;
		} finally {
			isLoading.saving = false;
		}
	}
</script>

<form onsubmit={preventDefault(onSubmit)} class="space-y-6">
	<div class="w-full p-6">
		<FieldSet.Root>
			<FieldSet.Content class="flex flex-col gap-8">
				<div class="min-w-0 space-y-4">
					<h2 class="text-muted-foreground text-sm font-semibold">Authentication</h2>

					<SwitchWithLabel
						id="localAuthSwitch"
						label="Local Authentication"
						description="Username and password stored by Arcane. Keep enabled as a fallback."
						bind:checked={$formInputs.authLocalEnabled.value}
					/>

					<div class="space-y-2">
						<SwitchWithLabel
							id="oidcAuthSwitch"
							label="OIDC Authentication"
							description={`Use an external OIDC provider${oidcStatus.envForced ? ' (forced by server)' : ''}`}
							disabled={oidcStatus.envForced}
							checked={$formInputs.authOidcEnabled.value}
							onCheckedChange={handleOidcSwitchChange}
						/>
						{#if effectivelyEnabled}
							<div class="pl-11">
								{#if oidcStatus.envForced && !oidcStatus.envConfigured}
									<Button variant="link" class="text-destructive h-auto p-0 text-xs hover:underline" onclick={openOidcDialog}>
										Server forces OIDC, but env vars missing. Configure or fix server env.
									</Button>
								{:else if oidcStatus.envForced && oidcStatus.envConfigured}
									<Button variant="link" class="h-auto p-0 text-xs text-sky-600 hover:underline" onclick={openOidcDialog}>
										OIDC configured & forced by server. View status.
									</Button>
								{:else if !oidcStatus.envForced && effectivelyEnabled && oidcStatus.dbConfigured}
									<Button variant="link" class="h-auto p-0 text-xs text-sky-600 hover:underline" onclick={openOidcDialog}>
										OIDC configured via application settings. Manage.
									</Button>
								{:else if !oidcStatus.envForced && effectivelyEnabled && !oidcStatus.dbConfigured}
									<Button variant="link" class="text-destructive h-auto p-0 text-xs hover:underline" onclick={openOidcDialog}>
										OIDC enabled, but settings incomplete. Configure.
									</Button>
								{/if}
							</div>
						{/if}
					</div>
				</div>

				<div class="min-w-0 space-y-4">
					<h2 class="text-muted-foreground text-sm font-semibold">Session</h2>

					<FormInput
						type="number"
						id="sessionTimeout"
						label="Session Timeout (minutes)"
						placeholder="60"
						bind:input={$formInputs.authSessionTimeout}
						description="Inactive sessions will be logged out automatically (15–1440 minutes)."
					/>

					<div class="space-y-2">
						<span class="text-sm font-medium" id="passwordPolicyLabel">Password Policy</span>
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
											type="button">Basic</Button
										>
									</Tooltip.Trigger>
									<Tooltip.Content side="top" align="center">Minimum 8 characters.</Tooltip.Content>
								</Tooltip.Root>

								<Tooltip.Root>
									<Tooltip.Trigger>
										<Button
											variant={$formInputs.authPasswordPolicy.value === 'standard' ? 'default' : 'outline'}
											class={$formInputs.authPasswordPolicy.value === 'standard'
												? 'arcane-button-create w-full'
												: 'arcane-button-restart w-full'}
											onclick={() => ($formInputs.authPasswordPolicy.value = 'standard')}
											type="button">Standard</Button
										>
									</Tooltip.Trigger>
									<Tooltip.Content side="top" align="center">10+ chars with upper, lower, and a number.</Tooltip.Content>
								</Tooltip.Root>

								<Tooltip.Root>
									<Tooltip.Trigger>
										<Button
											variant={$formInputs.authPasswordPolicy.value === 'strong' ? 'default' : 'outline'}
											class={$formInputs.authPasswordPolicy.value === 'strong'
												? 'arcane-button-create w-full'
												: 'arcane-button-restart w-full'}
											onclick={() => ($formInputs.authPasswordPolicy.value = 'strong')}
											type="button">Strong</Button
										>
									</Tooltip.Trigger>
									<Tooltip.Content side="top" align="center">12+ chars with upper, lower, number, and symbol.</Tooltip.Content>
								</Tooltip.Root>
							</div>
						</Tooltip.Provider>
					</div>
				</div>
			</FieldSet.Content>

			<FieldSet.Footer>
				<div class="flex w-full place-items-center justify-between">
					<span class="text-muted-foreground text-sm">Save your updated settings.</span>
					<Button type="submit" disabled={isLoading.saving} size="sm">{isLoading.saving ? 'Saving…' : 'Save'}</Button>
				</div>
			</FieldSet.Footer>
		</FieldSet.Root>
	</div>

	<OidcConfigDialog
		bind:open={showOidcConfigDialog}
		currentSettings={settings}
		{oidcStatus}
		bind:oidcForm={oidcConfigForm}
		onSave={handleSaveOidcConfig}
	/>
</form>
