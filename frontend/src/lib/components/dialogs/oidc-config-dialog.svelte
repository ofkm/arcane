<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import KeyIcon from '@lucide/svelte/icons/key';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import InfoIcon from '@lucide/svelte/icons/info';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { toast } from 'svelte-sonner';
	import type { Settings } from '$lib/types/settings.type';
	import type { OidcStatus } from '$lib/services/api/oidc-api-service';

	interface OidcForm {
		clientId: string;
		clientSecret: string;
		issuerUrl: string;
		scopes: string;
	}

	let {
		open = $bindable(),
		currentSettings,
		oidcStatus,
		oidcForm = $bindable(),
		onSave
	}: {
		open: boolean;
		currentSettings: Settings;
		oidcStatus: OidcStatus;
		oidcForm: OidcForm;
		onSave: () => void;
	} = $props();

	let isOidcViewMode = $derived(oidcStatus.envForced && oidcStatus.envConfigured);
	let redirectUri = $derived(`${globalThis?.location?.origin ?? ''}/auth/oidc/callback`);

	let parsedOidcConfig = $derived(() => {
		if (!currentSettings.authOidcConfig) {
			return {
				clientId: '',
				clientSecret: '',
				issuerUrl: '',
				scopes: 'openid email profile'
			};
		}

		try {
			return JSON.parse(currentSettings.authOidcConfig);
		} catch (error) {
			console.warn('Failed to parse OIDC config:', error);
			return {
				clientId: '',
				clientSecret: '',
				issuerUrl: '',
				scopes: 'openid email profile'
			};
		}
	});

	const statusItems = $derived([
		{ label: 'Env Forced', value: oidcStatus.envForced, hint: 'Server forces OIDC' },
		{ label: 'Env Configured', value: oidcStatus.envConfigured, hint: 'Server OIDC vars present' },
		{ label: 'DB Enabled', value: oidcStatus.dbEnabled, hint: 'App settings enable OIDC' },
		{ label: 'DB Configured', value: oidcStatus.dbConfigured, hint: 'App OIDC config saved' }
	]);

	function chipClass(v: boolean) {
		return v
			? 'bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20'
			: 'bg-muted text-muted-foreground ring-1 ring-border';
	}

	async function copyToClipboard(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			toast.success('Copied to clipboard');
		} catch {
			toast.error('Failed to copy to clipboard');
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="flex max-h-[90vh] flex-col sm:max-w-[860px]">
		<Dialog.Header class="flex-shrink-0 space-y-3">
			<Dialog.Title class="flex items-center gap-2">
				<span class="bg-primary/10 text-primary ring-primary/20 flex size-8 items-center justify-center rounded-md ring-1">
					<KeyIcon class="size-4" />
				</span>
				{#if isOidcViewMode}
					OIDC Server Configuration Status
				{:else if oidcStatus.envForced && !oidcStatus.envConfigured}
					Configure OIDC (Server Override Warning)
				{:else}
					Configure OIDC Provider
				{/if}
			</Dialog.Title>
			<Dialog.Description class="text-sm leading-relaxed">
				{#if isOidcViewMode}
					OIDC authentication is configured and forced ON by server-side environment variables. These settings are read-only.
				{:else if oidcStatus.envForced && !oidcStatus.envConfigured}
					OIDC usage is forced ON by the server environment (<code class="bg-muted rounded px-1 py-0.5 text-xs"
						>OIDC_ENABLED=true</code
					>), but critical server-side OIDC environment variables appear to be missing or incomplete.
				{:else}
					Configure the OIDC settings for your application. These settings will be saved to the database and used for OIDC
					authentication.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<div class="min-h-0 flex-1 overflow-y-auto py-4">
			<div class="grid gap-6 lg:grid-cols-[1fr_18rem]">
				<!-- Main column -->
				<div class="space-y-6">
					{#if isOidcViewMode}
						<div class="bg-card/50 rounded-lg border p-4">
							<h3 class="text-base font-semibold">Server Environment Configuration</h3>
							<p class="text-muted-foreground mb-4 mt-1 text-sm">
								The following OIDC settings are loaded from the server environment:
							</p>

							{#if currentSettings.authOidcEnabled}
								<div class="divide-border/60 divide-y text-sm">
									<div class="flex items-center justify-between py-2">
										<span class="font-medium">Client ID</span>
										<code class="bg-muted rounded px-2 py-1 text-xs">{parsedOidcConfig().clientId || 'Not configured'}</code>
									</div>
									<div class="flex items-center justify-between py-2">
										<span class="font-medium">Issuer URL</span>
										<code class="bg-muted rounded px-2 py-1 text-xs">{parsedOidcConfig().issuerUrl || 'Not configured'}</code>
									</div>
									<div class="flex items-center justify-between py-2">
										<span class="font-medium">Client Secret</span>
										<span class="text-muted-foreground text-xs italic">(Sensitive - Not Displayed)</span>
									</div>
									<div class="flex items-center justify-between py-2">
										<span class="font-medium">Scopes</span>
										<code class="bg-muted rounded px-2 py-1 text-xs">{parsedOidcConfig().scopes || 'openid email profile'}</code>
									</div>
								</div>
							{:else}
								<div class="py-6 text-center">
									<TriangleAlertIcon class="text-destructive mx-auto mb-2 size-8" />
									<p class="text-destructive text-sm font-medium">OIDC configuration details not found in effective settings.</p>
								</div>
							{/if}

							<div class="bg-muted/40 mt-4 rounded-md p-3">
								<p class="text-muted-foreground text-xs">
									Changes to these settings must be made in your server's environment configuration.
								</p>
							</div>
						</div>
					{:else}
						<!-- Editable form -->
						<div class="bg-card/50 rounded-lg border p-4">
							<h3 class="text-base font-semibold">Basic Configuration</h3>
							<p class="text-muted-foreground mb-4 mt-1 text-sm">Essential OIDC provider settings</p>

							<div class="space-y-4">
								<div class="space-y-2">
									<Label for="oidcClientId" class="text-sm font-medium">Client ID</Label>
									<Input
										id="oidcClientId"
										bind:value={oidcForm.clientId}
										placeholder="Provided by your OIDC Provider"
										class="font-mono text-sm"
									/>
								</div>

								<div class="space-y-2">
									<Label for="oidcClientSecret" class="text-sm font-medium">Client Secret</Label>
									<Input
										id="oidcClientSecret"
										type="password"
										bind:value={oidcForm.clientSecret}
										placeholder="Provided by your OIDC Provider (leave blank to keep existing)"
										class="font-mono text-sm"
									/>
								</div>

								<div class="space-y-2">
									<Label for="oidcIssuerUrl" class="text-sm font-medium">Issuer URL</Label>
									<Input
										id="oidcIssuerUrl"
										bind:value={oidcForm.issuerUrl}
										placeholder="https://id.example.com"
										class="font-mono text-sm"
									/>
									<p class="text-muted-foreground text-xs">The issuer URL will be used to auto-discover OIDC endpoints.</p>
								</div>

								<div class="space-y-2">
									<Label for="oidcScopes" class="text-sm font-medium">Scopes</Label>
									<Input
										id="oidcScopes"
										bind:value={oidcForm.scopes}
										placeholder="openid email profile"
										class="font-mono text-sm"
									/>
								</div>
							</div>
						</div>

						{#if oidcStatus.envForced && !oidcStatus.envConfigured}
							<div class="border-destructive/50 bg-destructive/5 rounded-lg border p-4">
								<div class="mb-2 flex items-center gap-2">
									<TriangleAlertIcon class="text-destructive size-4" />
									<h3 class="text-destructive text-base font-semibold">Server Override Warning</h3>
								</div>
								<p class="text-destructive/80 text-sm">
									Server forces OIDC, but environment variables appear incomplete. Prefer fixing server env, or save app-level
									config below.
								</p>
							</div>
						{/if}
					{/if}

					<!-- Redirect URI -->
					<div class="bg-card/50 rounded-lg border p-4">
						<div class="mb-3 flex items-center gap-2">
							<InfoIcon class="size-4 text-blue-600" />
							<h3 class="text-base font-semibold">Redirect URI Configuration</h3>
						</div>
						<p class="text-muted-foreground mb-3 text-sm">Configure this redirect URI in your OIDC provider:</p>
						<div class="flex items-center gap-2">
							<code class="bg-muted flex-1 break-all rounded p-2 font-mono text-xs">{redirectUri}</code>
							<Button size="sm" variant="outline" onclick={() => copyToClipboard(redirectUri)} class="flex-shrink-0">
								<CopyIcon class="size-3" />
							</Button>
						</div>
					</div>
				</div>

				<!-- Side panel (lg+) -->
				<aside class="hidden lg:block">
					<div class="sticky top-4 space-y-4">
						<div class="bg-card/50 rounded-lg border p-4">
							<h3 class="text-sm font-semibold">Status</h3>
							<ul class="mt-3 space-y-2">
								{#each statusItems as s (s.label)}
									<li class="flex items-center justify-between">
										<span class="text-muted-foreground text-sm">{s.label}</span>
										<span class={'rounded px-2 py-0.5 text-xs ring-1 ' + chipClass(s.value)}>{s.value ? 'Yes' : 'No'}</span>
									</li>
								{/each}
							</ul>
						</div>

						<div class="bg-card/50 rounded-lg border p-4">
							<h3 class="text-sm font-semibold">Tips</h3>
							<ul class="text-muted-foreground mt-3 list-disc space-y-1 pl-5 text-xs">
								<li>If your server forces OIDC, app settings become read-only.</li>
								<li>Use issuer discovery; avoid hardcoding endpoints.</li>
								<li>Keep client secrets out of the UI when possible.</li>
							</ul>
						</div>
					</div>
				</aside>
			</div>
		</div>

		<Dialog.Footer class="flex flex-shrink-0 gap-3 border-t pt-4">
			<Button variant="outline" onclick={() => (open = false)} class="flex-1 sm:flex-none">Close</Button>
			{#if !isOidcViewMode}
				<Button onclick={onSave} class="flex-1 sm:flex-none">
					<KeyIcon class="mr-2 size-4" />
					Save OIDC Settings
				</Button>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
