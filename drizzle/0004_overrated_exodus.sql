CREATE TABLE "guild_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"board_channel_id" text,
	CONSTRAINT "guild_settings_guild_id_unique" UNIQUE("guild_id")
);
--> statement-breakpoint
ALTER TABLE "parties" ADD COLUMN "board_message_id" text;