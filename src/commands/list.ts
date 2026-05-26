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
import { eq, and, count } from "drizzle-orm";

export default {
  data: new SlashCommandBuilder()
    .setName("list")
    .setDescription("List all open parties in this server"),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId!;

    const openParties = await db
      .select({ party: parties, content, leader: users })
      .from(parties)
      .innerJoin(content, eq(parties.contentId, content.id))
      .innerJoin(users, eq(parties.leaderId, users.id))
      .where(and(eq(parties.status, "open"), eq(parties.guildId, guildId)));

    if (openParties.length === 0) {
      await interaction.reply({
        content: "No open parties right now. Use `/create` to start one!",
        ephemeral: true,
      });
      return;
    }

    const fields = await Promise.all(
      openParties.map(async ({ party, content: c, leader }) => {
        const [{ value: memberCount }] = await db
          .select({ value: count() })
          .from(partyMembers)
          .where(eq(partyMembers.partyId, party.id));

        const slots = `${memberCount}/${c.requiredPlayers}`;
        const isFull = memberCount >= c.requiredPlayers;
        const typeTag = c.type === "high-end" ? "🔥 High-End" : "⚔️ Raid";
        const link =
          party.messageId
            ? ` • [View](https://discord.com/channels/${guildId}/${party.channelId}/${party.messageId})`
            : "";

        return {
          name: `#${party.id} — ${c.name}`,
          value: `${typeTag} · ${slots} slots · Leader: **${leader.username}**${isFull ? " · 🔒 Full" : ""}${link}`,
          inline: false,
        };
      }),
    );

    const embed = new EmbedBuilder()
      .setTitle(`🎮 Open Parties (${openParties.length})`)
      .setColor(0x5865f2)
      .addFields(fields)
      .setFooter({ text: "Click a party's View link or use /join <id> to join" });

    // Quick join buttons (up to 5, show only non-full parties first)
    const joinable = openParties.filter(async ({ party, content: c }) => true).slice(0, 5);
    const memberCounts = await Promise.all(
      joinable.map(({ party }) =>
        db.select({ value: count() }).from(partyMembers).where(eq(partyMembers.partyId, party.id))
          .then(([r]) => r.value),
      ),
    );

    const buttons = joinable
      .map(({ party, content: c }, i) => {
        const isFull = memberCounts[i] >= c.requiredPlayers;
        return new ButtonBuilder()
          .setCustomId(`join:${party.id}`)
          .setLabel(`#${party.id}`)
          .setStyle(isFull ? ButtonStyle.Secondary : ButtonStyle.Primary)
          .setDisabled(isFull);
      });

    const components =
      buttons.length > 0
        ? [new ActionRowBuilder<ButtonBuilder>().addComponents(buttons)]
        : [];

    await interaction.reply({ embeds: [embed], components });
  },
} satisfies Command;
