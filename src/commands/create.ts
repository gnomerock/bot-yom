import {
  SlashCommandBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { Command } from "../types";
import { db } from "../db";
import { content, parties, partyMembers, guildSettings } from "../db/schema";
import { JOBS, type Job } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { upsertUser, getPartyWithDetails } from "../db/helpers";
import { buildPartyEmbed } from "../utils/partyEmbed";
import { postToBoard } from "../utils/board";

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

    // Parse optional scheduled date/time — each field is independently optional
    let scheduledAt: Date | null = null;
    if (dateInput || timeInput) {
      // Validate date if provided, otherwise default to today (GMT+7)
      let resolvedDate = dateInput;
      if (resolvedDate && !/^\d{4}-\d{2}-\d{2}$/.test(resolvedDate)) {
        await interaction.editReply(`❌ Invalid date **${resolvedDate}**. Pick from the suggestions or type \`YYYY-MM-DD\`.`);
        return;
      }
      if (!resolvedDate) {
        const nowGMT7 = new Date(Date.now() + 7 * 60 * 60 * 1000);
        const y = nowGMT7.getUTCFullYear();
        const m = String(nowGMT7.getUTCMonth() + 1).padStart(2, "0");
        const d = String(nowGMT7.getUTCDate()).padStart(2, "0");
        resolvedDate = `${y}-${m}-${d}`;
      }

      // Validate time if provided, otherwise default to 00:00
      let resolvedTime = timeInput;
      if (resolvedTime && !/^\d{2}:\d{2}$/.test(resolvedTime)) {
        await interaction.editReply(`❌ Invalid time **${resolvedTime}**. Pick from the suggestions or type \`HH:MM\`.`);
        return;
      }
      if (!resolvedTime) resolvedTime = "00:00";

      const parsed = new Date(`${resolvedDate}T${resolvedTime}:00+07:00`);
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

    // Look up board channel for this guild
    const [settings] = await db
      .select()
      .from(guildSettings)
      .where(eq(guildSettings.guildId, interaction.guildId!));
    const boardChannelId = settings?.boardChannelId ?? null;
    const inBoardChannel = boardChannelId === interaction.channelId;

    // Post announcement in the current channel
    const { embed, rows, attachment } = buildPartyEmbed(partyData);
    const channel = interaction.channel;
    if (channel && !channel.isDMBased() && channel.isTextBased()) {
      try {
        const msg = await channel.send({
          embeds: [embed],
          files: [attachment],
          components: rows,
        });
        await db.update(parties)
          .set({
            messageId: msg.id,
            // If we're already in the board channel, reuse this message as the board post
            ...(inBoardChannel && { boardMessageId: msg.id }),
          })
          .where(eq(parties.id, party.id));
      } catch (err) {
        console.error("Channel post failed:", err);
      }
    }

    // Post to board channel only if it's a different channel
    if (!inBoardChannel) {
      try {
        const freshData = await getPartyWithDetails(party.id);
        if (freshData) await postToBoard(freshData, interaction.client);
      } catch (err) {
        console.error("Board post failed:", err);
      }
    }

  },
} satisfies Command;
