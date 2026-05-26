import {
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type StringSelectMenuInteraction,
} from "discord.js";
import { db } from "../db";
import { content, parties, partyMembers } from "../db/schema";
import { JOBS, JOB_ROLES, type Job } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { upsertUser, getPartyWithDetails } from "../db/helpers";
import { refreshPartyMessage } from "../utils/partyEmbed";

export async function handleSelectMenu(interaction: StringSelectMenuInteraction) {
  const [action, param] = interaction.customId.split(":");

  if (action === "create_content_select") {
    await handleCreateContentSelect(interaction);
  } else if (action === "create_job_select") {
    await handleCreateJobSelect(interaction, parseInt(param));
  } else if (action === "join_job_select") {
    await handleJoinJobSelect(interaction, parseInt(param));
  }
}

async function handleCreateContentSelect(interaction: StringSelectMenuInteraction) {
  const contentId = parseInt(interaction.values[0]);

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`create_job_select:${contentId}`)
    .setPlaceholder("Select your job...")
    .addOptions(JOBS.map((job) => ({ label: job, description: JOB_ROLES[job], value: job })));

  const backButton = new ButtonBuilder()
    .setCustomId("create_back")
    .setLabel("⬅ Back")
    .setStyle(ButtonStyle.Secondary);

  await interaction.update({
    content: "**Step 2 / 2** — Select your job:",
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu),
      new ActionRowBuilder<ButtonBuilder>().addComponents(backButton),
    ],
  });
}

async function handleCreateJobSelect(
  interaction: StringSelectMenuInteraction,
  contentId: number,
) {
  // No defer — showModal must be the first response
  const job = interaction.values[0] as Job;

  const user = await upsertUser(interaction.user.id, interaction.user.username);

  const [existing] = await db
    .select()
    .from(parties)
    .where(and(eq(parties.leaderId, user.id), eq(parties.status, "open")));

  if (existing) {
    await interaction.update({
      content: `You already have open party #${existing.id}. Use \`/done disband\` to close it first.`,
      components: [],
    });
    return;
  }

  const [selectedContent] = await db.select().from(content).where(eq(content.id, contentId));
  if (!selectedContent) {
    await interaction.update({ content: "Content not found.", components: [] });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`create_modal:${contentId}:${job}`)
    .setTitle(`Create Party — ${selectedContent.name}`)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("description")
          .setLabel("Party Note (optional)")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("e.g. LF exp. players, must know mechanics. Prog-friendly.")
          .setRequired(false)
          .setMaxLength(500),
      ),
    );

  await interaction.showModal(modal);
}

async function handleJoinJobSelect(
  interaction: StringSelectMenuInteraction,
  partyId: number,
) {
  await interaction.deferUpdate();

  const job = interaction.values[0] as Job;

  const user = await upsertUser(interaction.user.id, interaction.user.username);

  const partyData = await getPartyWithDetails(partyId);
  if (!partyData || partyData.party.status !== "open") {
    await interaction.editReply({ content: "This party is no longer open.", components: [] });
    return;
  }

  const [alreadyMember] = await db
    .select()
    .from(partyMembers)
    .where(and(eq(partyMembers.partyId, partyId), eq(partyMembers.userId, user.id)));

  if (alreadyMember) {
    await interaction.editReply({ content: "You're already in this party!", components: [] });
    return;
  }

  if (partyData.members.length >= partyData.content.requiredPlayers) {
    await interaction.editReply({ content: "This party is now full.", components: [] });
    return;
  }

  await db.insert(partyMembers).values({ partyId, userId: user.id, job });

  const updatedData = await getPartyWithDetails(partyId);
  if (updatedData) {
    await refreshPartyMessage(updatedData, interaction.client);
  }

  await interaction.editReply({
    content: `✅ Joined Party #${partyId} as **${job}**!`,
    components: [],
  });
}
