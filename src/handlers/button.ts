import {
  StringSelectMenuBuilder,
  ActionRowBuilder,
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
  }
}

async function handleJoinButton(interaction: ButtonInteraction, partyId: number) {
  // Verify party is still open and not full before showing job menu
  const [row] = await db
    .select({ party: parties, content })
    .from(parties)
    .innerJoin(content, eq(parties.contentId, content.id))
    .where(and(eq(parties.id, partyId), eq(parties.status, "open")));

  if (!row) {
    await interaction.reply({ content: "This party is no longer open.", ephemeral: true });
    return;
  }

  const [{ value: memberCount }] = await db
    .select({ value: count() })
    .from(partyMembers)
    .where(eq(partyMembers.partyId, partyId));

  if (memberCount >= row.content.requiredPlayers) {
    await interaction.reply({ content: "This party is already full.", ephemeral: true });
    return;
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`join_job_select:${partyId}`)
    .setPlaceholder("Select your job...")
    .addOptions(JOBS.map((job) => ({ label: job, description: JOB_ROLES[job], value: job })));

  await interaction.reply({
    content: `**Joining Party #${partyId}: ${row.content.name}** — Select your job:`,
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
    ephemeral: true,
  });
}
