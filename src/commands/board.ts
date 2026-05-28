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
    .setName("board")
    .setDescription("Set this channel as the party board — new parties will be posted here")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guildId = interaction.guildId!;
    const channelId = interaction.channelId!;

    const [existing] = await db
      .select()
      .from(guildSettings)
      .where(eq(guildSettings.guildId, guildId));

    if (existing) {
      await db
        .update(guildSettings)
        .set({ boardChannelId: channelId })
        .where(eq(guildSettings.guildId, guildId));
    } else {
      await db.insert(guildSettings).values({ guildId, boardChannelId: channelId });
    }

    await interaction.editReply(
      `✅ Party board set to <#${channelId}>. All new parties will be posted and kept up-to-date here.`,
    );
  },
} satisfies Command;
