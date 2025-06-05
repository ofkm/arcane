CREATE TABLE `agent_tasks_table` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`type` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`result` text,
	`error` text,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `agent_tokens_table` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`token` text NOT NULL,
	`name` text,
	`permissions` text DEFAULT '[]' NOT NULL,
	`last_used` integer,
	`expires_at` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_tokens_table_token_unique` ON `agent_tokens_table` (`token`);--> statement-breakpoint
CREATE TABLE `agents_table` (
	`id` text PRIMARY KEY NOT NULL,
	`hostname` text NOT NULL,
	`platform` text NOT NULL,
	`version` text NOT NULL,
	`capabilities` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'offline' NOT NULL,
	`last_seen` integer NOT NULL,
	`registered_at` integer NOT NULL,
	`container_count` integer,
	`image_count` integer,
	`stack_count` integer,
	`network_count` integer,
	`volume_count` integer,
	`docker_version` text,
	`docker_containers` integer,
	`docker_images` integer,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
