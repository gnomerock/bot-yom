import {
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { Command } from "../types";
import { db } from "../db";
import { parties, partyMembers, content } from "../db/schema";
import { JOBS, JOB_ROLES } from "../db/schema";
import { eq, and, count } from "drizzle-orm";

export default {
  data: new SlashCommandBuilder()
    .setName("join")
    .setDescription("Join an open party by ID")
    .addIntegerOption((opt) =>
      opt.setName("party_id").setDescription("ID of the party to join").setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const partyId = interaction.options.getInteger("party_id", true);

    const [row] = await db
      .select({ party: parties, content })
      .from(parties)
      .innerJoin(content, eq(parties.contentId, content.id))
      .where(and(eq(parties.id, partyId), eq(parties.status, "open")));

    if (!row) {
      await interaction.reply({
        content: `Party #${partyId} not found or is no longer open.`,
        ephemeral: true,
      });
      return;
    }

    const [{ value: memberCount }] = await db
      .select({ value: count() })
      .from(partyMembers)
      .where(eq(partyMembers.partyId, partyId));

    if (memberCount >= row.content.requiredPlayers) {
      await interaction.reply({ content: `Party #${partyId} is already full.`, ephemeral: true });
      return;
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`join_job_select:${partyId}`)
      .setPlaceholder("Select your job...")
      .addOptions(JOBS.map((job) => ({ label: job, description: JOB_ROLES[job], value: job })));

    await interaction.reply({
      content: `**Joining Party #${partyId}** — Select your job:`,
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
      ephemeral: true,
    });
  },
} satisfies Command;
