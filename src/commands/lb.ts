import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { Command } from "../types";
import { db } from "../db";
import { leaderboard, users } from "../db/schema";
import { eq, desc } from "drizzle-orm";

export default {
  data: new SlashCommandBuilder()
    .setName("lb")
    .setDescription("Show the server leaderboard")
    .setDMPermission(false),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const guildId = interaction.guildId!;

    const entries = await db
      .select({ lb: leaderboard, user: users })
      .from(leaderboard)
      .innerJoin(users, eq(leaderboard.userId, users.id))
      .where(eq(leaderboard.guildId, guildId))
      .orderBy(desc(leaderboard.totalScore))
      .limit(10);

    if (entries.length === 0) {
      await interaction.editReply("No leaderboard entries yet — clear some content to earn points!");
      return;
    }

    const medals = ["🥇", "🥈", "🥉"];
    const lines = entries.map(
      ({ lb, user }, i) =>
        `${medals[i] ?? `**${i + 1}.**`} ${user.username} — **${lb.totalScore.toLocaleString()} pts** (${lb.raidsCompleted} clear${lb.raidsCompleted !== 1 ? "s" : ""})`,
    );

    const embed = new EmbedBuilder()
      .setTitle("🏆 Leaderboard")
      .setColor(0xffd700)
      .setDescription(lines.join("\n"));

    await interaction.editReply({ embeds: [embed] });
  },
} satisfies Command;
