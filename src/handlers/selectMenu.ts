import {
  StringSelectMenuBuilder,
  ActionRowBuilder,
  type StringSelectMenuInteraction,
} from "discord.js";
import { db } from "../db";
import { partyMembers } from "../db/schema";
import { JOBS, JOB_ROLES, type Job } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { upsertUser, getPartyWithDetails } from "../db/helpers";
import { refreshAllPartyMessages } from "../utils/board";

export async function handleSelectMenu(interaction: StringSelectMenuInteraction) {
  const [action, param] = interaction.customId.split(":");

  if (action === "join_job_select") {
    await handleJoinJobSelect(interaction, parseInt(param));
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

  if (alreadyMember) {
    await interaction.editReply({ content: "You're already in this party!", components: [] });
    return;
  }

  if (partyData.members.length >= partyData.content.requiredPlayers) {
    await interaction.editReply({ content: "This party is now full.", components: [] });
    return;
  }

  await db.insert(partyMembers).values({ partyId, userId: user.id, job });

  const updatedData = await getPartyWithDetails(partyId);
  if (updatedData) {
    await refreshAllPartyMessages(updatedData, interaction.client);
  }

  await interaction.editReply({
    content: `✅ Joined Party #${partyId} as **${job}**!`,
    components: [],
  });
}
