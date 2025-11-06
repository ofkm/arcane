<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover/index.js';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';
	import { z } from 'zod/v4';
	import { createForm } from '$lib/utils/form.utils';
	import SwitchWithLabel from '$lib/components/form/labeled-switch.svelte';
	import TextInputWithLabel from '$lib/components/form/text-input-with-label.svelte';
	import SelectWithLabel from '$lib/components/form/select-with-label.svelte';
	import { SettingsPageLayout } from '$lib/layouts/index.js';
	
	// Lucide Icons - correctly imported from specific paths
	import BellIcon from '@lucide/svelte/icons/bell';
	import SendIcon from '@lucide/svelte/icons/send';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import TestTubeIcon from '@lucide/svelte/icons/test-tube';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import XCircleIcon from '@lucide/svelte/icons/x-circle';
	import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import GridIcon from '@lucide/svelte/icons/grid';
	import ListIcon from '@lucide/svelte/icons/list';
	import HelpCircleIcon from '@lucide/svelte/icons/help-circle';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import CheckIcon from '@lucide/svelte/icons/check';
	
	import settingsStore from '$lib/stores/config-store';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { m } from '$lib/paraglide/messages';
	import { notificationService } from '$lib/services/notification-service';
	import { appriseService } from '$lib/services/apprise-service';
	import type {
		ProviderMetadataResponse,
		NotificationSettingsResponse,
		ProviderValidationResponse
	} from '$lib/types/apprise.type';
	import type { EmailTLSMode } from '$lib/types/notification.type';
	// Local type definition for SvelteKit PageData to work around import issues
	interface PageData {
		notificationSettings?: NotificationSettingsResponse[];
	}

	import { UseSettingsForm } from '$lib/hooks/use-settings-form.svelte';

	interface Props {
		data?: PageData; // Made optional since it's not used
	}
	let { data }: Props = $props();

	// Legacy Discord and Email notification settings
	let currentSettings = $state({
		discordEnabled: false,
		discordWebhookUrl: '',
		discordUsername: 'Arcane',
		discordAvatarUrl: '',
		discordEventImageUpdate: true,
		discordEventContainerUpdate: true,
		emailEnabled: false,
		emailSmtpHost: '',
		emailSmtpPort: 587,
		emailSmtpUsername: '',
		emailSmtpPassword: '',
		emailFromAddress: '',
		emailToAddresses: '',
		emailTlsMode: 'starttls' as EmailTLSMode,
		emailEventImageUpdate: true,
		emailEventContainerUpdate: true
	});

	// Simplified Apprise notification settings
	let appriseSettings = $state({
		enabled: false,
		appriseUrl: '',
		eventImageUpdate: true,
		eventContainerUpdate: true
	});

	// Track original apprise settings for change detection
	let originalAppriseSettings = $state({
		enabled: false,
		appriseUrl: '',
		eventImageUpdate: true,
		eventContainerUpdate: true
	});

	const appriseFormSchema = z
		.object({
			enabled: z.boolean(),
			appriseUrl: z.string().url().optional().or(z.literal('')),
			eventImageUpdate: z.boolean(),
			eventContainerUpdate: z.boolean()
		})
		.refine((formData: any) => {
			if (formData.enabled && !formData.appriseUrl?.trim()) {
				return false;
			}
			return true;
		}, {
			message: 'Apprise URL is required when Apprise notifications are enabled',
			path: ['appriseUrl']
		});

	let appriseForm = $derived(createForm<typeof appriseFormSchema>(appriseFormSchema, appriseSettings));
	let isTestingApprise = $state(false);
	let isTesting = $state(false);

	const formSchema = z
		.object({
			discordEnabled: z.boolean(),
			discordWebhookUrl: z.string(),
			discordUsername: z.string(),
			discordAvatarUrl: z.string(),
			discordEventImageUpdate: z.boolean(),
			discordEventContainerUpdate: z.boolean(),
			emailEnabled: z.boolean(),
			emailSmtpHost: z.string(),
			emailSmtpPort: z.number().int().min(1).max(65535),
			emailSmtpUsername: z.string(),
			emailSmtpPassword: z.string(),
			emailFromAddress: z.string().email(),
			emailToAddresses: z.string(),
			emailTlsMode: z.enum(['none', 'starttls', 'ssl']),
			emailEventImageUpdate: z.boolean(),
			emailEventContainerUpdate: z.boolean()
		})
		.refine((formData: any) => {
			// Enhanced validation for Discord and Email
			if (formData.discordEnabled && !formData.discordWebhookUrl?.trim()) {
				return false;
			}
			return true;
		}, {
			message: 'Webhook URL is required when Discord is enabled',
			path: ['discordWebhookUrl']
		})
		.refine((formData: any) => {
			if (!formData.emailEnabled) return true;
			if (!formData.emailSmtpHost?.trim()) return false;
			if (!formData.emailFromAddress?.trim()) return false;
			if (!formData.emailToAddresses?.trim()) return false;
			return true;
		}, {
			message: 'SMTP host, from address, and to addresses are required when email is enabled',
			path: ['emailSmtpHost']
		});

	let { inputs: formInputs, ...form } = $derived(createForm<typeof formSchema>(formSchema, currentSettings));
	const isReadOnly = $derived.by(() => $settingsStore.uiConfigDisabled);

	const settingsForm = new UseSettingsForm({
		hasChangesChecker: () =>
			$formInputs.discordEnabled?.value !== currentSettings.discordEnabled ||
			$formInputs.discordWebhookUrl?.value !== currentSettings.discordWebhookUrl ||
			$formInputs.discordUsername?.value !== currentSettings.discordUsername ||
			$formInputs.discordAvatarUrl?.value !== currentSettings.discordAvatarUrl ||
			$formInputs.discordEventImageUpdate?.value !== currentSettings.discordEventImageUpdate ||
			$formInputs.discordEventContainerUpdate?.value !== currentSettings.discordEventContainerUpdate ||
			$formInputs.emailEnabled?.value !== currentSettings.emailEnabled ||
			$formInputs.emailSmtpHost?.value !== currentSettings.emailSmtpHost ||
			$formInputs.emailSmtpPort?.value !== currentSettings.emailSmtpPort ||
			$formInputs.emailSmtpUsername?.value !== currentSettings.emailSmtpUsername ||
			$formInputs.emailSmtpPassword?.value !== currentSettings.emailSmtpPassword ||
			$formInputs.emailFromAddress?.value !== currentSettings.emailFromAddress ||
			$formInputs.emailToAddresses?.value !== currentSettings.emailToAddresses ||
			$formInputs.emailTlsMode?.value !== currentSettings.emailTlsMode ||
			$formInputs.emailEventImageUpdate?.value !== currentSettings.emailEventImageUpdate ||
			$formInputs.emailEventContainerUpdate?.value !== currentSettings.emailEventContainerUpdate ||
			appriseSettings.enabled !== originalAppriseSettings.enabled ||
			appriseSettings.appriseUrl !== originalAppriseSettings.appriseUrl ||
			appriseSettings.eventImageUpdate !== originalAppriseSettings.eventImageUpdate ||
			appriseSettings.eventContainerUpdate !== originalAppriseSettings.eventContainerUpdate
	});

	onMount(async () => {
		await loadSettings();
		settingsForm.registerFormActions(onSubmit, resetForm);
	});

	async function loadSettings(): Promise<void> {
		try {
			const notificationSettings = await notificationService.getSettings();
			
			// Initialize settings from loaded data
			const discordSetting = notificationSettings.find((s: NotificationSettingsResponse) => s.provider === 'discord');
			if (discordSetting) {
				currentSettings.discordEnabled = discordSetting.enabled;
				const discordConfig = discordSetting.config as any;
				currentSettings.discordWebhookUrl = discordConfig?.webhookUrl || '';
				currentSettings.discordUsername = discordConfig?.username || 'Arcane';
				currentSettings.discordAvatarUrl = discordConfig?.avatarUrl || '';
				currentSettings.discordEventImageUpdate = discordConfig?.events?.image_update ?? true;
				currentSettings.discordEventContainerUpdate = discordConfig?.events?.container_update ?? true;
			}

			const emailSetting = notificationSettings.find((s: NotificationSettingsResponse) => s.provider === 'email');
			if (emailSetting) {
				currentSettings.emailEnabled = emailSetting.enabled;
				const emailConfig = emailSetting.config as any;
				currentSettings.emailSmtpHost = emailConfig?.smtpHost || '';
				currentSettings.emailSmtpPort = emailConfig?.smtpPort || 587;
				currentSettings.emailSmtpUsername = emailConfig?.smtpUsername || '';
				currentSettings.emailSmtpPassword = emailConfig?.smtpPassword || '';
				currentSettings.emailFromAddress = emailConfig?.fromAddress || '';
				currentSettings.emailToAddresses = (emailConfig?.toAddresses || []).join(', ');
				currentSettings.emailTlsMode = emailConfig?.tlsMode || 'starttls';
				currentSettings.emailEventImageUpdate = emailConfig?.events?.image_update ?? true;
				currentSettings.emailEventContainerUpdate = emailConfig?.events?.container_update ?? true;
			}

			// Load Apprise settings
			const appriseSetting = notificationSettings.find((s: NotificationSettingsResponse) => s.provider === 'apprise');
			if (appriseSetting) {
				appriseSettings.enabled = appriseSetting.enabled;
				const config = appriseSetting.config as any;
				
				// Handle both new schema (separate apprise_urls column) and fallback schema (config field)
				let appriseUrl = '';
				if (appriseSetting.appriseUrls && appriseSetting.appriseUrls.length > 0) {
					// New schema - use separate apprise_urls column
					appriseUrl = appriseSetting.appriseUrls[0];
				} else if (config?.appriseUrls && config.appriseUrls.length > 0) {
					// Fallback schema - appriseUrls stored in config
					appriseUrl = config.appriseUrls[0];
				}
				
				appriseSettings.appriseUrl = appriseUrl;
				appriseSettings.eventImageUpdate = config?.events?.image_update ?? true;
				appriseSettings.eventContainerUpdate = config?.events?.container_update ?? true;
				
				// Update original settings for change detection
				originalAppriseSettings.enabled = appriseSetting.enabled;
				originalAppriseSettings.appriseUrl = appriseUrl;
				originalAppriseSettings.eventImageUpdate = config?.events?.image_update ?? true;
				originalAppriseSettings.eventContainerUpdate = config?.events?.container_update ?? true;
			}

			// Sync form inputs
			syncFormInputs();
		} catch (error) {
			console.error('Failed to load settings:', error);
			toast.error('Failed to load notification settings');
		}
	}

	function syncFormInputs(): void {
		if (!$formInputs) return;
		
		$formInputs.discordEnabled && ($formInputs.discordEnabled.value = currentSettings.discordEnabled);
		$formInputs.discordWebhookUrl && ($formInputs.discordWebhookUrl.value = currentSettings.discordWebhookUrl);
		$formInputs.discordUsername && ($formInputs.discordUsername.value = currentSettings.discordUsername);
		$formInputs.discordAvatarUrl && ($formInputs.discordAvatarUrl.value = currentSettings.discordAvatarUrl);
		$formInputs.discordEventImageUpdate && ($formInputs.discordEventImageUpdate.value = currentSettings.discordEventImageUpdate);
		$formInputs.discordEventContainerUpdate && ($formInputs.discordEventContainerUpdate.value = currentSettings.discordEventContainerUpdate);
		$formInputs.emailEnabled && ($formInputs.emailEnabled.value = currentSettings.emailEnabled);
		$formInputs.emailSmtpHost && ($formInputs.emailSmtpHost.value = currentSettings.emailSmtpHost);
		$formInputs.emailSmtpPort && ($formInputs.emailSmtpPort.value = currentSettings.emailSmtpPort);
		$formInputs.emailSmtpUsername && ($formInputs.emailSmtpUsername.value = currentSettings.emailSmtpUsername);
		$formInputs.emailSmtpPassword && ($formInputs.emailSmtpPassword.value = currentSettings.emailSmtpPassword);
		$formInputs.emailFromAddress && ($formInputs.emailFromAddress.value = currentSettings.emailFromAddress);
		$formInputs.emailToAddresses && ($formInputs.emailToAddresses.value = currentSettings.emailToAddresses);
		$formInputs.emailTlsMode && ($formInputs.emailTlsMode.value = currentSettings.emailTlsMode);
		$formInputs.emailEventImageUpdate && ($formInputs.emailEventImageUpdate.value = currentSettings.emailEventImageUpdate);
		$formInputs.emailEventContainerUpdate && ($formInputs.emailEventContainerUpdate.value = currentSettings.emailEventContainerUpdate);
	}

	async function onSubmit(): Promise<void> {
		settingsForm.setLoading(true);
		const errors: string[] = [];
		const successMessages: string[] = [];

		try {
			// Always try to save Apprise settings first (independent validation)
			try {
				await notificationService.updateSettings('apprise', {
					provider: 'apprise',
					enabled: appriseSettings.enabled,
					config: {
						appriseUrls: [appriseSettings.appriseUrl],
						events: {
							image_update: appriseSettings.eventImageUpdate,
							container_update: appriseSettings.eventContainerUpdate
						}
					}
				});
				// Update original settings after successful save
				originalAppriseSettings = { ...appriseSettings };
				successMessages.push('Apprise settings saved successfully');
			} catch (error: any) {
				const errorMsg = error?.response?.data?.error || error.message || 'Unknown error';
				errors.push(`Apprise: ${errorMsg}`);
			}

			// Now try to validate and save the main form (Discord/Email)
			const formData = form.validate();
			if (!formData) {
				// Main form has validation errors, but Apprise was still saved
				if (successMessages.length > 0) {
					toast.success(successMessages.join('. '));
					toast.error('Please check Discord/Email form for errors.');
				} else {
					toast.error('Please check the form for errors.');
				}
				return;
			}

			// Save Discord settings
			try {
				await notificationService.updateSettings('discord', {
					provider: 'discord',
					enabled: formData.discordEnabled,
					config: {
						webhookUrl: formData.discordWebhookUrl,
						username: formData.discordUsername,
						avatarUrl: formData.discordAvatarUrl,
						events: {
							image_update: formData.discordEventImageUpdate,
							container_update: formData.discordEventContainerUpdate
						}
					}
				});
				successMessages.push('Discord settings saved successfully');
			} catch (error: any) {
				const errorMsg = error?.response?.data?.error || error.message || 'Unknown error';
				errors.push(`Discord: ${errorMsg}`);
			}

			// Save Email settings
			try {
				const toAddressArray = formData.emailToAddresses
					.split(',')
					.map((addr: string) => addr.trim())
					.filter((addr: string) => addr.length > 0);

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
						tlsMode: formData.emailTlsMode,
						events: {
							image_update: formData.emailEventImageUpdate,
							container_update: formData.emailEventContainerUpdate
						}
					}
				});
				successMessages.push('Email settings saved successfully');
			} catch (error: any) {
				const errorMsg = error?.response?.data?.error || error.message || 'Unknown error';
				errors.push(`Email: ${errorMsg}`);
			}

			// Show results
			if (errors.length === 0) {
				currentSettings = formData;
				toast.success('All notification settings saved successfully');
			} else if (successMessages.length > 0) {
				// Some succeeded, some failed
				successMessages.forEach(msg => toast.success(msg));
				errors.forEach(err => toast.error(err));
				toast.error('Some settings could not be saved. Please check the form for errors.');
			} else {
				// All failed
				errors.forEach(err => toast.error(err));
				toast.error('Failed to save notification settings. Please try again.');
			}
		} catch (error) {
			console.error('Error saving notification settings:', error);
			toast.error('Failed to save notification settings. Please try again.');
		} finally {
			settingsForm.setLoading(false);
		}
	}

	function resetForm(): void {
		syncFormInputs();
		// Reset Apprise settings to original values
		appriseSettings.enabled = originalAppriseSettings.enabled;
		appriseSettings.appriseUrl = originalAppriseSettings.appriseUrl;
		appriseSettings.eventImageUpdate = originalAppriseSettings.eventImageUpdate;
		appriseSettings.eventContainerUpdate = originalAppriseSettings.eventContainerUpdate;
	}

	async function testNotification(provider: string, type: string = 'simple'): Promise<void> {
		isTesting = true;
		try {
			await notificationService.testNotification(provider, type);
			const typeLabel = type === 'image-update' ? 'Image Update' : 'Simple Test';
			toast.success(`${typeLabel} notification sent successfully to ${provider}`);
		} catch (error: any) {
			const errorMsg = error?.response?.data?.error || error.message || m.common_unknown();
			toast.error(`Failed to send test notification: ${errorMsg}`);
		} finally {
			isTesting = false;
		}
	}

	async function testAppriseNotification(): Promise<void> {
		isTestingApprise = true;
		try {
			// Test Apprise notification with proper configuration format
			await appriseService.testProvider('apprise', {
				appriseUrls: [appriseSettings.appriseUrl]
			});
			toast.success('Apprise test notification sent successfully');
		} catch (error: any) {
			const errorMsg = error?.message || 'Test failed';
			toast.error(`Apprise test failed: ${errorMsg}`);
		} finally {
			isTestingApprise = false;
		}
	}

	function validateAppriseUrl(url: string): boolean {
		if (!url.trim()) return true; // Empty URLs are allowed (optional)
		try {
			// Comprehensive validation for Apprise URLs
			// Support for all major Apprise providers with various formats
			const apprisePattern = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//;
			
			if (!apprisePattern.test(url)) {
				return false;
			}
			
			// Extract the protocol part
			const protocol = url.split('://')[0].toLowerCase();
			
			// Valid Apprise protocols (comprehensive list)
			const validProtocols = [
				'discord', 'slack', 'telegram', 'tgram', 'teams', 'mattermost',
				'rocketchat', 'zulip', 'matrix', 'gitter', 'rocket', 'chatwork',
				'email', 'smtp', 'gmail', 'outlook', 'sendgrid', 'mailgun', 'ses',
				'pushover', 'pushbullet', 'prowl', 'notica', 'slackbot',
				'slack', 'hipchat', 'push', 'join', 'twist', 'fluentd',
				'mattermost', 'msteams', 'xmpp', 'lyst', 'kik', 'twilio',
				'json', 'xml', 'webhook', 'rss', 'atom', 'techiespush',
				'lametric', 'joinme', 'flock', 'googlechat', 'discordgo',
				'http', 'https', 'syslog', 'tailwind', ' riot', 'web',
				'custom'
			];
			
			// Check if the protocol is valid (case-insensitive)
			return validProtocols.some(validProto =>
				protocol.toLowerCase().includes(validProto.toLowerCase()) ||
				validProto.toLowerCase().includes(protocol.toLowerCase())
			);
		} catch {
			return false;
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
			<div class="space-y-6">
				{#if isReadOnly}
					<Alert.Root variant="default">
						<Alert.Title>{m.notifications_read_only_title()}</Alert.Title>
						<Alert.Description>{m.notifications_read_only_description()}</Alert.Description>
					</Alert.Root>
				{/if}

				<!-- Legacy Discord and Email Configuration -->
				<Card.Root>
					<Card.Header icon={BellIcon}>
						<div class="flex flex-col space-y-1.5">
							<Card.Title>{m.notifications_title()}</Card.Title>
							<Card.Description>Configure Discord and Email notifications (Legacy)</Card.Description>
						</div>
					</Card.Header>
					<Card.Content class="space-y-4 px-3 py-4 sm:px-6">
						<!-- Discord Configuration -->
						<div class="space-y-4">
							<Card.Root class="border-dashed">
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
												autocomplete="off"
												helpText={m.notifications_discord_webhook_url_help()}
											/>
											{#if $formInputs.discordWebhookUrl.error}
												<p class="text-destructive -mt-2 text-sm">{$formInputs.discordWebhookUrl.error}</p>
											{/if}

											<TextInputWithLabel
												bind:value={$formInputs.discordUsername.value}
												disabled={isReadOnly}
												label={m.notifications_discord_username_label()}
												placeholder={m.notifications_discord_username_placeholder()}
												type="text"
												autocomplete="off"
												helpText={m.notifications_discord_username_help()}
											/>

											<TextInputWithLabel
												bind:value={$formInputs.discordAvatarUrl.value}
												disabled={isReadOnly}
												label={m.notifications_discord_avatar_url_label()}
												placeholder={m.notifications_discord_avatar_url_placeholder()}
												type="text"
												autocomplete="off"
												helpText={m.notifications_discord_avatar_url_help()}
											/>

											<div class="space-y-3 pt-2">
												<Label class="text-sm font-medium">{m.notifications_events_title()}</Label>
												<p class="text-muted-foreground text-xs">{m.notifications_events_description()}</p>
												<div class="space-y-2">
													<SwitchWithLabel
														id="discord-event-image-update"
														bind:checked={$formInputs.discordEventImageUpdate.value}
														disabled={isReadOnly}
														label={m.notifications_event_image_update_label()}
														description={m.notifications_event_image_update_description()}
													/>
													<SwitchWithLabel
														id="discord-event-container-update"
														bind:checked={$formInputs.discordEventContainerUpdate.value}
														disabled={isReadOnly}
														label={m.notifications_event_container_update_label()}
														description={m.notifications_event_container_update_description()}
													/>
												</div>
											</div>
										</div>
									{/if}
								</Card.Content>
								<Card.Footer class="flex gap-2 px-3 py-4 sm:px-6">
									{#if $formInputs.discordEnabled.value}
										<Button variant="outline" onclick={() => testNotification('discord')} disabled={isReadOnly || isTesting}>
											{#if isTesting}
												<Spinner class="mr-2 h-4 w-4" />
											{:else}
												<SendIcon class="mr-2 h-4 w-4" />
											{/if}
											{m.notifications_discord_test_button()}
										</Button>
									{/if}
								</Card.Footer>
							</Card.Root>

							<!-- Email Configuration -->
							<Card.Root class="border-dashed">
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
													autocomplete="off"
													helpText={m.notifications_email_smtp_host_help()}
												/>
												{#if $formInputs.emailSmtpHost.error}
													<p class="text-destructive col-span-2 -mt-2 text-sm">{$formInputs.emailSmtpHost.error}</p>
												{/if}

												<div class="space-y-2">
													<Label for="smtp-port">{m.notifications_email_smtp_port_label()}</Label>
													<Input
														id="smtp-port"
														type="number"
														bind:value={$formInputs.emailSmtpPort.value}
														disabled={isReadOnly}
														autocomplete="off"
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
													autocomplete="off"
													helpText={m.notifications_email_username_help()}
												/>

												<TextInputWithLabel
													bind:value={$formInputs.emailSmtpPassword.value}
													disabled={isReadOnly}
													label={m.notifications_email_password_label()}
													placeholder={m.notifications_email_password_placeholder()}
													type="password"
													autocomplete="new-password"
													helpText={m.notifications_email_password_help()}
												/>
											</div>

											<TextInputWithLabel
												bind:value={$formInputs.emailFromAddress.value}
												disabled={isReadOnly}
												label={m.notifications_email_from_address_label()}
												placeholder={m.notifications_email_from_address_placeholder()}
												type="email"
												autocomplete="off"
												helpText={m.notifications_email_from_address_help()}
											/>
											{#if $formInputs.emailFromAddress.error}
												<p class="text-destructive -mt-2 text-sm">{$formInputs.emailFromAddress.error}</p>
											{/if}

											<div class="space-y-2">
												<Label for="to-addresses">{m.notifications_email_to_addresses_label()}</Label>
												<Textarea
													id="to-addresses"
													bind:value={$formInputs.emailToAddresses.value}
													disabled={isReadOnly}
													autocomplete="off"
													placeholder={m.notifications_email_to_addresses_placeholder()}
													rows={2}
												/>
												{#if $formInputs.emailToAddresses.error}
													<p class="text-destructive text-sm">{$formInputs.emailToAddresses.error}</p>
												{:else}
													<p class="text-muted-foreground text-sm">{m.notifications_email_to_addresses_help()}</p>
												{/if}
											</div>

											<SelectWithLabel
												id="email-tls-mode"
												label="TLS Mode"
												bind:value={$formInputs.emailTlsMode.value}
												disabled={isReadOnly}
												placeholder="Select TLS mode"
												options={[
													{ value: 'none', label: 'None' },
													{ value: 'starttls', label: 'StartTLS' },
													{ value: 'ssl', label: 'SSL/TLS' }
												]}
												description="StartTLS (default) upgrades from plain connection. SSL/TLS uses encryption from start. None uses no encryption."
											/>

											<div class="space-y-3 pt-2">
												<Label class="text-sm font-medium">{m.notifications_events_title()}</Label>
												<p class="text-muted-foreground text-xs">{m.notifications_events_description()}</p>
												<div class="space-y-2">
													<SwitchWithLabel
														id="email-event-image-update"
														bind:checked={$formInputs.emailEventImageUpdate.value}
														disabled={isReadOnly}
														label={m.notifications_event_image_update_label()}
														description={m.notifications_event_image_update_description()}
													/>
													<SwitchWithLabel
														id="email-event-container-update"
														bind:checked={$formInputs.emailEventContainerUpdate.value}
														disabled={isReadOnly}
														label={m.notifications_event_container_update_label()}
														description={m.notifications_event_container_update_description()}
													/>
												</div>
											</div>
										</div>
									{/if}
								</Card.Content>
								<Card.Footer class="flex gap-2 px-3 py-4 sm:px-6">
									{#if $formInputs.emailEnabled.value}
										<DropdownMenu.Root>
											<DropdownMenu.Trigger>
												<Button variant="outline" disabled={isReadOnly || isTesting}>
													{#if isTesting}
														<Spinner class="mr-2 h-4 w-4" />
													{:else}
														<SendIcon class="mr-2 h-4 w-4" />
													{/if}
													{m.notifications_email_test_button()}
													<ChevronDownIcon class="ml-2 h-4 w-4" />
												</Button>
											</DropdownMenu.Trigger>
											<DropdownMenu.Content align="start">
												<DropdownMenu.Item onclick={() => testNotification('email', 'simple')}>
													<SendIcon class="mr-2 h-4 w-4" />
													Simple Test Email
												</DropdownMenu.Item>
												<DropdownMenu.Item onclick={() => testNotification('email', 'image-update')}>
													<SendIcon class="mr-2 h-4 w-4" />
													Image Update Email
												</DropdownMenu.Item>
											</DropdownMenu.Content>
										</DropdownMenu.Root>
									{/if}
								</Card.Footer>
							</Card.Root>
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Simplified Apprise Configuration -->
				<Card.Root>
					<Card.Header icon={BellIcon}>
						<div class="flex flex-col space-y-1.5">
							<Card.Title>Apprise Notifications</Card.Title>
							<Card.Description>Configure Apprise notifications for multiple providers with a single URL</Card.Description>
						</div>
					</Card.Header>
					<Card.Content class="space-y-4 px-3 py-4 sm:px-6">
						<SwitchWithLabel
							id="apprise-enabled"
							bind:checked={appriseSettings.enabled}
							disabled={isReadOnly}
							label="Enable Apprise Notifications"
							description="Enable notifications using Apprise URL format for multiple providers"
						/>

						{#if appriseSettings.enabled}
							<div class="space-y-4 border-l-2 pl-4">
								<TextInputWithLabel
									bind:value={appriseSettings.appriseUrl}
									disabled={isReadOnly}
									label="Apprise URL"
									placeholder="discord://webhook_id/webhook_token or mailto://user:password@smtp.example.com:587"
									type="text"
									autocomplete="off"
									helpText="Enter Apprise URL format. Supports Discord, Slack, Telegram, Email, and many other providers."
								/>
								{#if appriseSettings.appriseUrl && !validateAppriseUrl(appriseSettings.appriseUrl)}
									<p class="text-destructive -mt-2 text-sm">Invalid Apprise URL format</p>
								{/if}

								<div class="space-y-3 pt-2">
									<Label class="text-sm font-medium">Notification Events</Label>
									<p class="text-muted-foreground text-xs">Select which events trigger Apprise notifications</p>
									<div class="space-y-2">
										<SwitchWithLabel
											id="apprise-event-image-update"
											bind:checked={appriseSettings.eventImageUpdate}
											disabled={isReadOnly}
											label="Image Updates"
											description="Send notifications when container images are updated"
										/>
										<SwitchWithLabel
											id="apprise-event-container-update"
											bind:checked={appriseSettings.eventContainerUpdate}
											disabled={isReadOnly}
											label="Container Updates"
											description="Send notifications when containers are recreated or updated"
										/>
									</div>
								</div>
							</div>
						{/if}
					</Card.Content>
					<Card.Footer class="flex gap-2 px-3 py-4 sm:px-6">
						{#if appriseSettings.enabled}
							<Button variant="outline" onclick={testAppriseNotification} disabled={isReadOnly || isTestingApprise}>
								{#if isTestingApprise}
									<Spinner class="mr-2 h-4 w-4" />
								{:else}
									<TestTubeIcon class="mr-2 h-4 w-4" />
								{/if}
								Test Apprise Notification
							</Button>
						{/if}
					</Card.Footer>
				</Card.Root>
			</div>
		</fieldset>
	{/snippet}
</SettingsPageLayout>
