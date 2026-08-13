import {
  type StringSelectMenuInteraction,
} from "discord.js";
import { db } from "../db";
import { partyMembers, FLEX_ROLE } from "../db/schema";
import { type Job } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { upsertUser, getPartyWithDetails } from "../db/helpers";
import { refreshAllPartyMessages } from "../utils/board";

export async function handleSelectMenu(interaction: StringSelectMenuInteraction) {
  const parts = interaction.customId.split(":");
  const action = parts[0];

  if (action === "join_role_job") {
    await handleJoinJobSelect(interaction, parseInt(parts[1]));
  }
}

async function handleJoinJobSelect(
  interaction: StringSelectMenuInteraction,
  partyId: number,
) {
  await interaction.deferUpdate();

  const job = interaction.values[0] as Job;
  const user = await upsertUser(interaction.user.id, interaction.user.username);

  const partyData = await getPartyWithDetails(partyId);
  if (!partyData || partyData.party.status !== "open") {
    await interaction.editReply({ content: "This party is no longer open.", components: [] });
    return;
  }

  const [alreadyMember] = await db
    .select()
    .from(partyMembers)
    .where(and(eq(partyMembers.partyId, partyId), eq(partyMembers.userId, user.id)));

  // Roster slots exclude Flex sign-ups — they don't hold a slot
  const rosterCount = partyData.members.filter((m) => m.member.job !== FLEX_ROLE).length;

  if (alreadyMember) {
    if (alreadyMember.job === job) {
      await interaction.editReply({ content: `You're already in this party as **${job}**.`, components: [] });
      return;
    }
    if (alreadyMember.job === FLEX_ROLE && rosterCount >= partyData.content.requiredPlayers) {
      await interaction.editReply({ content: "This party is now full.", components: [] });
      return;
    }
    await db
      .update(partyMembers)
      .set({ job })
      .where(eq(partyMembers.id, alreadyMember.id));
  } else {
    if (rosterCount >= partyData.content.requiredPlayers) {
      await interaction.editReply({ content: "This party is now full.", components: [] });
      return;
    }
    await db.insert(partyMembers).values({ partyId, userId: user.id, job });
  }

  const updatedData = await getPartyWithDetails(partyId);
  if (updatedData) {
    await refreshAllPartyMessages(updatedData, interaction.client);
  }

  await interaction.editReply({
    content: alreadyMember
      ? `✅ Changed job to **${job}**!`
      : `✅ Joined Party #${partyId} as **${job}**!`,
    components: [],
  });
}
