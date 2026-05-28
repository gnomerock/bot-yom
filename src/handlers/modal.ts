import {
  MessageFlags,
  type ModalSubmitInteraction,
} from "discord.js";
import { db } from "../db";
import { parties } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { upsertUser, getPartyWithDetails } from "../db/helpers";
import { refreshAllPartyMessages } from "../utils/board";

export async function handleModal(interaction: ModalSubmitInteraction) {
  const parts = interaction.customId.split(":");
  const action = parts[0];

  if (action === "edit_modal") {
    await handleEditModal(interaction, parseInt(parts[1]));
  }
}

async function handleEditModal(interaction: ModalSubmitInteraction, partyId: number) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const description = interaction.fields.getTextInputValue("description").trim() || null;
  const dateInput = interaction.fields.getTextInputValue("date").trim();
  const timeInput = interaction.fields.getTextInputValue("time").trim();

  const user = await upsertUser(interaction.user.id, interaction.user.username);

  const [row] = await db
    .select()
    .from(parties)
    .where(and(eq(parties.id, partyId), eq(parties.leaderId, user.id), eq(parties.status, "open")));

  if (!row) {
    await interaction.editReply("Party not found or you're not the leader of an open party.");
    return;
  }

  // Parse scheduled date/time: both empty = clear, either filled = parse and update
  let scheduledAt: Date | null = null;
  if (dateInput || timeInput) {
    let resolvedDate = dateInput;
    if (resolvedDate && !/^\d{4}-\d{2}-\d{2}$/.test(resolvedDate)) {
      await interaction.editReply(`❌ Invalid date **${resolvedDate}**. Use \`YYYY-MM-DD\`.`);
      return;
    }
    if (!resolvedDate) {
      const nowGMT7 = new Date(Date.now() + 7 * 60 * 60 * 1000);
      const y = nowGMT7.getUTCFullYear();
      const m = String(nowGMT7.getUTCMonth() + 1).padStart(2, "0");
      const d = String(nowGMT7.getUTCDate()).padStart(2, "0");
      resolvedDate = `${y}-${m}-${d}`;
    }
    let resolvedTime = timeInput;
    if (resolvedTime && !/^\d{2}:\d{2}$/.test(resolvedTime)) {
      await interaction.editReply(`❌ Invalid time **${resolvedTime}**. Use \`HH:MM\`.`);
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

  await db
    .update(parties)
    .set({ description, scheduledAt, updatedAt: new Date() })
    .where(eq(parties.id, partyId));

  const updated = await getPartyWithDetails(partyId);
  if (updated) await refreshAllPartyMessages(updated, interaction.client);

  await interaction.editReply(`✅ Party #${partyId} updated.`);
}
