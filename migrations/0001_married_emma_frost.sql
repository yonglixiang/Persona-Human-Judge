CREATE TABLE `model_turns` (
	`request_id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`persona_id` text NOT NULL,
	`condition` text NOT NULL,
	`turn` integer NOT NULL,
	`user_text` text NOT NULL,
	`assistant_text` text DEFAULT '' NOT NULL,
	`status` text NOT NULL,
	`model` text NOT NULL,
	`reasoning` text NOT NULL,
	`prompt_version` text NOT NULL,
	`response_id` text,
	`usage` text,
	`error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `study_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_model_turn` ON `model_turns` (`session_id`,`persona_id`,`condition`,`turn`);