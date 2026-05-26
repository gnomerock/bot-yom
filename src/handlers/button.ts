import {
  StringSelectMenuBuilder,
  ActionRowBuilder,
  MessageFlags,
  type ButtonInteraction,
} from "discord.js";
import { db } from "../db";
import { parties, partyMembers, content } from "../db/schema";
import { JOBS, JOB_ROLES } from "../db/schema";
import { eq, and, count } from "drizzle-orm";

export async function handleButton(interaction: ButtonInteraction) {
  const [action, param] = interaction.customId.split(":");

  if (action === "join") {
    await handleJoinButton(interaction, parseInt(param));
  } else if (action === "create_back") {
    await handleCreateBackButton(interaction);
  }
}

async function handleJoinButton(interaction: ButtonInteraction, partyId: number) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const [row] = await db
    .select({ party: parties, content })
    .from(parties)
    .innerJoin(content, eq(parties.contentId, content.id))
    .where(and(eq(parties.id, partyId), eq(parties.status, "open")));

  if (!row) {
    await interaction.editReply("This party is no longer open.");
    return;
  }

  const [{ value: memberCount }] = await db
    .select({ value: count() })
    .from(partyMembers)
    .where(eq(partyMembers.partyId, partyId));

  if (memberCount >= row.content.requiredPlayers) {
    await interaction.editReply("This party is already full.");
    return;
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`join_job_select:${partyId}`)
    .setPlaceholder("Select your job...")
    .addOptions(JOBS.map((job) => ({ label: job, description: JOB_ROLES[job], value: job })));

  await interaction.editReply({
    content: `**Joining Party #${partyId}: ${row.content.name}** — Select your job:`,
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
  });
}

async function handleCreateBackButton(interaction: ButtonInteraction) {
  const allContent = await db.select().from(content);

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

  await interaction.update({
    content: "**Step 1 / 2** — Select the content for your party:",
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
  });
}
