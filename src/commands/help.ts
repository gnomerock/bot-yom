import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { Command } from "../types";

export default {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show all available commands"),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setTitle("📖 Bot Commands")
      .setColor(0x5865f2)
      .addFields(
        { name: "`/ping`", value: "Check bot latency", inline: false },
        { name: "`/list`", value: "List all open parties in this server", inline: false },
        { name: "`/create`", value: "Create a new party — choose content and your job. Posts a public Join button for others (max 1 active party per user)", inline: false },
        { name: "`/join <party_id>`", value: "Join a specific party by ID and select your job", inline: false },
        { name: "`/done <clear | disband>`", value: "End your active party — **clear** awards points to all members, **disband** closes without points", inline: false },
        { name: "`/lb`", value: "Show the server leaderboard", inline: false },
        { name: "`/help`", value: "Show this message", inline: false },
      )
      .setFooter({ text: "FFXIV Party Finder • Content is managed by server admins via the database" });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
} satisfies Command;
