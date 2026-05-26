import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} from "discord.js";
import { join } from "node:path";
import type { ContentType, PartyStatus } from "../db/schema";
import { jobEmoji } from "./jobEmoji";

const publicDir = join(import.meta.dir, "../..", "public");

const DUTY_ICONS: Record<ContentType, string> = {
  "raid": "raid.png",
  "high-end": "high-end.png",
};

const TYPE_LABELS: Record<ContentType, string> = {
  "raid": "Raid (Normal)",
  "high-end": "High-End (Savage / Ultimate)",
};

const TYPE_COLORS: Record<ContentType, number> = {
  "raid": 0x5865f2,
  "high-end": 0xff6b35,
};

export function dutyIconAttachment(type: ContentType, name = "duty-icon.png"): AttachmentBuilder {
  const file = DUTY_ICONS[type] ?? "raid.png";
  return new AttachmentBuilder(join(publicDir, "duties", file), { name });
}

export type PartyEmbedData = {
  party: { id: number; status: PartyStatus; channelId: string; messageId: string | null; description?: string | null };
  content: {
    name: string;
    type: ContentType;
    requiredPlayers: number;
    description: string | null;
    pointsOnClear: number;
  };
  members: Array<{ user: { username: string }; member: { job: string } }>;
  leaderName: string;
};

export function buildPartyEmbed(data: PartyEmbedData, iconName = "duty-icon.png"): {
  embed: EmbedBuilder;
  row: ActionRowBuilder<ButtonBuilder> | null;
  attachment: AttachmentBuilder;
} {
  const { party, content, members, leaderName } = data;
  const isFull = members.length >= content.requiredPlayers;
  const isOpen = party.status === "open";

  const statusIcon = party.status === "cleared" ? "✅" : party.status === "disbanded" ? "❌" : "🔵";
  const color = isOpen
    ? (TYPE_COLORS[content.type as ContentType] ?? 0x5865f2)
    : party.status === "cleared" ? 0xffd700 : 0x888888;

  const attachment = dutyIconAttachment(content.type, iconName);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${statusIcon} Party #${party.id} — ${content.name}`)
    .setThumbnail(`attachment://${iconName}`)
    .addFields(
      { name: "Type", value: TYPE_LABELS[content.type], inline: true },
      { name: "Slots", value: `${members.length} / ${content.requiredPlayers}`, inline: true },
      { name: "Points", value: `+${content.pointsOnClear} on clear`, inline: true },
      { name: "Leader", value: leaderName, inline: false },
    );

  const embedDesc = party.description ?? content.description;
  if (embedDesc) embed.setDescription(embedDesc);

  if (members.length > 0) {
    embed.addFields({
      name: `Members (${members.length} / ${content.requiredPlayers})`,
      value: members.map(m => `${jobEmoji(m.member.job)} **${m.user.username}** — ${m.member.job}`).join("\n"),
    });
  }

  const footerText =
    party.status === "cleared" ? "🎉 Party cleared!" :
    party.status === "disbanded" ? "Party disbanded" :
    isFull ? "Party is full" :
    "Click Join to select your job and join this party";

  embed.setFooter({ text: footerText });

  let row: ActionRowBuilder<ButtonBuilder> | null = null;
  if (isOpen) {
    row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`join:${party.id}`)
        .setLabel(isFull ? "Party Full" : "⚔ Join Party")
        .setStyle(isFull ? ButtonStyle.Secondary : ButtonStyle.Success)
        .setDisabled(isFull),
    );
  }

  return { embed, row, attachment };
}

export async function refreshPartyMessage(
  data: PartyEmbedData,
  client: { channels: { fetch: (id: string) => Promise<unknown> } },
) {
  const { party } = data;
  if (!party.messageId || !party.channelId) return;

  try {
    const channel = await (client as any).channels.fetch(party.channelId);
    if (!channel?.isTextBased()) return;
    const message = await channel.messages.fetch(party.messageId);
    const { embed, row, attachment } = buildPartyEmbed(data);
    await message.edit({
      embeds: [embed],
      files: [attachment],
      attachments: [],
      components: row ? [row] : [],
    });
  } catch {
    // Message may have been deleted — silently ignore
  }
}
