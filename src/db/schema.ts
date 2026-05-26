import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  bigint,
  boolean,
} from "drizzle-orm/pg-core";

// ── existing game tables ──────────────────────────────────────────────────────

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

// ── better-auth tables ────────────────────────────────────────────────────────

export const authUser = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$default(() => false)
    .notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").$default(() => new Date()).notNull(),
  updatedAt: timestamp("updated_at").$default(() => new Date()).notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").$default(() => new Date()).notNull(),
  updatedAt: timestamp("updated_at").$default(() => new Date()).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").$default(() => new Date()).notNull(),
  updatedAt: timestamp("updated_at").$default(() => new Date()).notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
