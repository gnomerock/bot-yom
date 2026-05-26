import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { Command } from "../types";
import { db } from "../db";
import { parties, content, users, partyMembers } from "../db/schema";
import { JOB_ROLES, type Job } from "../db/schema";
import { eq, inArray } from "drizzle-orm";
import { jobEmoji } from "../utils/jobEmoji";

const ROLE_FALLBACK: Record<string, string> = {
  "Tank": "🔵",
  "Healer": "🟢",
  "Melee DPS": "🔴",
  "Ranged DPS": "🔴",
  "Caster DPS": "🔴",
  "Limited": "🟣",
};

function slotRow(jobs: string[], requiredPlayers: number): string {
  const filled = jobs.map((j) => {
    const e = jobEmoji(j);
    return e || (ROLE_FALLBACK[JOB_ROLES[j as Job]] ?? "🔴");
  });
  const empty = Array(Math.max(0, requiredPlayers - jobs.length)).fill("⬜");
  return [...filled, ...empty].join("");
}

export default {
  data: new SlashCommandBuilder()
    .setName("list")
    .setDescription("List all open parties"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const openParties = await db
      .select({ party: parties, content, leader: users })
      .from(parties)
      .innerJoin(content, eq(parties.contentId, content.id))
      .innerJoin(users, eq(parties.leaderId, users.id))
      .where(eq(parties.status, "open"));

    if (openParties.length === 0) {
      await interaction.editReply("No open parties right now. Use `/create` to start one!");
      return;
    }

    const partyIds = openParties.map((p) => p.party.id);

    const allMembers = await db
      .select({ partyId: partyMembers.partyId, job: partyMembers.job })
      .from(partyMembers)
      .where(inArray(partyMembers.partyId, partyIds));

    const memberMap = new Map<number, string[]>();
    for (const m of allMembers) {
      const arr = memberMap.get(m.partyId) ?? [];
      arr.push(m.job);
      memberMap.set(m.partyId, arr);
    }

    const fields = openParties.map(({ party, content: c, leader }) => {
      const jobs = memberMap.get(party.id) ?? [];
      const memberCount = jobs.length;
      const isFull = memberCount >= c.requiredPlayers;
      const typeTag = c.type === "high-end" ? "🔥 High-End" : "⚔️ Raid";
      const link = party.messageId
        ? ` · [View](https://discord.com/channels/${party.guildId}/${party.channelId}/${party.messageId})`
        : "";

      const slots = slotRow(jobs, c.requiredPlayers);
      const countLine = `${slots}  ${memberCount}/${c.requiredPlayers}${isFull ? " 🔒" : ""}`;
      const descLine = party.description ? `*"${party.description}"*\n` : "";
      const metaLine = `${typeTag} · Leader: **${leader.username}**${link}`;

      return {
        name: `#${party.id} — ${c.name}`,
        value: `${countLine}\n${descLine}${metaLine}`,
        inline: false,
      };
    });

    const embed = new EmbedBuilder()
      .setTitle(`🎮 Open Parties (${openParties.length})`)
      .setColor(0x5865f2)
      .addFields(fields)
      .setFooter({ text: "Parties are shared across all servers • /join <id> to join" });

    const buttons = openParties.slice(0, 5).map(({ party, content: c }) => {
      const isFull = (memberMap.get(party.id)?.length ?? 0) >= c.requiredPlayers;
      return new ButtonBuilder()
        .setCustomId(`join:${party.id}`)
        .setLabel(`#${party.id}`)
        .setStyle(isFull ? ButtonStyle.Secondary : ButtonStyle.Primary)
        .setDisabled(isFull);
    });

    const components = buttons.length > 0
      ? [new ActionRowBuilder<ButtonBuilder>().addComponents(buttons)]
      : [];

    await interaction.editReply({ embeds: [embed], components });
  },
} satisfies Command;
