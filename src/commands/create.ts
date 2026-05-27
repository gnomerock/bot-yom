import {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { Command } from "../types";

export default {
  data: new SlashCommandBuilder()
    .setName("create")
    .setDescription("Create a new party (1 active party per user)"),

  async execute(interaction: ChatInputCommandInteraction) {
    // No defer — showModal must be the first response
    const modal = new ModalBuilder()
      .setCustomId("create_modal")
      .setTitle("Create Party")
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("content")
            .setLabel("Content Name")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("e.g. The Futures Rewritten, Dragonsong's Reprise")
            .setRequired(true)
            .setMaxLength(100),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("job")
            .setLabel("Your Job / Class")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("e.g. Paladin, White Mage, Dragoon")
            .setRequired(true)
            .setMaxLength(50),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("description")
            .setLabel("Party Note (optional)")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("e.g. LF exp. players, must know mechanics. Prog-friendly.")
            .setRequired(false)
            .setMaxLength(500),
        ),
      );

    await interaction.showModal(modal);
  },
} satisfies Command;
