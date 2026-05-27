import {
  SlashCommandBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { Command } from "../types";
import { db } from "../db";
import { content, parties, partyMembers } from "../db/schema";
import { JOBS, type Job } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { upsertUser, getPartyWithDetails } from "../db/helpers";
import { buildPartyEmbed } from "../utils/partyEmbed";
import { postToBoard } from "../utils/board";
import { notifyPartyCreated } from "../utils/webhook";

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
        .setName("date")
        .setDescription("Scheduled date in GMT+7 (pick from suggestions or type YYYY-MM-DD)")
        .setRequired(false)
        .setAutocomplete(true),
    )
    .addStringOption((option) =>
      option
        .setName("time")
        .setDescription("Scheduled time in GMT+7 (pick from suggestions or type HH:MM)")
        .setRequired(false)
        .setAutocomplete(true),
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
    const dateInput = interaction.options.getString("date")?.trim() ?? "";
    const timeInput = interaction.options.getString("time")?.trim() ?? "";
    const description = interaction.options.getString("description")?.trim() || null;

    // Both date and time must be provided together
    if (!!dateInput !== !!timeInput) {
      await interaction.editReply("❌ Please provide both **date** and **time**, or neither.");
      return;
    }

    // Parse scheduled date/time
    let scheduledAt: Date | null = null;
    if (dateInput && timeInput) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        await interaction.editReply(`❌ Invalid date **${dateInput}**. Pick from the suggestions or type \`YYYY-MM-DD\`.`);
        return;
      }
      if (!/^\d{2}:\d{2}$/.test(timeInput)) {
        await interaction.editReply(`❌ Invalid time **${timeInput}**. Pick from the suggestions or type \`HH:MM\`.`);
        return;
      }
      const parsed = new Date(`${dateInput}T${timeInput}:00+07:00`);
      if (isNaN(parsed.getTime())) {
        await interaction.editReply("❌ Invalid date/time combination.");
        return;
      }
      scheduledAt = parsed;
    }

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

    // Post to board channel — fetch fresh data so messageId is saved
    const freshData = await getPartyWithDetails(party.id);
    if (freshData) await postToBoard(freshData, interaction.client);

    await notifyPartyCreated(partyData);
  },
} satisfies Command;
