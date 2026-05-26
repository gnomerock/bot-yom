import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  bigint,
} from "drizzle-orm/pg-core";

export const JOBS = [
  // Tanks
  "Paladin", "Warrior", "Dark Knight", "Gunbreaker",
  // Healers
  "White Mage", "Scholar", "Astrologian", "Sage",
  // Melee DPS
  "Monk", "Dragoon", "Ninja", "Samurai", "Reaper", "Viper",
  // Physical Ranged DPS
  "Bard", "Machinist", "Dancer",
  // Magical Ranged DPS
  "Black Mage", "Summoner", "Red Mage", "Pictomancer",
  // Limited
  "Blue Mage",
] as const;
export type Job = (typeof JOBS)[number];

export const JOB_ROLES: Record<Job, string> = {
  Paladin: "Tank", Warrior: "Tank", "Dark Knight": "Tank", Gunbreaker: "Tank",
  "White Mage": "Healer", Scholar: "Healer", Astrologian: "Healer", Sage: "Healer",
  Monk: "Melee DPS", Dragoon: "Melee DPS", Ninja: "Melee DPS", Samurai: "Melee DPS",
  Reaper: "Melee DPS", Viper: "Melee DPS",
  Bard: "Ranged DPS", Machinist: "Ranged DPS", Dancer: "Ranged DPS",
  "Black Mage": "Caster DPS", Summoner: "Caster DPS", "Red Mage": "Caster DPS",
  Pictomancer: "Caster DPS", "Blue Mage": "Limited",
};


export const CONTENT_TYPES = ["raid", "high-end"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const PARTY_STATUSES = ["open", "cleared", "disbanded"] as const;
export type PartyStatus = (typeof PARTY_STATUSES)[number];

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").notNull().unique(),
  username: text("username").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const content = pgTable("content", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").$type<ContentType>().notNull(),
  requiredPlayers: integer("required_players").notNull().default(8),
  description: text("description"),
  pointsOnClear: integer("points_on_clear").notNull().default(100),
});

export const parties = pgTable("parties", {
  id: serial("id").primaryKey(),
  contentId: integer("content_id").notNull().references(() => content.id),
  leaderId: integer("leader_id").notNull().references(() => users.id),
  guildId: text("guild_id").notNull(),
  channelId: text("channel_id").notNull(),
  messageId: text("message_id"),
  description: text("description"),
  status: text("status").$type<PartyStatus>().notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const partyMembers = pgTable("party_members", {
  id: serial("id").primaryKey(),
  partyId: integer("party_id").notNull().references(() => parties.id),
  userId: integer("user_id").notNull().references(() => users.id),
  job: text("job").$type<Job>().notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const leaderboard = pgTable("leaderboard", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  guildId: text("guild_id").notNull(),
  raidsCompleted: integer("raids_completed").default(0).notNull(),
  totalScore: bigint("total_score", { mode: "number" }).default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
