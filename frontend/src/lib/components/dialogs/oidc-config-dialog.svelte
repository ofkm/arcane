<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Key, AlertTriangle, Info, ChevronDown, Copy } from '@lucide/svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { toast } from 'svelte-sonner';
	import type { Settings } from '$lib/types/settings.type';

	interface OidcStatus {
		envForced: boolean;
		envConfigured: boolean;
		effectivelyEnabled: boolean;
		effectivelyConfigured: boolean;
		dbConfigured: boolean;
	}

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
	let advancedSettingsOpen = $state(false);
	let redirectUri = $derived(`${window.location.origin}/auth/oidc/callback`);

	async function copyToClipboard(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			toast.success('Copied to clipboard');
		} catch (err) {
			toast.error('Failed to copy to clipboard');
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[700px] max-h-[90vh] flex flex-col">
		<Dialog.Header class="space-y-3 flex-shrink-0">
			<Dialog.Title class="flex items-center gap-2">
				<Key class="size-5" />
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
					OIDC authentication is configured and forced ON by server-side environment variables.
					These settings are read-only.
				{:else if oidcStatus.envForced && !oidcStatus.envConfigured}
					OIDC usage is forced ON by the server environment (<code
						class="bg-muted px-1 py-0.5 rounded text-xs">OIDC_ENABLED=true</code
					>), but critical server-side OIDC environment variables appear to be missing or
					incomplete.
				{:else}
					Configure the OIDC settings for your application. These settings will be saved to the
					database and used for OIDC authentication.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex-1 overflow-y-auto min-h-0 py-4">
			{#if isOidcViewMode}
				<!-- Read-only view for server-configured OIDC -->
				<div class="space-y-6">
					<div class="space-y-4">
						<h3 class="text-base font-semibold">Server Environment Configuration</h3>
						<p class="text-sm text-muted-foreground">
							The following OIDC settings are loaded from the server environment:
						</p>

						{#if currentSettings.auth?.oidc}
							<div class="space-y-3">
								<div class="flex justify-between items-center py-2 border-b border-border/50">
									<span class="font-medium text-sm">Client ID</span>
									<code class="bg-muted px-2 py-1 rounded text-xs">
										{currentSettings.auth.oidc.clientId}
									</code>
								</div>
								<div class="flex justify-between items-center py-2 border-b border-border/50">
									<span class="font-medium text-sm">Client Secret</span>
									<span class="text-muted-foreground italic text-xs">
										(Sensitive - Not Displayed)
									</span>
								</div>
								<div class="flex justify-between items-center py-2">
									<span class="font-medium text-sm">Scopes</span>
									<code class="bg-muted px-2 py-1 rounded text-xs">
										{currentSettings.auth.oidc.scopes}
									</code>
								</div>
							</div>
						{:else}
							<div class="text-center py-4">
								<AlertTriangle class="size-8 text-destructive mx-auto mb-2" />
								<p class="text-destructive text-sm font-medium">
									OIDC configuration details not found in effective settings.
								</p>
							</div>
						{/if}

						<div class="p-3 bg-muted/50 rounded-md">
							<p class="text-muted-foreground text-xs">
								Changes to these settings must be made in your server's environment configuration.
							</p>
						</div>
					</div>
				</div>
			{:else}
				<!-- Editable form for database-configured OIDC -->
				<div class="space-y-6">
					<!-- Basic Configuration -->
					<div class="space-y-4">
						<h3 class="text-base font-semibold">Basic Configuration</h3>
						<p class="text-sm text-muted-foreground">Essential OIDC provider settings</p>

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
								<p class="text-muted-foreground text-xs">
									The issuer URL will be used to auto-discover OIDC endpoints. This is the
									recommended approach.
								</p>
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

					<!-- Warning for server override -->
					{#if oidcStatus.envForced && !oidcStatus.envConfigured}
						<div class="border border-destructive/50 bg-destructive/5 p-4 rounded-md">
							<div class="flex items-center gap-2 mb-2">
								<AlertTriangle class="size-4 text-destructive" />
								<h3 class="text-base font-semibold text-destructive">Server Override Warning</h3>
							</div>
							<p class="text-sm text-destructive/80">
								While you can save these settings to the application database, it's strongly
								recommended to configure the OIDC settings directly in your server's environment for
								them to take full effect as intended by the server override.
							</p>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Redirect URI Information - Always shown -->
			<div class="border-t pt-6 mt-6">
				<div class="flex items-center gap-2 mb-3">
					<Info class="size-4 text-blue-600" />
					<h3 class="text-base font-semibold">Redirect URI Configuration</h3>
				</div>
				<p class="text-sm text-muted-foreground mb-3">
					Configure this redirect URI in your OIDC provider:
				</p>
				<div class="flex items-center gap-2">
					<code class="flex-1 bg-muted p-2 rounded text-xs break-all font-mono">
						{redirectUri}
					</code>
					<Button
						size="sm"
						variant="outline"
						onclick={() => copyToClipboard(redirectUri)}
						class="flex-shrink-0"
					>
						<Copy class="size-3" />
					</Button>
				</div>
			</div>
		</div>

		<Dialog.Footer class="flex gap-3 pt-4 border-t flex-shrink-0">
			<Button variant="outline" onclick={() => (open = false)} class="flex-1 sm:flex-none">
				Close
			</Button>
			{#if !isOidcViewMode}
				<Button onclick={onSave} class="flex-1 sm:flex-none">
					<Key class="size-4 mr-2" />
					Configure OIDC
				</Button>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
