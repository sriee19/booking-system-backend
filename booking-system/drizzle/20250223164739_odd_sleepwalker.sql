CREATE TABLE `bookings` (
	`sno` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uid` text NOT NULL,
	`userid` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`calendar_date` text NOT NULL,
	`fileurl` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`payment_status` text DEFAULT 'unpaid' NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_uid_unique` ON `bookings` (`uid`);--> statement-breakpoint
CREATE TABLE `users` (
	`sno` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`name` text,
	`email` text NOT NULL,
	`phoneno` text,
	`password` text NOT NULL,
	`status` integer DEFAULT true NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_uuid_unique` ON `users` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);