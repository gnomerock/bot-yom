import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { Command } from "../types";
import { db } from "../db";
import { parties, content, users, partyMembers } from "../db/schema";
import { eq, and, count, inArray } from "drizzle-orm";

export default {
  data: new SlashCommandBuilder()
    .setName("list")
    .setDescription("List all open parties in this server"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const guildId = interaction.guildId!;

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

    // Fetch all member counts in one query
    const partyIds = openParties.map((p) => p.party.id);
    const memberCounts = await db
      .select({ partyId: partyMembers.partyId, value: count() })
      .from(partyMembers)
      .where(inArray(partyMembers.partyId, partyIds))
      .groupBy(partyMembers.partyId);

    const countMap = new Map(memberCounts.map((r) => [r.partyId, r.value]));

    const fields = openParties.map(({ party, content: c, leader }) => {
      const memberCount = countMap.get(party.id) ?? 0;
      const isFull = memberCount >= c.requiredPlayers;
      const typeTag = c.type === "high-end" ? "🔥 High-End" : "⚔️ Raid";
      const link =
        party.messageId
          ? ` • [View](https://discord.com/channels/${party.guildId}/${party.channelId}/${party.messageId})`
          : "";

      return {
        name: `#${party.id} — ${c.name}`,
        value: `${typeTag} · ${memberCount}/${c.requiredPlayers} slots · Leader: **${leader.username}**${isFull ? " · 🔒 Full" : ""}${link}`,
        inline: false,
      };
    });

    const embed = new EmbedBuilder()
      .setTitle(`🎮 Open Parties (${openParties.length})`)
      .setColor(0x5865f2)
      .addFields(fields)
      .setFooter({ text: "Parties are shared across all servers • use /join <id> or click View to join" });

    const joinableButtons = openParties.slice(0, 5).map(({ party, content: c }) => {
      const isFull = (countMap.get(party.id) ?? 0) >= c.requiredPlayers;
      return new ButtonBuilder()
        .setCustomId(`join:${party.id}`)
        .setLabel(`#${party.id}`)
        .setStyle(isFull ? ButtonStyle.Secondary : ButtonStyle.Primary)
        .setDisabled(isFull);
    });

    const components =
      joinableButtons.length > 0
        ? [new ActionRowBuilder<ButtonBuilder>().addComponents(joinableButtons)]
        : [];

    await interaction.editReply({ embeds: [embed], components });
  },
} satisfies Command;
