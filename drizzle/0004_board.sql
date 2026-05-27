CREATE TABLE "guild_settings" (
  "id" serial PRIMARY KEY,
  "guild_id" text NOT NULL UNIQUE,
  "board_channel_id" text
);

ALTER TABLE "parties" ADD COLUMN "board_message_id" text;
