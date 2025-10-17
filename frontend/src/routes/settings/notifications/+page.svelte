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
				toast.success('Discord settings saved successfully');
			} else {
				const error = await response.json();
				toast.error(`Failed to save Discord settings: ${error.error || 'Unknown error'}`);
			}
		} catch (error) {
			toast.error('Failed to save Discord settings');
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
				.map(addr => addr.trim())
				.filter(addr => addr.length > 0);

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
				toast.success('Email settings saved successfully');
			} else {
				const error = await response.json();
				toast.error(`Failed to save Email settings: ${error.error || 'Unknown error'}`);
			}
		} catch (error) {
			toast.error('Failed to save Email settings');
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
				toast.success(`Test notification sent successfully via ${provider}`);
			} else {
				const error = await response.json();
				toast.error(`Failed to send test notification: ${error.error || 'Unknown error'}`);
			}
		} catch (error) {
			toast.error('Failed to send test notification');
			console.error(error);
		} finally {
			isTesting = false;
		}
	}
</script>

<SettingsPageLayout title="Notifications" description="Configure notifications for container updates">
	<div class="space-y-6">
		{#if isReadOnly}
			<Alert.Root variant="default">
				<Alert.Title>Read-only Mode</Alert.Title>
				<Alert.Description>
					Settings are read-only in this environment. Configuration changes are disabled.
				</Alert.Description>
			</Alert.Root>
		{/if}

		<!-- Discord Notifications -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center gap-2">
					<BellIcon class="h-5 w-5" />
					<Card.Title>Discord Notifications</Card.Title>
				</div>
				<Card.Description>
					Send notifications to Discord when container updates are detected
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<SwitchWithLabel
					bind:checked={discordEnabled}
					disabled={isReadOnly}
					label="Enable Discord Notifications"
					description="Send update notifications to Discord via webhook"
				/>

				{#if discordEnabled}
					<div class="space-y-4 border-l-2 pl-4">
						<TextInputWithLabel
							bind:value={discordWebhookUrl}
							disabled={isReadOnly}
							label="Webhook URL"
							placeholder="https://discord.com/api/webhooks/..."
							type="text"
							helperText="Discord webhook URL for sending notifications"
						/>

						<TextInputWithLabel
							bind:value={discordUsername}
							disabled={isReadOnly}
							label="Bot Username"
							placeholder="Arcane"
							type="text"
							helperText="Display name for the notification bot"
						/>

						<TextInputWithLabel
							bind:value={discordAvatarUrl}
							disabled={isReadOnly}
							label="Avatar URL (Optional)"
							placeholder="https://..."
							type="text"
							helperText="Avatar image URL for the notification bot"
						/>
					</div>
				{/if}
			</Card.Content>
			<Card.Footer class="flex gap-2">
				<Button onclick={saveDiscordSettings} disabled={isReadOnly || isLoading}>
					Save Discord Settings
				</Button>
				{#if discordEnabled}
					<Button
						variant="outline"
						onclick={() => testNotification('discord')}
						disabled={isReadOnly || isTesting}
					>
						<SendIcon class="mr-2 h-4 w-4" />
						Test Discord
					</Button>
				{/if}
			</Card.Footer>
		</Card.Root>

		<!-- Email Notifications -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center gap-2">
					<BellIcon class="h-5 w-5" />
					<Card.Title>Email Notifications</Card.Title>
				</div>
				<Card.Description>
					Send notifications via email when container updates are detected
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<SwitchWithLabel
					bind:checked={emailEnabled}
					disabled={isReadOnly}
					label="Enable Email Notifications"
					description="Send update notifications via email (SMTP)"
				/>

				{#if emailEnabled}
					<div class="space-y-4 border-l-2 pl-4">
						<div class="grid grid-cols-2 gap-4">
							<TextInputWithLabel
								bind:value={emailSmtpHost}
								disabled={isReadOnly}
								label="SMTP Host"
								placeholder="smtp.example.com"
								type="text"
								helperText="SMTP server hostname"
							/>

							<div class="space-y-2">
								<Label for="smtp-port">SMTP Port</Label>
								<Input
									id="smtp-port"
									type="number"
									bind:value={emailSmtpPort}
									disabled={isReadOnly}
									placeholder="587"
								/>
								<p class="text-sm text-muted-foreground">SMTP server port (usually 587 or 465)</p>
							</div>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<TextInputWithLabel
								bind:value={emailSmtpUsername}
								disabled={isReadOnly}
								label="SMTP Username"
								placeholder="user@example.com"
								type="text"
								helperText="SMTP authentication username"
							/>

							<TextInputWithLabel
								bind:value={emailSmtpPassword}
								disabled={isReadOnly}
								label="SMTP Password"
								placeholder="••••••••"
								type="password"
								helperText="SMTP authentication password"
							/>
						</div>

						<TextInputWithLabel
							bind:value={emailFromAddress}
							disabled={isReadOnly}
							label="From Address"
							placeholder="notifications@example.com"
							type="email"
							helperText="Email address to send notifications from"
						/>

						<div class="space-y-2">
							<Label for="to-addresses">To Addresses</Label>
							<Textarea
								id="to-addresses"
								bind:value={emailToAddresses}
								disabled={isReadOnly}
								placeholder="user1@example.com, user2@example.com"
								rows={2}
							/>
							<p class="text-sm text-muted-foreground">
								Comma-separated list of email addresses to send notifications to
							</p>
						</div>

						<SwitchWithLabel
							bind:checked={emailUseTls}
							disabled={isReadOnly}
							label="Use TLS"
							description="Enable TLS/SSL encryption for SMTP connection"
						/>
					</div>
				{/if}
			</Card.Content>
			<Card.Footer class="flex gap-2">
				<Button onclick={saveEmailSettings} disabled={isReadOnly || isLoading}>
					Save Email Settings
				</Button>
				{#if emailEnabled}
					<Button
						variant="outline"
						onclick={() => testNotification('email')}
						disabled={isReadOnly || isTesting}
					>
						<SendIcon class="mr-2 h-4 w-4" />
						Test Email
					</Button>
				{/if}
			</Card.Footer>
		</Card.Root>

		<!-- Information -->
		<Alert.Root>
			<Alert.Title>How Notifications Work</Alert.Title>
			<Alert.Description>
				<ul class="list-disc pl-4 space-y-1 mt-2">
					<li>Notifications are sent when image updates are detected during polling</li>
					<li>Each enabled notification provider will receive notifications independently</li>
					<li>Test notifications help verify your configuration is working correctly</li>
					<li>Webhook URLs and passwords are encrypted before being stored in the database</li>
				</ul>
			</Alert.Description>
		</Alert.Root>
	</div>
</SettingsPageLayout>
