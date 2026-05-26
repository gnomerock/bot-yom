import {
  StringSelectMenuBuilder,
  ActionRowBuilder,
  type StringSelectMenuInteraction,
} from "discord.js";
import { db } from "../db";
import { content, parties, partyMembers } from "../db/schema";
import { JOBS, JOB_ROLES, type Job } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { upsertUser, getPartyWithDetails } from "../db/helpers";
import { buildPartyEmbed, refreshPartyMessage } from "../utils/partyEmbed";

export async function handleSelectMenu(interaction: StringSelectMenuInteraction) {
  const [action, param] = interaction.customId.split(":");

  if (action === "create_content_select") {
    await handleCreateContentSelect(interaction);
  } else if (action === "create_job_select") {
    await handleCreateJobSelect(interaction, parseInt(param));
  } else if (action === "join_job_select") {
    await handleJoinJobSelect(interaction, parseInt(param));
  }
}

async function handleCreateContentSelect(interaction: StringSelectMenuInteraction) {
  // No DB work — fast enough to update directly
  const contentId = parseInt(interaction.values[0]);

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`create_job_select:${contentId}`)
    .setPlaceholder("Select your job...")
    .addOptions(JOBS.map((job) => ({ label: job, description: JOB_ROLES[job], value: job })));

  await interaction.update({
    content: "**Step 2 / 2** — Select your job:",
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
  });
}

async function handleCreateJobSelect(
  interaction: StringSelectMenuInteraction,
  contentId: number,
) {
  await interaction.deferUpdate();

  const job = interaction.values[0] as Job;
  const guildId = interaction.guildId!;
  const channelId = interaction.channelId;

  const user = await upsertUser(interaction.user.id, interaction.user.username);

  const [existing] = await db
    .select()
    .from(parties)
    .where(and(eq(parties.leaderId, user.id), eq(parties.status, "open"), eq(parties.guildId, guildId)));

  if (existing) {
    await interaction.editReply({
      content: `You already have open party #${existing.id}. Use \`/done disband\` to close it first.`,
      components: [],
    });
    return;
  }

  const [selectedContent] = await db.select().from(content).where(eq(content.id, contentId));
  if (!selectedContent) {
    await interaction.editReply({ content: "Content not found.", components: [] });
    return;
  }

  const [party] = await db
    .insert(parties)
    .values({ contentId, leaderId: user.id, guildId, channelId, status: "open" })
    .returning();

  await db.insert(partyMembers).values({ partyId: party.id, userId: user.id, job });

  await interaction.editReply({
    content: `✅ Party #${party.id} created! Posting announcement…`,
    components: [],
  });

  // Post public party announcement
  const partyData = await getPartyWithDetails(party.id);
  if (!partyData) return;

  const { embed, row, attachment } = buildPartyEmbed(partyData);
  const channel = interaction.channel;
  if (channel && !channel.isDMBased() && channel.isTextBased()) {
    const msg = await channel.send({
      embeds: [embed],
      files: [attachment],
      components: row ? [row] : [],
    });
    await db.update(parties).set({ messageId: msg.id }).where(eq(parties.id, party.id));
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
    await refreshPartyMessage(updatedData, interaction.client);
  }

  await interaction.editReply({
    content: `✅ Joined Party #${partyId} as **${job}**!`,
    components: [],
  });
}
