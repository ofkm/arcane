<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import { getContext, onMount } from 'svelte';
	import { z } from 'zod/v4';
	import { createForm } from '$lib/utils/form.utils';
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
	import { notificationService } from '$lib/services/notification-service';
	import type { NotificationSettings as NotificationSettingsType } from '$lib/types/notification.type';

	interface FormNotificationSettings {
		discordEnabled: boolean;
		discordWebhookUrl: string;
		discordUsername: string;
		discordAvatarUrl: string;
		emailEnabled: boolean;
		emailSmtpHost: string;
		emailSmtpPort: number;
		emailSmtpUsername: string;
		emailSmtpPassword: string;
		emailFromAddress: string;
		emailToAddresses: string;
		emailUseTls: boolean;
	}

	let { data } = $props();
	let hasChanges = $state(false);
	let isLoading = $state(false);
	let isTesting = $state(false);
	const isReadOnly = $derived.by(() => $settingsStore.uiConfigDisabled);
	const formState = getContext('settingsFormState') as any;

	let currentSettings = $state<FormNotificationSettings>({
		discordEnabled: false,
		discordWebhookUrl: '',
		discordUsername: 'Arcane',
		discordAvatarUrl: '',
		emailEnabled: false,
		emailSmtpHost: '',
		emailSmtpPort: 587,
		emailSmtpUsername: '',
		emailSmtpPassword: '',
		emailFromAddress: '',
		emailToAddresses: '',
		emailUseTls: true
	});

	const formSchema = z.object({
		discordEnabled: z.boolean(),
		discordWebhookUrl: z.string(),
		discordUsername: z.string(),
		discordAvatarUrl: z.string(),
		emailEnabled: z.boolean(),
		emailSmtpHost: z.string(),
		emailSmtpPort: z.number().int().min(1).max(65535),
		emailSmtpUsername: z.string(),
		emailSmtpPassword: z.string(),
		emailFromAddress: z.string().email().or(z.literal('')),
		emailToAddresses: z.string(),
		emailUseTls: z.boolean()
	});

	let { inputs: formInputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, currentSettings));

	const formHasChanges = $derived.by(
		() =>
			$formInputs.discordEnabled.value !== currentSettings.discordEnabled ||
			$formInputs.discordWebhookUrl.value !== currentSettings.discordWebhookUrl ||
			$formInputs.discordUsername.value !== currentSettings.discordUsername ||
			$formInputs.discordAvatarUrl.value !== currentSettings.discordAvatarUrl ||
			$formInputs.emailEnabled.value !== currentSettings.emailEnabled ||
			$formInputs.emailSmtpHost.value !== currentSettings.emailSmtpHost ||
			$formInputs.emailSmtpPort.value !== currentSettings.emailSmtpPort ||
			$formInputs.emailSmtpUsername.value !== currentSettings.emailSmtpUsername ||
			$formInputs.emailSmtpPassword.value !== currentSettings.emailSmtpPassword ||
			$formInputs.emailFromAddress.value !== currentSettings.emailFromAddress ||
			$formInputs.emailToAddresses.value !== currentSettings.emailToAddresses ||
			$formInputs.emailUseTls.value !== currentSettings.emailUseTls
	);

	$effect(() => {
		hasChanges = formHasChanges;
		if (formState) {
			formState.hasChanges = hasChanges;
			formState.isLoading = isLoading;
		}
	});

	onMount(() => {
		// Initialize settings from loaded data
		if (data?.notificationSettings) {
			const discordSetting = data.notificationSettings.find((s) => s.provider === 'discord');
			if (discordSetting) {
				currentSettings.discordEnabled = discordSetting.enabled;
				currentSettings.discordWebhookUrl = discordSetting.config?.webhookUrl || '';
				currentSettings.discordUsername = discordSetting.config?.username || 'Arcane';
				currentSettings.discordAvatarUrl = discordSetting.config?.avatarUrl || '';
			}

			const emailSetting = data.notificationSettings.find((s) => s.provider === 'email');
			if (emailSetting) {
				currentSettings.emailEnabled = emailSetting.enabled;
				currentSettings.emailSmtpHost = emailSetting.config?.smtpHost || '';
				currentSettings.emailSmtpPort = emailSetting.config?.smtpPort || 587;
				currentSettings.emailSmtpUsername = emailSetting.config?.smtpUsername || '';
				currentSettings.emailSmtpPassword = emailSetting.config?.smtpPassword || '';
				currentSettings.emailFromAddress = emailSetting.config?.fromAddress || '';
				currentSettings.emailToAddresses = (emailSetting.config?.toAddresses || []).join(', ');
				currentSettings.emailUseTls = emailSetting.config?.useTls !== false;
			}

			// Sync form inputs after currentSettings is updated
			$formInputs.discordEnabled.value = currentSettings.discordEnabled;
			$formInputs.discordWebhookUrl.value = currentSettings.discordWebhookUrl;
			$formInputs.discordUsername.value = currentSettings.discordUsername;
			$formInputs.discordAvatarUrl.value = currentSettings.discordAvatarUrl;
			$formInputs.emailEnabled.value = currentSettings.emailEnabled;
			$formInputs.emailSmtpHost.value = currentSettings.emailSmtpHost;
			$formInputs.emailSmtpPort.value = currentSettings.emailSmtpPort;
			$formInputs.emailSmtpUsername.value = currentSettings.emailSmtpUsername;
			$formInputs.emailSmtpPassword.value = currentSettings.emailSmtpPassword;
			$formInputs.emailFromAddress.value = currentSettings.emailFromAddress;
			$formInputs.emailToAddresses.value = currentSettings.emailToAddresses;
			$formInputs.emailUseTls.value = currentSettings.emailUseTls;
		}

		if (formState) {
			formState.saveFunction = onSubmit;
			formState.resetFunction = resetForm;
		}
	});

	async function onSubmit() {
		const formData = form.validate();
		if (!formData) {
			toast.error('Please check the form for errors');
			return;
		}

		isLoading = true;

		try {
			const errors: string[] = [];

			// Save Discord settings
			try {
				await notificationService.updateSettings('discord', {
					provider: 'discord',
					enabled: formData.discordEnabled,
					config: {
						webhookUrl: formData.discordWebhookUrl,
						username: formData.discordUsername,
						avatarUrl: formData.discordAvatarUrl
					}
				});
			} catch (error: any) {
				const errorMsg = error?.response?.data?.error || error.message || 'Unknown error';
				errors.push(m.notifications_saved_failed({ provider: 'Discord', error: errorMsg }));
			}

			// Save Email settings
			try {
				const toAddressArray = formData.emailToAddresses
					.split(',')
					.map((addr) => addr.trim())
					.filter((addr) => addr.length > 0);

				await notificationService.updateSettings('email', {
					provider: 'email',
					enabled: formData.emailEnabled,
					config: {
						smtpHost: formData.emailSmtpHost,
						smtpPort: formData.emailSmtpPort,
						smtpUsername: formData.emailSmtpUsername,
						smtpPassword: formData.emailSmtpPassword,
						fromAddress: formData.emailFromAddress,
						toAddresses: toAddressArray,
						useTls: formData.emailUseTls
					}
				});
			} catch (error: any) {
				const errorMsg = error?.response?.data?.error || error.message || 'Unknown error';
				errors.push(m.notifications_saved_failed({ provider: 'Email', error: errorMsg }));
			}

			if (errors.length === 0) {
				currentSettings = formData;
				toast.success(m.general_settings_saved());
			} else {
				errors.forEach((err) => toast.error(err));
			}
		} catch (error) {
			console.error('Error saving notification settings:', error);
			toast.error('Failed to save notification settings. Please try again.');
		} finally {
			isLoading = false;
		}
	}

	function resetForm() {
		$formInputs.discordEnabled.value = currentSettings.discordEnabled;
		$formInputs.discordWebhookUrl.value = currentSettings.discordWebhookUrl;
		$formInputs.discordUsername.value = currentSettings.discordUsername;
		$formInputs.discordAvatarUrl.value = currentSettings.discordAvatarUrl;
		$formInputs.emailEnabled.value = currentSettings.emailEnabled;
		$formInputs.emailSmtpHost.value = currentSettings.emailSmtpHost;
		$formInputs.emailSmtpPort.value = currentSettings.emailSmtpPort;
		$formInputs.emailSmtpUsername.value = currentSettings.emailSmtpUsername;
		$formInputs.emailSmtpPassword.value = currentSettings.emailSmtpPassword;
		$formInputs.emailFromAddress.value = currentSettings.emailFromAddress;
		$formInputs.emailToAddresses.value = currentSettings.emailToAddresses;
		$formInputs.emailUseTls.value = currentSettings.emailUseTls;
	}

	async function testNotification(provider: string) {
		isTesting = true;
		try {
			await notificationService.testNotification(provider);
			toast.success(m.notifications_test_success({ provider }));
		} catch (error: any) {
			const errorMsg = error?.response?.data?.error || error.message || m.common_unknown();
			toast.error(m.notifications_test_failed({ error: errorMsg }));
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
					<Card.Content class="space-y-4 px-3 py-4 sm:px-6">
						<SwitchWithLabel
							id="discord-enabled"
							bind:checked={$formInputs.discordEnabled.value}
							disabled={isReadOnly}
							label={m.notifications_discord_enabled_label()}
							description={m.notifications_discord_enabled_description()}
						/>

						{#if $formInputs.discordEnabled.value}
							<div class="space-y-4 border-l-2 pl-4">
								<TextInputWithLabel
									bind:value={$formInputs.discordWebhookUrl.value}
									disabled={isReadOnly}
									label={m.notifications_discord_webhook_url_label()}
									placeholder={m.notifications_discord_webhook_url_placeholder()}
									type="text"
									helpText={m.notifications_discord_webhook_url_help()}
								/>

								<TextInputWithLabel
									bind:value={$formInputs.discordUsername.value}
									disabled={isReadOnly}
									label={m.notifications_discord_username_label()}
									placeholder={m.notifications_discord_username_placeholder()}
									type="text"
									helpText={m.notifications_discord_username_help()}
								/>

								<TextInputWithLabel
									bind:value={$formInputs.discordAvatarUrl.value}
									disabled={isReadOnly}
									label={m.notifications_discord_avatar_url_label()}
									placeholder={m.notifications_discord_avatar_url_placeholder()}
									type="text"
									helpText={m.notifications_discord_avatar_url_help()}
								/>
							</div>
						{/if}
					</Card.Content>
					<Card.Footer class="flex gap-2 px-3 py-4 sm:px-6">
						{#if $formInputs.discordEnabled.value}
							<Button variant="outline" onclick={() => testNotification('discord')} disabled={isReadOnly || isTesting}>
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
					<Card.Content class="space-y-4 px-3 py-4 sm:px-6">
						<SwitchWithLabel
							id="email-enabled"
							bind:checked={$formInputs.emailEnabled.value}
							disabled={isReadOnly}
							label={m.notifications_email_enabled_label()}
							description={m.notifications_email_enabled_description()}
						/>

						{#if $formInputs.emailEnabled.value}
							<div class="space-y-4 border-l-2 pl-4">
								<div class="grid grid-cols-2 gap-4">
									<TextInputWithLabel
										bind:value={$formInputs.emailSmtpHost.value}
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
											bind:value={$formInputs.emailSmtpPort.value}
											disabled={isReadOnly}
											placeholder={m.notifications_email_smtp_port_placeholder()}
										/>
										<p class="text-muted-foreground text-sm">{m.notifications_email_smtp_port_help()}</p>
									</div>
								</div>

								<div class="grid grid-cols-2 gap-4">
									<TextInputWithLabel
										bind:value={$formInputs.emailSmtpUsername.value}
										disabled={isReadOnly}
										label={m.notifications_email_username_label()}
										placeholder={m.notifications_email_username_placeholder()}
										type="text"
										helpText={m.notifications_email_username_help()}
									/>

									<TextInputWithLabel
										bind:value={$formInputs.emailSmtpPassword.value}
										disabled={isReadOnly}
										label={m.notifications_email_password_label()}
										placeholder={m.notifications_email_password_placeholder()}
										type="password"
										helpText={m.notifications_email_password_help()}
									/>
								</div>

								<TextInputWithLabel
									bind:value={$formInputs.emailFromAddress.value}
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
										bind:value={$formInputs.emailToAddresses.value}
										disabled={isReadOnly}
										placeholder={m.notifications_email_to_addresses_placeholder()}
										rows={2}
									/>
									<p class="text-muted-foreground text-sm">{m.notifications_email_to_addresses_help()}</p>
								</div>

								<SwitchWithLabel
									id="email-use-tls"
									bind:checked={$formInputs.emailUseTls.value}
									disabled={isReadOnly}
									label={m.notifications_email_use_tls_label()}
									description={m.notifications_email_use_tls_description()}
								/>
							</div>
						{/if}
					</Card.Content>
					<Card.Footer class="flex gap-2 px-3 py-4 sm:px-6">
						{#if $formInputs.emailEnabled.value}
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
