ALTER TABLE `candidates` ADD `phone` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `candidates` ADD `email` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `candidates` ADD `city` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `candidates` ADD `current_title` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `resume_files` ADD `extracted_text` text;--> statement-breakpoint
ALTER TABLE `resume_files` ADD `parsed_data` text;--> statement-breakpoint
ALTER TABLE `resume_files` ADD `candidate_id` text;--> statement-breakpoint
ALTER TABLE `resume_files` ADD `duplicate_of` text;--> statement-breakpoint
ALTER TABLE `resume_files` ADD `error_message` text;