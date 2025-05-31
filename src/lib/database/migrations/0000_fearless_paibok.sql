CREATE TABLE `agent_connections` (
	`id` integer PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`connection_type` text NOT NULL,
	`endpoint` text NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	`last_ping` text,
	`latency` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `agent_metrics` (
	`id` integer PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`cpu_usage` real,
	`memory_usage` real,
	`disk_usage` real,
	`network_rx` integer,
	`network_tx` integer,
	`containers_running` integer,
	`containers_total` integer,
	`images_total` integer,
	`volumes_total` integer,
	`networks_total` integer,
	`timestamp` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `agent_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`priority` integer DEFAULT 5 NOT NULL,
	`payload` text,
	`result` text,
	`error` text,
	`progress` integer DEFAULT 0,
	`started_at` text,
	`completed_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`hostname` text NOT NULL,
	`docker_host` text NOT NULL,
	`status` text DEFAULT 'unknown' NOT NULL,
	`last_seen` text,
	`version` text,
	`platform` text,
	`architecture` text,
	`registered_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `deployment_history` (
	`id` integer PRIMARY KEY NOT NULL,
	`deployment_id` text NOT NULL,
	`action` text NOT NULL,
	`previous_status` text NOT NULL,
	`new_status` text NOT NULL,
	`changes` text,
	`performed_by` text,
	`timestamp` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`deployment_id`) REFERENCES `deployments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `deployment_logs` (
	`id` integer PRIMARY KEY NOT NULL,
	`deployment_id` text NOT NULL,
	`level` text DEFAULT 'info' NOT NULL,
	`message` text NOT NULL,
	`source` text,
	`timestamp` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`deployment_id`) REFERENCES `deployments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `deployments` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`agent_id` text NOT NULL,
	`stack_name` text NOT NULL,
	`stack_path` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`deployment_type` text DEFAULT 'compose' NOT NULL,
	`compose_content` text,
	`environment` text,
	`networks` text,
	`volumes` text,
	`services` text,
	`error` text,
	`deployed_at` text,
	`removed_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `auth_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`settings_id` integer NOT NULL,
	`local_auth_enabled` integer DEFAULT true NOT NULL,
	`oidc_enabled` integer DEFAULT false NOT NULL,
	`session_timeout` integer DEFAULT 60 NOT NULL,
	`password_policy` text DEFAULT 'strong' NOT NULL,
	`rbac_enabled` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`settings_id`) REFERENCES `settings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `oidc_config` (
	`id` integer PRIMARY KEY NOT NULL,
	`auth_settings_id` integer NOT NULL,
	`client_id` text NOT NULL,
	`client_secret` blob NOT NULL,
	`redirect_uri` text NOT NULL,
	`authorization_endpoint` text NOT NULL,
	`token_endpoint` text NOT NULL,
	`userinfo_endpoint` text NOT NULL,
	`scopes` text DEFAULT 'openid email profile' NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`auth_settings_id`) REFERENCES `auth_settings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `registry_credentials` (
	`id` integer PRIMARY KEY NOT NULL,
	`settings_id` integer NOT NULL,
	`registry_url` text NOT NULL,
	`username` text NOT NULL,
	`password` blob NOT NULL,
	`email` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`settings_id`) REFERENCES `settings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`docker_host` text NOT NULL,
	`auto_update` integer DEFAULT false NOT NULL,
	`auto_update_interval` integer DEFAULT 5 NOT NULL,
	`polling_enabled` integer DEFAULT true NOT NULL,
	`polling_interval` integer DEFAULT 10 NOT NULL,
	`prune_mode` text DEFAULT 'all' NOT NULL,
	`stacks_directory` text NOT NULL,
	`maturity_threshold_days` integer DEFAULT 30 NOT NULL,
	`base_server_url` text,
	`onboarding` integer,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `stack_services` (
	`id` integer PRIMARY KEY NOT NULL,
	`stack_id` text NOT NULL,
	`service_name` text NOT NULL,
	`image` text NOT NULL,
	`ports` text,
	`environment` text,
	`volumes` text,
	`networks` text,
	`depends_on` text,
	`restart` text DEFAULT 'unless-stopped',
	`healthcheck` text,
	`labels` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`stack_id`) REFERENCES `stacks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `stack_variables` (
	`id` integer PRIMARY KEY NOT NULL,
	`stack_id` text NOT NULL,
	`name` text NOT NULL,
	`value` text,
	`default_value` text,
	`description` text,
	`type` text DEFAULT 'string' NOT NULL,
	`required` integer DEFAULT false NOT NULL,
	`options` text,
	`validation` text,
	`is_secret` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`stack_id`) REFERENCES `stacks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `stacks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`path` text NOT NULL,
	`compose_file` text DEFAULT 'docker-compose.yml' NOT NULL,
	`env_file` text,
	`category` text,
	`tags` text,
	`is_template` integer DEFAULT false NOT NULL,
	`template_source` text,
	`version` text,
	`author` text,
	`license` text,
	`documentation` text,
	`requirements` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stacks_name_unique` ON `stacks` (`name`);--> statement-breakpoint
CREATE TABLE `template_registries` (
	`id` integer PRIMARY KEY NOT NULL,
	`settings_id` integer NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`description` text,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`settings_id`) REFERENCES `settings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` text NOT NULL,
	`user_agent` text,
	`ip_address` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_sessions_token_unique` ON `user_sessions` (`token`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` blob,
	`role` text DEFAULT 'user' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`last_login` text,
	`oidc_subject` text,
	`oidc_provider` text,
	`oidc_email` text,
	`oidc_name` text,
	`oidc_picture` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);