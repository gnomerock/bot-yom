import {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { Command } from "../types";
import { db } from "../db";
import { parties } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { upsertUser } from "../db/helpers";

export default {
  data: new SlashCommandBuilder()
    .setName("edit")
    .setDescription("Edit the description of your active party"),

  async execute(interaction: ChatInputCommandInteraction) {
    // No defer — showModal must be the first response
    const user = await upsertUser(interaction.user.id, interaction.user.username);

    const [row] = await db
      .select()
      .from(parties)
      .where(and(eq(parties.leaderId, user.id), eq(parties.status, "open")));

    if (!row) {
      await interaction.reply({
        content: "You don't have an active party. Use `/create` to start one.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(`edit_modal:${row.id}`)
      .setTitle(`Edit Party #${row.id}`)
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("description")
            .setLabel("Party Note (optional)")
            .setStyle(TextInputStyle.Paragraph)
            .setValue(row.description ?? "")
            .setPlaceholder("e.g. LF exp. players, must know mechanics. Prog-friendly.")
            .setRequired(false)
            .setMaxLength(500),
        ),
      );

    await interaction.showModal(modal);
  },
} satisfies Command;
