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
  const user = await upsertUser(interaction.user.id, interaction.user.username);

  const [row] = await db
    .select()
    .from(parties)
    .where(and(eq(parties.id, partyId), eq(parties.leaderId, user.id), eq(parties.status, "open")));

  if (!row) {
    await interaction.editReply("Party not found or you're not the leader of an open party.");
    return;
  }

  await db
    .update(parties)
    .set({ description, updatedAt: new Date() })
    .where(eq(parties.id, partyId));

  const updated = await getPartyWithDetails(partyId);
  if (updated) {
    await refreshAllPartyMessages(updated, interaction.client);
  }

  await interaction.editReply(`✅ Party #${partyId} description updated.`);
}
