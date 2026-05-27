import {
  MessageFlags,
  type ModalSubmitInteraction,
} from "discord.js";
import { db } from "../db";
import { parties, partyMembers, content, users } from "../db/schema";
import { JOBS, type Job } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { upsertUser, getPartyWithDetails } from "../db/helpers";
import { buildPartyEmbed, refreshPartyMessage } from "../utils/partyEmbed";
import { notifyPartyCreated } from "../utils/webhook";

export async function handleModal(interaction: ModalSubmitInteraction) {
  const parts = interaction.customId.split(":");
  const action = parts[0];

  if (action === "create_modal") {
    await handleCreateModal(interaction);
  } else if (action === "edit_modal") {
    await handleEditModal(interaction, parseInt(parts[1]));
  }
}

/** Fuzzy-match a content name: exact → starts-with → includes (case-insensitive). */
async function resolveContent(query: string) {
  const all = await db.select().from(content);
  const q = query.toLowerCase().trim();
  return (
    all.find((c) => c.name.toLowerCase() === q) ??
    all.find((c) => c.name.toLowerCase().startsWith(q)) ??
    all.find((c) => c.name.toLowerCase().includes(q)) ??
    null
  );
}

/** Fuzzy-match a job name: exact → starts-with → includes (case-insensitive). */
function resolveJob(input: string): Job | null {
  const q = input.toLowerCase().trim();
  return (
    JOBS.find((j) => j.toLowerCase() === q) ??
    JOBS.find((j) => j.toLowerCase().startsWith(q)) ??
    JOBS.find((j) => j.toLowerCase().includes(q)) ??
    null
  );
}

async function handleCreateModal(interaction: ModalSubmitInteraction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const contentInput = interaction.fields.getTextInputValue("content").trim();
  const jobInput = interaction.fields.getTextInputValue("job").trim();
  const description = interaction.fields.getTextInputValue("description").trim() || null;
  const guildId = interaction.guildId!;
  const channelId = interaction.channelId!;

  // Resolve job
  const job = resolveJob(jobInput);
  if (!job) {
    await interaction.editReply(
      `❌ Unknown job **${jobInput}**. Valid jobs: ${JOBS.join(", ")}.`,
    );
    return;
  }

  // Resolve content
  const selectedContent = await resolveContent(contentInput);
  if (!selectedContent) {
    await interaction.editReply(
      `❌ No content matching **${contentInput}** was found. Try a partial name like "Futures" or "DSR".`,
    );
    return;
  }

  const user = await upsertUser(interaction.user.id, interaction.user.username);

  const [existing] = await db
    .select()
    .from(parties)
    .where(and(eq(parties.leaderId, user.id), eq(parties.status, "open")));

  if (existing) {
    await interaction.editReply(
      `You already have open party #${existing.id}. Use \`/done disband\` to close it first.`,
    );
    return;
  }

  const [party] = await db
    .insert(parties)
    .values({
      contentId: selectedContent.id,
      leaderId: user.id,
      guildId,
      channelId,
      status: "open",
      ...(description !== null && { description }),
    })
    .returning();

  await db.insert(partyMembers).values({ partyId: party.id, userId: user.id, job });

  await interaction.editReply(`✅ Party #${party.id} created! Posting announcement…`);

  const partyData = await getPartyWithDetails(party.id);
  if (!partyData) return;

  const { embed, row, attachment } = buildPartyEmbed(partyData);
  const channel = interaction.channel;
  if (channel && !channel.isDMBased() && channel.isTextBased()) {
    const msg = await channel.send({
      embeds: [embed],
      files: [attachment],
      components: row ? [row] : [],
    });
    await db.update(parties).set({ messageId: msg.id }).where(eq(parties.id, party.id));
  }

  await notifyPartyCreated(partyData);
}

async function handleEditModal(interaction: ModalSubmitInteraction, partyId: number) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const description = interaction.fields.getTextInputValue("description").trim() || null;
  const user = await upsertUser(interaction.user.id, interaction.user.username);

  const [row] = await db
    .select()
    .from(parties)
    .where(and(eq(parties.id, partyId), eq(parties.leaderId, user.id), eq(parties.status, "open")));

  if (!row) {
    await interaction.editReply("Party not found or you're not the leader of an open party.");
    return;
  }

  await db
    .update(parties)
    .set({ description, updatedAt: new Date() })
    .where(eq(parties.id, partyId));

  const updated = await getPartyWithDetails(partyId);
  if (updated) {
    await refreshPartyMessage(updated, interaction.client);
  }

  await interaction.editReply(`✅ Party #${partyId} description updated.`);
}
