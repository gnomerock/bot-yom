import { db } from ".";
import { users, parties, partyMembers, leaderboard, content } from "./schema";
import { eq, and } from "drizzle-orm";

export async function upsertUser(discordId: string, username: string) {
  const [existing] = await db.select().from(users).where(eq(users.discordId, discordId));
  if (existing) return existing;
  const [created] = await db.insert(users).values({ discordId, username }).returning();
  return created;
}

export async function getPartyWithDetails(partyId: number) {
  const [row] = await db
    .select({ party: parties, content })
    .from(parties)
    .innerJoin(content, eq(parties.contentId, content.id))
    .where(eq(parties.id, partyId));

  if (!row) return null;

  const members = await db
    .select({ user: users, member: partyMembers })
    .from(partyMembers)
    .innerJoin(users, eq(partyMembers.userId, users.id))
    .where(eq(partyMembers.partyId, partyId));

  const [leader] = await db.select().from(users).where(eq(users.id, row.party.leaderId));

  return { ...row, members, leaderName: leader?.username ?? "Unknown" };
}

export async function awardPoints(userId: number, guildId: string, points: number) {
  const [existing] = await db
    .select()
    .from(leaderboard)
    .where(and(eq(leaderboard.userId, userId), eq(leaderboard.guildId, guildId)));

  if (existing) {
    await db.update(leaderboard).set({
      raidsCompleted: existing.raidsCompleted + 1,
      totalScore: existing.totalScore + points,
      updatedAt: new Date(),
    }).where(eq(leaderboard.id, existing.id));
  } else {
    await db.insert(leaderboard).values({ userId, guildId, raidsCompleted: 1, totalScore: points });
  }
}
