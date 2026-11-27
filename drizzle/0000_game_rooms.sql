CREATE TABLE `game_rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`members` text NOT NULL,
	`game` text
);
