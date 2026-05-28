import {
  SlashCommandBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { Command } from "../types";
import { db } from "../db";
import { parties, partyMembers, content } from "../db/schema";
import { JOBS, type Job } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { upsertUser, getPartyWithDetails } from "../db/helpers";
import { refreshAllPartyMessages } from "../utils/board";

export default {
  data: new SlashCommandBuilder()
    .setName("edit")
    .setDescription("Edit your active party")
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("content")
        .setDescription("Change the content")
        .setRequired(false)
        .setAutocomplete(true),
    )
    .addStringOption((option) =>
      option
        .setName("job")
        .setDescription("Change your job/class")
        .setRequired(false)
        .addChoices(JOBS.map((job) => ({ name: job, value: job }))),
    )
    .addStringOption((option) =>
      option
        .setName("date")
        .setDescription("Change scheduled date in GMT+7 (pick from suggestions or type YYYY-MM-DD, or 'clear')")
        .setRequired(false)
        .setAutocomplete(true),
    )
    .addStringOption((option) =>
      option
        .setName("time")
        .setDescription("Change scheduled time in GMT+7 (pick from suggestions or type HH:MM)")
        .setRequired(false)
        .setAutocomplete(true),
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("Change the party note (leave empty to clear)")
        .setRequired(false)
        .setMaxLength(500),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const contentIdRaw = interaction.options.getString("content");
    const job = interaction.options.getString("job") as Job | null;
    const dateInput = interaction.options.getString("date")?.trim() ?? "";
    const timeInput = interaction.options.getString("time")?.trim() ?? "";
    const descriptionRaw = interaction.options.getString("description");

    if (!contentIdRaw && !job && !dateInput && !timeInput && descriptionRaw === null) {
      await interaction.editReply("Please provide at least one field to update.");
      return;
    }

    const user = await upsertUser(interaction.user.id, interaction.user.username);

    const [row] = await db
      .select()
      .from(parties)
      .where(and(eq(parties.leaderId, user.id), eq(parties.status, "open")));

    if (!row) {
      await interaction.editReply("You don't have an active open party.");
      return;
    }

    // Parse optional scheduled date/time
    let scheduledAt: Date | null | undefined = undefined; // undefined = no change
    const clearSchedule = dateInput.toLowerCase() === "clear";

    if (clearSchedule) {
      scheduledAt = null;
    } else if (dateInput || timeInput) {
      let resolvedDate = dateInput;
      if (resolvedDate && !/^\d{4}-\d{2}-\d{2}$/.test(resolvedDate)) {
        await interaction.editReply(`❌ Invalid date **${resolvedDate}**. Pick from suggestions or type \`YYYY-MM-DD\`.`);
        return;
      }
      if (!resolvedDate) {
        if (row.scheduledAt) {
          const gmt7 = new Date(row.scheduledAt.getTime() + 7 * 60 * 60 * 1000);
          const y = gmt7.getUTCFullYear();
          const m = String(gmt7.getUTCMonth() + 1).padStart(2, "0");
          const d = String(gmt7.getUTCDate()).padStart(2, "0");
          resolvedDate = `${y}-${m}-${d}`;
        } else {
          const nowGMT7 = new Date(Date.now() + 7 * 60 * 60 * 1000);
          const y = nowGMT7.getUTCFullYear();
          const m = String(nowGMT7.getUTCMonth() + 1).padStart(2, "0");
          const d = String(nowGMT7.getUTCDate()).padStart(2, "0");
          resolvedDate = `${y}-${m}-${d}`;
        }
      }
      let resolvedTime = timeInput;
      if (resolvedTime && !/^\d{2}:\d{2}$/.test(resolvedTime)) {
        await interaction.editReply(`❌ Invalid time **${resolvedTime}**. Pick from suggestions or type \`HH:MM\`.`);
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

    // Build DB update
    const updateSet: Record<string, unknown> = { updatedAt: new Date() };

    if (contentIdRaw !== null) {
      const contentId = parseInt(contentIdRaw);
      const [selectedContent] = await db.select().from(content).where(eq(content.id, contentId));
      if (!selectedContent) {
        await interaction.editReply("Content not found.");
        return;
      }
      updateSet.contentId = contentId;
    }

    if (descriptionRaw !== null) updateSet.description = descriptionRaw.trim() || null;
    if (scheduledAt !== undefined) updateSet.scheduledAt = scheduledAt;

    await db.update(parties).set(updateSet).where(eq(parties.id, row.id));

    if (job) {
      await db
        .update(partyMembers)
        .set({ job })
        .where(and(eq(partyMembers.partyId, row.id), eq(partyMembers.userId, user.id)));
    }

    const updated = await getPartyWithDetails(row.id);
    if (updated) await refreshAllPartyMessages(updated, interaction.client);

    await interaction.editReply(`✅ Party #${row.id} updated.`);
  },
} satisfies Command;
