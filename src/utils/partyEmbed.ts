import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} from "discord.js";
import { join } from "node:path";
import type { ContentType, PartyStatus, Job } from "../db/schema";
import { JOB_ROLES } from "../db/schema";
import { jobEmoji, contentTypeEmoji, roleEmojiForButton, roleEmojiString } from "./jobEmoji";

const publicDir = join(import.meta.dir, "../..", "public");

const DUTY_ICONS: Record<string, string> = {
  "raid":     "raid.png",
  "high-end": "highend.png",
  "highend":  "highend.png",
};

const TYPE_LABELS: Record<string, string> = {
  "raid":     "Raid (Normal)",
  "high-end": "High-End (Savage / Ultimate)",
  "highend":  "High-End (Savage / Ultimate)",
};

const TYPE_COLORS: Record<string, number> = {
  "raid":     0x5865f2,
  "high-end": 0xff6b35,
  "highend":  0xff6b35,
};

export function dutyIconAttachment(type: string | null | undefined, name = "duty-icon.png"): AttachmentBuilder {
  const file = (type && DUTY_ICONS[type]) ?? "raid.png";
  return new AttachmentBuilder(join(publicDir, "duties", file), { name });
}

export type PartyEmbedData = {
  party: {
    id: number;
    status: PartyStatus;
    guildId: string;
    channelId: string;
    messageId: string | null;
    boardMessageId?: string | null;
    description?: string | null;
    scheduledAt?: Date | null;
  };
  content: {
    name: string;
    type: ContentType;
    requiredPlayers: number;
    description: string | null;
    pointsOnClear: number;
  };
  members: Array<{ user: { username: string; discordId: string }; member: { job: string } }>;
  leaderName: string;
  leaderDiscordId: string;
};

export function buildPartyEmbed(data: PartyEmbedData, iconName = "duty-icon.png"): {
  embed: EmbedBuilder;
  rows: ActionRowBuilder<ButtonBuilder>[];
  attachment: AttachmentBuilder;
} {
  const { party, content, members, leaderName, leaderDiscordId } = data;
  const isFull = members.length >= content.requiredPlayers;
  const isOpen = party.status === "open";

  const statusIcon = party.status === "cleared" ? "✅" : party.status === "disbanded" ? "❌" : "🔵";
  const color = isOpen
    ? (TYPE_COLORS[content.type as ContentType] ?? 0x5865f2)
    : party.status === "cleared" ? 0xffd700 : 0x888888;

  const attachment = dutyIconAttachment(content.type, iconName);
  const typeEmoji = contentTypeEmoji(content.type);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${statusIcon} Party #${party.id} — ${content.name}`)
    .setThumbnail(`attachment://${iconName}`)
    .addFields(
      { name: "Type", value: `${typeEmoji} ${TYPE_LABELS[content.type as ContentType] ?? content.type}`, inline: true },
      { name: "Slots", value: `${members.length} / ${content.requiredPlayers}`, inline: true },
      { name: "Points", value: `+${content.pointsOnClear} on clear`, inline: true },
      { name: "Leader", value: leaderDiscordId ? `<@${leaderDiscordId}>` : (leaderName || "Unknown"), inline: false },
    );

  if (party.scheduledAt) {
    const scheduledDate = party.scheduledAt instanceof Date
      ? party.scheduledAt
      : new Date(party.scheduledAt as unknown as string);
    const unix = Math.floor(scheduledDate.getTime() / 1000);
    if (!isNaN(unix)) {
      embed.addFields({
        name: "📅 Scheduled",
        value: `<t:${unix}:F> (<t:${unix}:R>)`,
        inline: false,
      });
    }
  }

  const descParts = [content.description, party.description].filter(Boolean);
  if (descParts.length > 0) embed.setDescription(descParts.join("\n\n"));

  // Role slot counts — 2 tanks, 2 healers, 4 DPS per 8 players
  const scale = content.requiredPlayers / 8;
  const tankSlots   = Math.round(2 * scale);
  const healerSlots = Math.round(2 * scale);
  const dpsSlots    = content.requiredPlayers - tankSlots - healerSlots;

  const tankMembers   = members.filter(m => JOB_ROLES[m.member.job as Job] === "Tank");
  const healerMembers = members.filter(m => JOB_ROLES[m.member.job as Job] === "Healer");
  const dpsMembers    = members.filter(m => !["Tank", "Healer"].includes(JOB_ROLES[m.member.job as Job]));

  const tankCount   = tankMembers.length;
  const healerCount = healerMembers.length;
  const dpsCount    = dpsMembers.length;

  // Build full slot grid — filled slots show job + user, empty slots show "free"
  const te = roleEmojiString("tank");
  const he = roleEmojiString("healer");
  const de = roleEmojiString("dps");

  const slotLines: string[] = [];
  for (let i = 0; i < tankSlots; i++) {
    const m = tankMembers[i];
    slotLines.push(m ? `${te} ${jobEmoji(m.member.job)} <@${m.user.discordId}> — ${m.member.job}` : `${te} — *free*`);
  }
  for (let i = 0; i < healerSlots; i++) {
    const m = healerMembers[i];
    slotLines.push(m ? `${he} ${jobEmoji(m.member.job)} <@${m.user.discordId}> — ${m.member.job}` : `${he} — *free*`);
  }
  for (let i = 0; i < dpsSlots; i++) {
    const m = dpsMembers[i];
    slotLines.push(m ? `${de} ${jobEmoji(m.member.job)} <@${m.user.discordId}> — ${m.member.job}` : `${de} — *free*`);
  }

  embed.addFields({
    name: `Members (${members.length} / ${content.requiredPlayers})`,
    value: slotLines.join("\n"),
  });

  const footerText =
    party.status === "cleared" ? "🎉 Party cleared!" :
    party.status === "disbanded" ? "Party disbanded" :
    isFull ? "Party is full — all slots taken" :
    "Select a role below to join this party";

  embed.setFooter({ text: footerText });

  const rows: ActionRowBuilder<ButtonBuilder>[] = [];

  if (isOpen) {
    const tankEmoji   = roleEmojiForButton("tank");
    const healerEmoji = roleEmojiForButton("healer");
    const dpsEmoji    = roleEmojiForButton("dps");

    const tankBtn = new ButtonBuilder()
      .setCustomId(`join_role:${party.id}:tank`)
      .setLabel(`Tank ${tankCount}/${tankSlots}`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(isFull || tankCount >= tankSlots);
    if (tankEmoji) tankBtn.setEmoji(tankEmoji); else tankBtn.setLabel(`🛡 Tank ${tankCount}/${tankSlots}`);

    const healerBtn = new ButtonBuilder()
      .setCustomId(`join_role:${party.id}:healer`)
      .setLabel(`Healer ${healerCount}/${healerSlots}`)
      .setStyle(ButtonStyle.Success)
      .setDisabled(isFull || healerCount >= healerSlots);
    if (healerEmoji) healerBtn.setEmoji(healerEmoji); else healerBtn.setLabel(`💚 Healer ${healerCount}/${healerSlots}`);

    const dpsBtn = new ButtonBuilder()
      .setCustomId(`join_role:${party.id}:dps`)
      .setLabel(`DPS ${dpsCount}/${dpsSlots}`)
      .setStyle(ButtonStyle.Danger)
      .setDisabled(isFull || dpsCount >= dpsSlots);
    if (dpsEmoji) dpsBtn.setEmoji(dpsEmoji); else dpsBtn.setLabel(`⚔ DPS ${dpsCount}/${dpsSlots}`);

    // Row 1: join by role
    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(tankBtn, healerBtn, dpsBtn),
    );

    // Row 2: leader actions
    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`party_edit:${party.id}`)
          .setLabel("✏️ Edit")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`party_clear:${party.id}`)
          .setLabel("✅ Clear")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`party_disband:${party.id}`)
          .setLabel("❌ Disband")
          .setStyle(ButtonStyle.Danger),
      ),
    );
  }

  return { embed, rows, attachment };
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
    const { embed, rows, attachment } = buildPartyEmbed(data);
    await message.edit({
      embeds: [embed],
      files: [attachment],
      attachments: [],
      components: rows,
    });
  } catch {
    // Message may have been deleted — silently ignore
  }
}
