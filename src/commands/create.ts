import {
  SlashCommandBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { Command } from "../types";
import { db } from "../db";
import { content, parties, partyMembers, users } from "../db/schema";
import { JOBS, type Job } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { upsertUser, getPartyWithDetails } from "../db/helpers";
import { buildPartyEmbed } from "../utils/partyEmbed";
import { notifyPartyCreated } from "../utils/webhook";

/**
 * Parse a "YYYY-MM-DD HH:MM" UTC string into a Date.
 * Returns null if empty, or "invalid" if the format is wrong.
 */
function parseScheduledAt(input: string): Date | null | "invalid" {
  const raw = input.trim();
  if (!raw) return null;

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return "invalid";

  const [, y, mo, d, h, mi, s = "0"] = match;
  const date = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
  if (isNaN(date.getTime())) return "invalid";
  return date;
}

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
    )
    .addStringOption((option) =>
      option
        .setName("scheduled_at")
        .setDescription("Scheduled date & time in UTC — format: YYYY-MM-DD HH:MM")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("Party note shown on the announcement")
        .setRequired(false)
        .setMaxLength(500),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const contentId = parseInt(interaction.options.getString("content", true));
    const job = interaction.options.getString("job", true) as Job;
    const scheduledAtInput = interaction.options.getString("scheduled_at") ?? "";
    const description = interaction.options.getString("description")?.trim() || null;

    // Parse optional scheduled date/time
    const scheduledAtResult = parseScheduledAt(scheduledAtInput);
    if (scheduledAtResult === "invalid") {
      await interaction.editReply(
        `❌ Invalid date/time **${scheduledAtInput}**. Use \`YYYY-MM-DD HH:MM\` in UTC, e.g. \`2025-06-15 20:00\`.`,
      );
      return;
    }
    const scheduledAt = scheduledAtResult; // Date | null

    const user = await upsertUser(interaction.user.id, interaction.user.username);

    const [existingParty] = await db
      .select()
      .from(parties)
      .where(and(eq(parties.leaderId, user.id), eq(parties.status, "open")));

    if (existingParty) {
      await interaction.editReply(
        `You already have an open party (#${existingParty.id}). Use \`/done disband\` to close it first.`,
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
      .values({
        contentId,
        leaderId: user.id,
        guildId: interaction.guildId!,
        channelId: interaction.channelId!,
        status: "open",
        ...(description !== null && { description }),
        ...(scheduledAt !== null && { scheduledAt }),
      })
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
  },
} satisfies Command;
