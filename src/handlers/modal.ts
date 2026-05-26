import {
  MessageFlags,
  type ModalSubmitInteraction,
} from "discord.js";
import { db } from "../db";
import { parties, partyMembers, content } from "../db/schema";
import { type Job } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { upsertUser, getPartyWithDetails } from "../db/helpers";
import { buildPartyEmbed, refreshPartyMessage } from "../utils/partyEmbed";
import { notifyPartyCreated } from "../utils/webhook";

export async function handleModal(interaction: ModalSubmitInteraction) {
  const parts = interaction.customId.split(":");
  const action = parts[0];

  if (action === "create_modal") {
    await handleCreateModal(interaction, parseInt(parts[1]), parts[2] as Job);
  } else if (action === "edit_modal") {
    await handleEditModal(interaction, parseInt(parts[1]));
  }
}

async function handleCreateModal(
  interaction: ModalSubmitInteraction,
  contentId: number,
  job: Job,
) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const description = interaction.fields.getTextInputValue("description").trim() || null;
  const guildId = interaction.guildId!;
  const channelId = interaction.channelId!;

  const user = await upsertUser(interaction.user.id, interaction.user.username);

  const [existing] = await db
    .select()
    .from(parties)
    .where(and(eq(parties.leaderId, user.id), eq(parties.status, "open")));

  if (existing) {
    await interaction.editReply(
      `You already have open party #${existing.id}. Use \`/done disband\` to close it first.`,
    );
    return;
  }

  const [selectedContent] = await db.select().from(content).where(eq(content.id, contentId));
  if (!selectedContent) {
    await interaction.editReply("Content not found.");
    return;
  }

  const [party] = await db
    .insert(parties)
    .values({ contentId, leaderId: user.id, guildId, channelId, status: "open", ...(description !== null && { description }) })
    .returning();

  await db.insert(partyMembers).values({ partyId: party.id, userId: user.id, job });

  await interaction.editReply(`✅ Party #${party.id} created! Posting announcement…`);

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

  await notifyPartyCreated(partyData);
}

async function handleEditModal(interaction: ModalSubmitInteraction, partyId: number) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const description = interaction.fields.getTextInputValue("description").trim() || null;
  const user = await upsertUser(interaction.user.id, interaction.user.username);

  const [row] = await db
    .select()
    .from(parties)
    .where(and(eq(parties.id, partyId), eq(parties.leaderId, user.id), eq(parties.status, "open")));

  if (!row) {
    await interaction.editReply("Party not found or you're not the leader of an open party.");
    return;
  }

  await db
    .update(parties)
    .set({ description, updatedAt: new Date() })
    .where(eq(parties.id, partyId));

  const updated = await getPartyWithDetails(partyId);
  if (updated) {
    await refreshPartyMessage(updated, interaction.client);
  }

  await interaction.editReply(`✅ Party #${partyId} description updated.`);
}
