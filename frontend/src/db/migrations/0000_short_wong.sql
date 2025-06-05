CREATE TABLE `settings_table` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dockerHost` text NOT NULL,
	`stacksDirectory` text NOT NULL,
	`autoUpdate` integer DEFAULT false NOT NULL,
	`autoUpdateInterval` integer DEFAULT 300 NOT NULL,
	`pollingEnabled` integer DEFAULT true NOT NULL,
	`pollingInterval` integer DEFAULT 5 NOT NULL,
	`pruneMode` text,
	`registryCredentials` text DEFAULT '[]' NOT NULL,
	`templateRegistries` text DEFAULT '[]' NOT NULL,
	`auth` text NOT NULL,
	`onboarding` text,
	`baseServerUrl` text,
	`maturityThresholdDays` integer DEFAULT 30 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
