CREATE TABLE `stacks_table` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`dir_name` text,
	`path` text NOT NULL,
	`auto_update` integer DEFAULT false NOT NULL,
	`is_external` integer DEFAULT false NOT NULL,
	`is_legacy` integer DEFAULT false NOT NULL,
	`is_remote` integer DEFAULT false NOT NULL,
	`agent_id` text,
	`agent_hostname` text,
	`status` text DEFAULT 'unknown' NOT NULL,
	`service_count` integer DEFAULT 0 NOT NULL,
	`running_count` integer DEFAULT 0 NOT NULL,
	`compose_content` text,
	`env_content` text,
	`last_polled` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stacks_table_name_unique` ON `stacks_table` (`name`);--> statement-breakpoint
CREATE TABLE `users_table` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text,
	`display_name` text,
	`email` text,
	`roles` text DEFAULT '[]' NOT NULL,
	`require_password_change` integer DEFAULT false NOT NULL,
	`oidc_subject_id` text,
	`last_login` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_table_username_unique` ON `users_table` (`username`);