import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import type { Command } from "../types";

export default {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check bot latency"),

  async execute(interaction: ChatInputCommandInteraction) {
    const { resource } = await interaction.reply({ content: "Pinging..." }).withResponse();
    const sent = resource.message;
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply(`Pong! Latency: ${latency}ms | API: ${interaction.client.ws.ping}ms`);
  },
} satisfies Command;
