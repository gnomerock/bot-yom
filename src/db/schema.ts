import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  bigint,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").notNull().unique(),
  username: text("username").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const raids = pgTable("raids", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  guildId: text("guild_id").notNull(),
  createdBy: text("created_by").notNull(),
  scheduledAt: timestamp("scheduled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const raidParticipants = pgTable("raid_participants", {
  id: serial("id").primaryKey(),
  raidId: integer("raid_id")
    .notNull()
    .references(() => raids.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  role: text("role"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const leaderboard = pgTable("leaderboard", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  guildId: text("guild_id").notNull(),
  raidsCompleted: integer("raids_completed").default(0).notNull(),
  totalScore: bigint("total_score", { mode: "number" }).default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
