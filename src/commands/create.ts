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
import { content, parties, users } from "../db/schema";
import { JOBS, type Job } from "../db/schema";
import { eq, and } from "drizzle-orm";

export default {
  data: new SlashCommandBuilder()
    .setName("create")
    .setDescription("Create a new party (1 active party per user)")
    .addStringOption((option) =>
      option
        .setName("content")
        .setDescription("The content for your party")
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addStringOption((option) =>
      option
        .setName("job")
        .setDescription("Your job/class")
        .setRequired(true)
        .addChoices(JOBS.map((job) => ({ name: job, value: job }))),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    // No defer — showModal must be the first response
    const contentId = parseInt(interaction.options.getString("content", true));
    const job = interaction.options.getString("job", true) as Job;

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.discordId, interaction.user.id));

    if (existingUser) {
      const [existingParty] = await db
        .select()
        .from(parties)
        .where(and(eq(parties.leaderId, existingUser.id), eq(parties.status, "open")));

      if (existingParty) {
        await interaction.reply({
          content: `You already have an open party (#${existingParty.id}). Use \`/done disband\` to close it first.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    const [selectedContent] = await db.select().from(content).where(eq(content.id, contentId));
    if (!selectedContent) {
      await interaction.reply({ content: "Content not found.", flags: MessageFlags.Ephemeral });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(`create_modal:${contentId}:${job}`)
      .setTitle(`Create Party — ${selectedContent.name}`)
      .addComponents(
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
