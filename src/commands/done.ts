import {
  SlashCommandBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { Command } from "../types";
import { db } from "../db";
import { parties, partyMembers, content } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { upsertUser, awardPoints, getPartyWithDetails } from "../db/helpers";
import { refreshPartyMessage } from "../utils/partyEmbed";

export default {
  data: new SlashCommandBuilder()
    .setName("done")
    .setDescription("End your active party")
    .addStringOption((opt) =>
      opt
        .setName("status")
        .setDescription("How to close the party")
        .setRequired(true)
        .addChoices(
          { name: "✅ Clear — awards points to all members", value: "cleared" },
          { name: "❌ Disband — closes without awarding points", value: "disbanded" },
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const status = interaction.options.getString("status", true) as "cleared" | "disbanded";
    const guildId = interaction.guildId!;

    const user = await upsertUser(interaction.user.id, interaction.user.username);

    const [row] = await db
      .select({ party: parties, content })
      .from(parties)
      .innerJoin(content, eq(parties.contentId, content.id))
      .where(
        and(
          eq(parties.leaderId, user.id),
          eq(parties.status, "open"),
          eq(parties.guildId, guildId),
        ),
      );

    if (!row) {
      await interaction.editReply({
        content: "You don't have an active party to close. Use `/create` to start one.",
        flags: MessageFlags.Ephemeral,
      } as any);
      return;
    }

    const partyId = row.party.id;

    await db
      .update(parties)
      .set({ status, updatedAt: new Date() })
      .where(eq(parties.id, partyId));

    if (status === "cleared") {
      const members = await db.select().from(partyMembers).where(eq(partyMembers.partyId, partyId));
      await Promise.all(members.map((m) => awardPoints(m.userId, guildId, row.content.pointsOnClear)));
    }

    const fullData = await getPartyWithDetails(partyId);
    if (fullData) {
      await refreshPartyMessage(
        { party: { ...fullData.party, status }, content: fullData.content, members: fullData.members, leaderName: fullData.leaderName },
        interaction.client,
      );
    }

    const verb = status === "cleared" ? "Cleared 🎉" : "Disbanded";
    const detail =
      status === "cleared"
        ? `+${row.content.pointsOnClear} points awarded to all ${fullData?.members.length ?? 0} members.`
        : "No points awarded.";

    await interaction.editReply(`**Party #${partyId} — ${verb}**\n${detail}`);
  },
} satisfies Command;
