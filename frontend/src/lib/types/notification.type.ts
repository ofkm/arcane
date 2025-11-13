export type NotificationProvider = 'discord' | 'email';
export type EmailTLSMode = 'none' | 'starttls' | 'ssl';

export interface DiscordConfig {
	webhookUrl: string;
	username: string;
	avatarUrl: string;
}

export interface EmailConfig {
	smtpHost: string;
	smtpPort: number;
	smtpUsername: string;
	smtpPassword: string;
	fromAddress: string;
	toAddresses: string[];
	tlsMode: EmailTLSMode;
}

export type NotificationConfig = DiscordConfig | EmailConfig;

export interface NotificationSettings {
	provider: NotificationProvider;
	enabled: boolean;
	config?: Record<string, any>;
}

export interface AppriseSettings {
	id?: number;
	apiUrl: string;
	enabled: boolean;
	imageUpdateTag: string;
	containerUpdateTag: string;
}

export interface TestNotificationResponse {
	success: boolean;
	message?: string;
	error?: string;
}
