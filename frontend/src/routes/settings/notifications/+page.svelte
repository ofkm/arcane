<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import SwitchWithLabel from '$lib/components/form/labeled-switch.svelte';
	import TextInputWithLabel from '$lib/components/form/text-input-with-label.svelte';
	import { SettingsPageLayout } from '$lib/layouts';
	import BellIcon from '@lucide/svelte/icons/bell';
	import SendIcon from '@lucide/svelte/icons/send';
	import settingsStore from '$lib/stores/config-store';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { m } from '$lib/paraglide/messages';

	let { data } = $props();
	let isLoading = $state(false);
	let isTesting = $state(false);
	const isReadOnly = $derived.by(() => $settingsStore.uiConfigDisabled);

	// Discord settings
	let discordEnabled = $state(false);
	let discordWebhookUrl = $state('');
	let discordUsername = $state('Arcane');
	let discordAvatarUrl = $state('');

	// Email settings
	let emailEnabled = $state(false);
	let emailSmtpHost = $state('');
	let emailSmtpPort = $state(587);
	let emailSmtpUsername = $state('');
	let emailSmtpPassword = $state('');
	let emailFromAddress = $state('');
	let emailToAddresses = $state('');
	let emailUseTls = $state(true);

	onMount(async () => {
		await loadSettings();
	});

	async function loadSettings() {
		isLoading = true;
		try {
			const response = await fetch('/api/environments/0/notifications/settings');
			if (response.ok) {
				const settings = await response.json();

				const discordSetting = settings.find((s: any) => s.provider === 'discord');
				if (discordSetting) {
					discordEnabled = discordSetting.enabled;
					if (discordSetting.config) {
						discordWebhookUrl = discordSetting.config.webhookUrl || '';
						discordUsername = discordSetting.config.username || 'Arcane';
						discordAvatarUrl = discordSetting.config.avatarUrl || '';
					}
				}

				const emailSetting = settings.find((s: any) => s.provider === 'email');
				if (emailSetting) {
					emailEnabled = emailSetting.enabled;
					if (emailSetting.config) {
						emailSmtpHost = emailSetting.config.smtpHost || '';
						emailSmtpPort = emailSetting.config.smtpPort || 587;
						emailSmtpUsername = emailSetting.config.smtpUsername || '';
						emailSmtpPassword = emailSetting.config.smtpPassword || '';
						emailFromAddress = emailSetting.config.fromAddress || '';
						emailToAddresses = (emailSetting.config.toAddresses || []).join(', ');
						emailUseTls = emailSetting.config.useTls !== false;
					}
				}
			}
		} catch (error) {
			console.error('Failed to load notification settings:', error);
		} finally {
			isLoading = false;
		}
	}

	async function saveDiscordSettings() {
		isLoading = true;
		try {
			const response = await fetch('/api/environments/0/notifications/settings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					provider: 'discord',
					enabled: discordEnabled,
					config: {
						webhookUrl: discordWebhookUrl,
						username: discordUsername,
						avatarUrl: discordAvatarUrl
					}
				})
			});

			if (response.ok) {
				toast.success(m.notifications_saved_success({ provider: 'Discord' }));
			} else {
				const error = await response.json();
				toast.error(m.notifications_saved_failed({ provider: 'Discord', error: error.error || m.common_unknown() }));
			}
		} catch (error) {
			toast.error(m.notifications_saved_failed({ provider: 'Discord', error: m.common_unknown() }));
			console.error(error);
		} finally {
			isLoading = false;
		}
	}

	async function saveEmailSettings() {
		isLoading = true;
		try {
			const toAddressArray = emailToAddresses
				.split(',')
				.map((addr) => addr.trim())
				.filter((addr) => addr.length > 0);

			const response = await fetch('/api/environments/0/notifications/settings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					provider: 'email',
					enabled: emailEnabled,
					config: {
						smtpHost: emailSmtpHost,
						smtpPort: emailSmtpPort,
						smtpUsername: emailSmtpUsername,
						smtpPassword: emailSmtpPassword,
						fromAddress: emailFromAddress,
						toAddresses: toAddressArray,
						useTls: emailUseTls
					}
				})
			});

			if (response.ok) {
				toast.success(m.notifications_saved_success({ provider: 'Email' }));
			} else {
				const error = await response.json();
				toast.error(m.notifications_saved_failed({ provider: 'Email', error: error.error || m.common_unknown() }));
			}
		} catch (error) {
			toast.error(m.notifications_saved_failed({ provider: 'Email', error: m.common_unknown() }));
			console.error(error);
		} finally {
			isLoading = false;
		}
	}

	async function testNotification(provider: string) {
		isTesting = true;
		try {
			const response = await fetch(`/api/environments/0/notifications/test/${provider}`, {
				method: 'POST'
			});

			if (response.ok) {
				toast.success(m.notifications_test_success({ provider }));
			} else {
				const error = await response.json();
				toast.error(m.notifications_test_failed({ error: error.error || m.common_unknown() }));
			}
		} catch (error) {
			toast.error(m.notifications_test_failed({ error: m.common_unknown() }));
			console.error(error);
		} finally {
			isTesting = false;
		}
	}
</script>

<SettingsPageLayout
	title={m.notifications_title()}
	description={m.notifications_description()}
	icon={BellIcon}
	pageType="form"
	showReadOnlyTag={isReadOnly}
>
	{#snippet mainContent()}
		<fieldset disabled={isReadOnly} class="relative">
			<div class="space-y-4 sm:space-y-6">
				{#if isReadOnly}
					<Alert.Root variant="default">
						<Alert.Title>{m.notifications_read_only_title()}</Alert.Title>
						<Alert.Description>{m.notifications_read_only_description()}</Alert.Description>
					</Alert.Root>
				{/if}

		<!-- Discord Notifications -->
		<Card.Root>
			<Card.Header icon={BellIcon}>
				<div class="flex flex-col space-y-1.5">
					<Card.Title>{m.notifications_discord_title()}</Card.Title>
					<Card.Description>{m.notifications_discord_description()}</Card.Description>
				</div>
			</Card.Header>
			<Card.Content class="px-3 py-4 sm:px-6 space-y-4">
				<SwitchWithLabel
					id="discord-enabled"
					bind:checked={discordEnabled}
					disabled={isReadOnly}
					label={m.notifications_discord_enabled_label()}
					description={m.notifications_discord_enabled_description()}
				/>

				{#if discordEnabled}
					<div class="space-y-4 border-l-2 pl-4">
						<TextInputWithLabel
							bind:value={discordWebhookUrl}
							disabled={isReadOnly}
							label={m.notifications_discord_webhook_url_label()}
							placeholder={m.notifications_discord_webhook_url_placeholder()}
							type="text"
							helpText={m.notifications_discord_webhook_url_help()}
						/>

						<TextInputWithLabel
							bind:value={discordUsername}
							disabled={isReadOnly}
							label={m.notifications_discord_username_label()}
							placeholder={m.notifications_discord_username_placeholder()}
							type="text"
							helpText={m.notifications_discord_username_help()}
						/>

						<TextInputWithLabel
							bind:value={discordAvatarUrl}
							disabled={isReadOnly}
							label={m.notifications_discord_avatar_url_label()}
							placeholder={m.notifications_discord_avatar_url_placeholder()}
							type="text"
							helpText={m.notifications_discord_avatar_url_help()}
						/>
					</div>
				{/if}
			</Card.Content>
			<Card.Footer class="flex gap-2">
				<Button onclick={saveDiscordSettings} disabled={isReadOnly || isLoading}>{m.notifications_discord_save_button()}</Button>
				{#if discordEnabled}
					<Button
						variant="outline"
						onclick={() => testNotification('discord')}
						disabled={isReadOnly || isTesting}
					>
						<SendIcon class="mr-2 h-4 w-4" />
						{m.notifications_discord_test_button()}
					</Button>
				{/if}
			</Card.Footer>
		</Card.Root>

		<!-- Email Notifications -->
		<Card.Root>
			<Card.Header icon={BellIcon}>
				<div class="flex flex-col space-y-1.5">
					<Card.Title>{m.notifications_email_title()}</Card.Title>
					<Card.Description>{m.notifications_email_description()}</Card.Description>
				</div>
			</Card.Header>
			<Card.Content class="px-3 py-4 sm:px-6 space-y-4">
				<SwitchWithLabel
					id="email-enabled"
					bind:checked={emailEnabled}
					disabled={isReadOnly}
					label={m.notifications_email_enabled_label()}
					description={m.notifications_email_enabled_description()}
				/>

				{#if emailEnabled}
					<div class="space-y-4 border-l-2 pl-4">
						<div class="grid grid-cols-2 gap-4">
							<TextInputWithLabel
								bind:value={emailSmtpHost}
								disabled={isReadOnly}
								label={m.notifications_email_smtp_host_label()}
								placeholder={m.notifications_email_smtp_host_placeholder()}
								type="text"
								helpText={m.notifications_email_smtp_host_help()}
							/>

							<div class="space-y-2">
								<Label for="smtp-port">{m.notifications_email_smtp_port_label()}</Label>
								<Input
									id="smtp-port"
									type="number"
									bind:value={emailSmtpPort}
									disabled={isReadOnly}
									placeholder={m.notifications_email_smtp_port_placeholder()}
								/>
								<p class="text-muted-foreground text-sm">{m.notifications_email_smtp_port_help()}</p>
							</div>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<TextInputWithLabel
								bind:value={emailSmtpUsername}
								disabled={isReadOnly}
								label={m.notifications_email_username_label()}
								placeholder={m.notifications_email_username_placeholder()}
								type="text"
								helpText={m.notifications_email_username_help()}
							/>

							<TextInputWithLabel
								bind:value={emailSmtpPassword}
								disabled={isReadOnly}
								label={m.notifications_email_password_label()}
								placeholder={m.notifications_email_password_placeholder()}
								type="password"
								helpText={m.notifications_email_password_help()}
							/>
						</div>

						<TextInputWithLabel
							bind:value={emailFromAddress}
							disabled={isReadOnly}
							label={m.notifications_email_from_address_label()}
							placeholder={m.notifications_email_from_address_placeholder()}
							type="email"
							helpText={m.notifications_email_from_address_help()}
						/>

						<div class="space-y-2">
							<Label for="to-addresses">{m.notifications_email_to_addresses_label()}</Label>
							<Textarea
								id="to-addresses"
								bind:value={emailToAddresses}
								disabled={isReadOnly}
								placeholder={m.notifications_email_to_addresses_placeholder()}
								rows={2}
							/>
							<p class="text-muted-foreground text-sm">{m.notifications_email_to_addresses_help()}</p>
						</div>

						<SwitchWithLabel
							id="email-use-tls"
							bind:checked={emailUseTls}
							disabled={isReadOnly}
							label={m.notifications_email_use_tls_label()}
							description={m.notifications_email_use_tls_description()}
						/>
					</div>
				{/if}
			</Card.Content>
			<Card.Footer class="flex gap-2">
				<Button onclick={saveEmailSettings} disabled={isReadOnly || isLoading}>{m.notifications_email_save_button()}</Button>
				{#if emailEnabled}
					<Button variant="outline" onclick={() => testNotification('email')} disabled={isReadOnly || isTesting}>
						<SendIcon class="mr-2 h-4 w-4" />
						{m.notifications_email_test_button()}
					</Button>
				{/if}
			</Card.Footer>
		</Card.Root>

		<!-- Information -->
		<Alert.Root>
			<Alert.Title>{m.notifications_info_title()}</Alert.Title>
			<Alert.Description>
				<ul class="mt-2 list-disc space-y-1 pl-4">
					<li>{m.notifications_info_item1()}</li>
					<li>{m.notifications_info_item2()}</li>
					<li>{m.notifications_info_item3()}</li>
					<li>{m.notifications_info_item4()}</li>
				</ul>
			</Alert.Description>
		</Alert.Root>
		</div>
	</fieldset>
{/snippet}
</SettingsPageLayout>
