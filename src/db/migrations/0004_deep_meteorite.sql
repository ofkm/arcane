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