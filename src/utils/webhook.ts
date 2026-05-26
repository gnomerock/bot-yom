import { WebhookClient } from "discord.js";
import type { PartyEmbedData } from "./partyEmbed";
import { buildPartyEmbed } from "./partyEmbed";

export async function notifyPartyCreated(data: PartyEmbedData) {
  const url = process.env.PARTY_WEBHOOK_URL;
  if (!url) return;

  try {
    const webhook = new WebhookClient({ url });
    const { embed, attachment } = buildPartyEmbed(data);
    await webhook.send({
      content: "🎮 New party created!",
      embeds: [embed],
      files: [attachment],
    });
    webhook.destroy();
  } catch (error) {
    console.error("Webhook notification failed:", error);
  }
}
