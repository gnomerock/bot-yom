-- Drop old tables no longer used (Better Auth + old raid tables)
DROP TABLE IF EXISTS "account";
--> statement-breakpoint
DROP TABLE IF EXISTS "session";
--> statement-breakpoint
DROP TABLE IF EXISTS "user";
--> statement-breakpoint
DROP TABLE IF EXISTS "verification";
--> statement-breakpoint
DROP TABLE IF EXISTS "raid_participants";
--> statement-breakpoint
DROP TABLE IF EXISTS "raids";
--> statement-breakpoint

-- New party-finder tables
CREATE TABLE IF NOT EXISTS "content" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"required_players" integer DEFAULT 8 NOT NULL,
	"description" text,
	"points_on_clear" integer DEFAULT 100 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "parties" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_id" integer NOT NULL,
	"leader_id" integer NOT NULL,
	"guild_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"message_id" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "party_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"party_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"job" text NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parties" ADD CONSTRAINT "parties_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parties" ADD CONSTRAINT "parties_leader_id_users_id_fk" FOREIGN KEY ("leader_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "party_members" ADD CONSTRAINT "party_members_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "party_members" ADD CONSTRAINT "party_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
