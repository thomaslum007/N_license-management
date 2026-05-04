CREATE TABLE `monitored_systems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`url` varchar(2048) NOT NULL,
	`status` enum('online','down','unknown') NOT NULL DEFAULT 'unknown',
	`lastCheckedAt` timestamp,
	`lastResponseTime` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monitored_systems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ping_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`systemId` int NOT NULL,
	`responseTime` int NOT NULL,
	`status` enum('online','down') NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ping_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `monitored_systems` ADD CONSTRAINT `monitored_systems_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ping_history` ADD CONSTRAINT `ping_history_systemId_monitored_systems_id_fk` FOREIGN KEY (`systemId`) REFERENCES `monitored_systems`(`id`) ON DELETE cascade ON UPDATE no action;