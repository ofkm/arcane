CREATE TABLE `image_maturity_table` (
	`id` text PRIMARY KEY NOT NULL,
	`repository` text NOT NULL,
	`tag` text NOT NULL,
	`current_version` text NOT NULL,
	`latest_version` text,
	`status` text DEFAULT 'Unknown' NOT NULL,
	`updates_available` integer DEFAULT false NOT NULL,
	`current_image_date` integer,
	`latest_image_date` integer,
	`days_since_creation` integer,
	`registry_domain` text,
	`is_private_registry` integer DEFAULT false NOT NULL,
	`last_checked` integer NOT NULL,
	`check_count` integer DEFAULT 1 NOT NULL,
	`last_error` text,
	`response_time_ms` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_image_maturity_repository` ON `image_maturity_table` (`repository`);--> statement-breakpoint
CREATE INDEX `idx_image_maturity_status` ON `image_maturity_table` (`status`);--> statement-breakpoint
CREATE INDEX `idx_image_maturity_updates` ON `image_maturity_table` (`updates_available`);--> statement-breakpoint
CREATE INDEX `idx_image_maturity_last_checked` ON `image_maturity_table` (`last_checked`);--> statement-breakpoint
CREATE INDEX `idx_image_maturity_repo_tag` ON `image_maturity_table` (`repository`,`tag`);--> statement-breakpoint
CREATE INDEX `idx_image_maturity_status_updates` ON `image_maturity_table` (`status`,`updates_available`);--> statement-breakpoint
CREATE INDEX `idx_image_maturity_registry` ON `image_maturity_table` (`registry_domain`);--> statement-breakpoint
CREATE INDEX `idx_image_maturity_check_count` ON `image_maturity_table` (`check_count`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users_table` (
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
INSERT INTO `__new_users_table`("id", "username", "password_hash", "display_name", "email", "roles", "require_password_change", "oidc_subject_id", "last_login", "created_at", "updated_at") SELECT "id", "username", "password_hash", "display_name", "email", "roles", "require_password_change", "oidc_subject_id", "last_login", "created_at", "updated_at" FROM `users_table`;--> statement-breakpoint
DROP TABLE `users_table`;--> statement-breakpoint
ALTER TABLE `__new_users_table` RENAME TO `users_table`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_table_username_unique` ON `users_table` (`username`);