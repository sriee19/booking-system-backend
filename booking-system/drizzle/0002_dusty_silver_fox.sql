PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`date` text NOT NULL,
	`meet_link` text,
	`status` text DEFAULT 'pending',
	`created_at` integer DEFAULT 1740140485907
);
--> statement-breakpoint
INSERT INTO `__new_bookings`("id", "user_id", "name", "email", "date", "meet_link", "status", "created_at") SELECT "id", "user_id", "name", "email", "date", "meet_link", "status", "created_at" FROM `bookings`;--> statement-breakpoint
DROP TABLE `bookings`;--> statement-breakpoint
ALTER TABLE `__new_bookings` RENAME TO `bookings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`created_at` integer DEFAULT 1740140485907
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "password_hash", "role", "created_at") SELECT "id", "email", "password_hash", "role", "created_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);