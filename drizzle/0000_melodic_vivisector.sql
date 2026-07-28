CREATE TABLE `activity_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`candidate_id` text,
	`action` text NOT NULL,
	`actor_email` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`initials` text NOT NULL,
	`role` text NOT NULL,
	`score` integer NOT NULL,
	`status` text NOT NULL,
	`tone` text NOT NULL,
	`school` text NOT NULL,
	`company` text NOT NULL,
	`experience` text NOT NULL,
	`channel` text NOT NULL,
	`highlights` text NOT NULL,
	`risk` text NOT NULL,
	`owner_email` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`department` text NOT NULL,
	`version` integer NOT NULL,
	`owner` text NOT NULL,
	`headcount` integer NOT NULL,
	`filled_headcount` integer DEFAULT 0 NOT NULL,
	`gates` text NOT NULL,
	`weights` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
