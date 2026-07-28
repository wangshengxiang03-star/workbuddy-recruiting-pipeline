CREATE TABLE `resume_files` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`original_name` text NOT NULL,
	`storage_key` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`target_role` text,
	`status` text DEFAULT '已入库' NOT NULL,
	`score` integer,
	`result` text,
	`uploaded_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `resume_files_storage_key_unique` ON `resume_files` (`storage_key`);