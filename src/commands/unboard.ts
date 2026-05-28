import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { Command } from "../types";
import { db } from "../db";
import { guildSettings } from "../db/schema";
import { eq } from "drizzle-orm";

export default {
  data: new SlashCommandBuilder()
    .setName("unboard")
    .setDescription("Unregister the party board for this server")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guildId = interaction.guildId!;

    const [existing] = await db
      .select()
      .from(guildSettings)
      .where(eq(guildSettings.guildId, guildId));

    if (!existing?.boardChannelId) {
      await interaction.editReply("No party board is currently set for this server.");
      return;
    }

    await db
      .update(guildSettings)
      .set({ boardChannelId: null })
      .where(eq(guildSettings.guildId, guildId));

    await interaction.editReply("✅ Party board unregistered. New parties will no longer be posted to a board channel.");
  },
} satisfies Command;
