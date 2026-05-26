CREATE TABLE "leaderboard" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"guild_id" text NOT NULL,
	"raids_completed" integer DEFAULT 0 NOT NULL,
	"total_score" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raid_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"raid_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raids" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"guild_id" text NOT NULL,
	"created_by" text NOT NULL,
	"scheduled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"discord_id" text NOT NULL,
	"username" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_discord_id_unique" UNIQUE("discord_id")
);
--> statement-breakpoint
ALTER TABLE "leaderboard" ADD CONSTRAINT "leaderboard_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raid_participants" ADD CONSTRAINT "raid_participants_raid_id_raids_id_fk" FOREIGN KEY ("raid_id") REFERENCES "public"."raids"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raid_participants" ADD CONSTRAINT "raid_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;