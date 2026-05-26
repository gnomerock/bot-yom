import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { Command } from "../types";
import { getPartyWithDetails } from "../db/helpers";
import { buildPartyEmbed, dutyIconAttachment } from "../utils/partyEmbed";

export default {
  data: new SlashCommandBuilder()
    .setName("view")
    .setDescription("View details of a party")
    .addIntegerOption((opt) =>
      opt.setName("party_id").setDescription("ID of the party to view").setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const partyId = interaction.options.getInteger("party_id", true);

    const data = await getPartyWithDetails(partyId);

    if (!data) {
      await interaction.reply({ content: `Party #${partyId} not found.`, ephemeral: true });
      return;
    }

    const { embed, row, attachment } = buildPartyEmbed(data);

    await interaction.reply({
      embeds: [embed],
      files: [attachment],
      components: row ? [row] : [],
      ephemeral: true,
    });
  },
} satisfies Command;
