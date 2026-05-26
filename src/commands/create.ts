import {
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { Command } from "../types";
import { db } from "../db";
import { content, parties, users } from "../db/schema";
import { eq, and } from "drizzle-orm";

export default {
  data: new SlashCommandBuilder()
    .setName("create")
    .setDescription("Create a new party (1 active party per user)"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guildId = interaction.guildId!;

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.discordId, interaction.user.id));

    if (existingUser) {
      const [existingParty] = await db
        .select()
        .from(parties)
        .where(and(eq(parties.leaderId, existingUser.id), eq(parties.status, "open")));

      if (existingParty) {
        await interaction.editReply(
          `You already have an open party (#${existingParty.id}). Use \`/done disband\` to close it first.`,
        );
        return;
      }
    }

    const allContent = await db.select().from(content);

    if (allContent.length === 0) {
      await interaction.editReply(
        "No content is configured yet. Ask a server admin to add content to the database.",
      );
      return;
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId("create_content_select")
      .setPlaceholder("Choose content...")
      .addOptions(
        allContent.map((c) => ({
          label: c.name,
          description: `${c.type === "high-end" ? "🔥 High-End" : "⚔️ Raid"} · ${c.requiredPlayers} players · +${c.pointsOnClear} pts`,
          value: String(c.id),
        })),
      );

    await interaction.editReply({
      content: "**Step 1 / 2** — Select the content for your party:",
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
    });
  },
} satisfies Command;
