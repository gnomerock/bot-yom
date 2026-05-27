import type { Client } from "discord.js";
import { db } from "../db";
import { guildSettings, parties } from "../db/schema";
import { eq } from "drizzle-orm";
import { buildPartyEmbed, refreshPartyMessage, type PartyEmbedData } from "./partyEmbed";

async function getBoardChannel(client: Client, guildId: string) {
  const [settings] = await db
    .select()
    .from(guildSettings)
    .where(eq(guildSettings.guildId, guildId));

  if (!settings?.boardChannelId) return null;

  try {
    const channel = await client.channels.fetch(settings.boardChannelId);
    if (!channel || !("isTextBased" in channel) || !channel.isTextBased() || channel.isDMBased()) return null;
    return channel;
  } catch {
    return null;
  }
}

/** Post a new party card to the board channel and save the boardMessageId. */
export async function postToBoard(data: PartyEmbedData, client: Client) {
  const channel = await getBoardChannel(client, data.party.guildId);
  if (!channel) return;

  try {
    const { embed, rows, attachment } = buildPartyEmbed(data);
    const msg = await (channel as any).send({
      embeds: [embed],
      files: [attachment],
      components: rows,
    });

    await db
      .update(parties)
      .set({ boardMessageId: msg.id })
      .where(eq(parties.id, data.party.id));
  } catch (err) {
    console.error(`Board post failed for party #${data.party.id}:`, err);
  }
}

/** Edit the existing board post for a party. */
export async function refreshBoardMessage(data: PartyEmbedData, client: Client) {
  if (!data.party.boardMessageId) return;

  const channel = await getBoardChannel(client, data.party.guildId);
  if (!channel) return;

  try {
    const message = await (channel as any).messages.fetch(data.party.boardMessageId);
    const { embed, rows, attachment } = buildPartyEmbed(data);
    await message.edit({
      embeds: [embed],
      files: [attachment],
      attachments: [],
      components: rows,
    });
  } catch {
    // Board message was deleted — silently ignore
  }
}

/** Refresh both the original channel post and the board post in parallel. */
export async function refreshAllPartyMessages(data: PartyEmbedData, client: Client) {
  await Promise.all([
    refreshPartyMessage(data, client),
    refreshBoardMessage(data, client),
  ]);
}
