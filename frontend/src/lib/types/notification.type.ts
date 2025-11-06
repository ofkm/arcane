// Notification provider types
export type NotificationProvider =
	| 'apprise'
	| 'discord'
	| 'email'
	| 'slack'
	| 'teams'
	| 'telegram'
	| 'whatsapp'
	| 'signal'
	| 'pushbullet'
	| 'pushover'
	| 'prowl'
	| 'desktop'
	| 'webhook'
	| 'json'
	| 'xml'
	| 'rss'
	| 'matrix'
	| 'rocket'
	| 'mattermost'
	| 'zulip'
	| 'gmail'
	| 'outlook'
	| 'sendgrid'
	| 'mailgun'
	| 's3'
	| 'dropbox'
	| 'drive'
	| 'onedrive';

export type EmailTLSMode = 'none' | 'starttls' | 'ssl';

export type NotificationEventType = 'image_update' | 'container_update';

// Discord notification configuration
export interface DiscordConfig {
	webhookUrl: string;
	username?: string;
	avatarUrl?: string;
	events?: Record<NotificationEventType, boolean>;
}

// Email notification configuration
export interface EmailConfig {
	smtpHost: string;
	smtpPort: number;
	smtpUsername: string;
	smtpPassword: string;
	fromAddress: string;
	toAddresses: string[];
	tlsMode: EmailTLSMode;
	events?: Record<NotificationEventType, boolean>;
}

// Notification settings
export interface NotificationSettings {
	id: number;
	provider: NotificationProvider;
	enabled: boolean;
	config: DiscordConfig | EmailConfig | Record<string, any>;
	appriseUrls?: string[];
	label?: string;
	tags?: string[];
	validationStatus?: string;
	lastValidatedAt?: string;
	createdAt: string;
	updatedAt: string;
}

// Test notification response
export interface TestNotificationResponse {
	success: boolean;
	message: string;
	provider?: string;
	sentAt?: string;
}

// Generic notification configuration
export interface GenericNotificationConfig {
	[key: string]: any;
}

// Notification log entry
export interface NotificationLog {
	id: number;
	provider: NotificationProvider;
	imageRef: string;
	status: string;
	error?: string;
	metadata: Record<string, any>;
	sentAt: string;
	createdAt: string;
	updatedAt: string;
}

// Event configuration
export interface EventConfig {
	image_update: boolean;
	container_update: boolean;
}

// Provider configuration interfaces for Apprise
export interface AppriseProviderConfig {
	name: string;
	urls?: string[];
	label?: string;
	enabled: boolean;
	config?: Record<string, any>;
	events?: EventConfig;
	priority?: string;
	format?: string;
	tags?: string[];
}

// Provider validation result
export interface ProviderValidationResult {
	provider: NotificationProvider;
	valid: boolean;
	message?: string;
	errors: string[];
	warnings: string[];
}

// Notification message structure
export interface NotificationMessage {
	title: string;
	body: string;
	format?: string;
	tags?: string[];
	priority?: string;
	metadata?: Record<string, string>;
}

// Batch notification configuration
export interface BatchNotificationConfig {
	message: NotificationMessage;
	providerConfigs: Record<NotificationProvider, Record<string, any>>;
}

// Provider metadata for UI
export interface ProviderMetadata {
	id: number;
	name: string;
	displayName: string;
	category: string;
	description: string;
	authTypes: string[];
	enabled: boolean;
}

// Parameter definition for provider configuration
export interface ParamDef {
	name: string;
	displayName: string;
	type: string;
	required: boolean;
	description: string;
	example?: string;
	placeholder?: string;
	validation?: string;
}

// Apprise URL configuration
export interface AppriseURL {
	url: string;
	label?: string;
	tags?: string[];
	isValid: boolean;
	validatedAt?: string;
	provider?: string;
}
