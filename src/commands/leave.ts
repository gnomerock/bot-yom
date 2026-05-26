import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { Command } from "../types";
import { db } from "../db";
import { parties, partyMembers } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { upsertUser, getPartyWithDetails } from "../db/helpers";
import { refreshPartyMessage } from "../utils/partyEmbed";

export default {
  data: new SlashCommandBuilder()
    .setName("leave")
    .setDescription("Leave a party you've joined")
    .addIntegerOption((opt) =>
      opt
        .setName("party_id")
        .setDescription("ID of the party to leave")
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const partyId = interaction.options.getInteger("party_id", true);
    const user = await upsertUser(interaction.user.id, interaction.user.username);

    const partyData = await getPartyWithDetails(partyId);

    if (!partyData) {
      await interaction.editReply(`Party #${partyId} not found.`);
      return;
    }

    if (partyData.party.status !== "open") {
      await interaction.editReply(`Party #${partyId} is no longer open.`);
      return;
    }

    if (partyData.party.leaderId === user.id) {
      await interaction.editReply(
        "You're the party leader. Use `/done disband` to close the party instead.",
      );
      return;
    }

    const [membership] = await db
      .select()
      .from(partyMembers)
      .where(and(eq(partyMembers.partyId, partyId), eq(partyMembers.userId, user.id)));

    if (!membership) {
      await interaction.editReply(`You're not a member of Party #${partyId}.`);
      return;
    }

    await db.delete(partyMembers).where(eq(partyMembers.id, membership.id));

    const updated = await getPartyWithDetails(partyId);
    if (updated) {
      await refreshPartyMessage(updated, interaction.client);
    }

    await interaction.editReply(`Left Party #${partyId}.`);
  },
} satisfies Command;
