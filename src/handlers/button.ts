import {
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  type ButtonInteraction,
} from "discord.js";
import { db } from "../db";
import { parties, partyMembers, users, content } from "../db/schema";
import { JOBS, JOB_ROLES } from "../db/schema";
import { eq, and, count } from "drizzle-orm";
import { upsertUser, getPartyWithDetails, awardPoints } from "../db/helpers";
import { refreshAllPartyMessages } from "../utils/board";

type JoinRole = "tank" | "healer" | "dps";

const ROLE_JOBS: Record<JoinRole, string[]> = {
  tank: JOBS.filter((j) => JOB_ROLES[j] === "Tank"),
  healer: JOBS.filter((j) => JOB_ROLES[j] === "Healer"),
  dps: JOBS.filter((j) => !["Tank", "Healer"].includes(JOB_ROLES[j])),
};

export async function handleButton(interaction: ButtonInteraction) {
  const parts = interaction.customId.split(":");
  const action = parts[0];

  if (action === "join_role") {
    await handleJoinRoleButton(interaction, parseInt(parts[1]), parts[2] as JoinRole);
  } else if (action === "party_edit") {
    await handlePartyEditButton(interaction, parseInt(parts[1]));
  } else if (action === "party_clear") {
    await handlePartyClearButton(interaction, parseInt(parts[1]));
  } else if (action === "party_disband") {
    await handlePartyDisbandButton(interaction, parseInt(parts[1]));
  } else if (action === "party_leave") {
    await handlePartyLeaveButton(interaction, parseInt(parts[1]));
  }
}

// ── Join by role ─────────────────────────────────────────────────────────────

async function handleJoinRoleButton(
  interaction: ButtonInteraction,
  partyId: number,
  role: JoinRole,
) {
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

  const user = await upsertUser(interaction.user.id, interaction.user.username);
  const [alreadyMember] = await db
    .select()
    .from(partyMembers)
    .where(and(eq(partyMembers.partyId, partyId), eq(partyMembers.userId, user.id)));

  if (alreadyMember) {
    await interaction.editReply("You're already in this party!");
    return;
  }

  const jobs = ROLE_JOBS[role] ?? JOBS;
  const roleLabel = role === "tank" ? "Tank" : role === "healer" ? "Healer" : "DPS";

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`join_role_job:${partyId}`)
    .setPlaceholder(`Select your ${roleLabel} job…`)
    .addOptions(jobs.map((job) => ({ label: job, description: JOB_ROLES[job as keyof typeof JOB_ROLES], value: job })));

  await interaction.editReply({
    content: `**Joining Party #${partyId}: ${row.content.name}** — Select your ${roleLabel} job:`,
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
  });
}

// ── Edit (leader only) ───────────────────────────────────────────────────────

async function handlePartyEditButton(interaction: ButtonInteraction, partyId: number) {
  // Must show modal as first response — quick DB check before it
  const [party] = await db.select().from(parties).where(eq(parties.id, partyId));

  if (!party || party.status !== "open") {
    await interaction.reply({ content: "This party is no longer open.", flags: MessageFlags.Ephemeral });
    return;
  }

  const [user] = await db.select().from(users).where(eq(users.discordId, interaction.user.id));

  if (!user || user.id !== party.leaderId) {
    await interaction.reply({ content: "Only the party leader can edit this party.", flags: MessageFlags.Ephemeral });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`edit_modal:${partyId}`)
    .setTitle(`Edit Party #${partyId}`)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("description")
          .setLabel("Party Note (optional)")
          .setStyle(TextInputStyle.Paragraph)
          .setValue(party.description ?? "")
          .setPlaceholder("e.g. LF exp. players, must know mechanics. Prog-friendly.")
          .setRequired(false)
          .setMaxLength(500),
      ),
    );

  await interaction.showModal(modal);
}

// ── Clear (leader only) ──────────────────────────────────────────────────────

async function handlePartyClearButton(interaction: ButtonInteraction, partyId: number) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const user = await upsertUser(interaction.user.id, interaction.user.username);

  const [row] = await db
    .select({ party: parties, content })
    .from(parties)
    .innerJoin(content, eq(parties.contentId, content.id))
    .where(and(eq(parties.id, partyId), eq(parties.status, "open")));

  if (!row) {
    await interaction.editReply("Party not found or already closed.");
    return;
  }

  if (row.party.leaderId !== user.id) {
    await interaction.editReply("Only the party leader can clear this party.");
    return;
  }

  const [{ value: memberCount }] = await db
    .select({ value: count() })
    .from(partyMembers)
    .where(eq(partyMembers.partyId, partyId));

  if (memberCount < row.content.requiredPlayers) {
    await interaction.editReply(
      `Cannot clear — party needs **${row.content.requiredPlayers} members** but only has **${memberCount}**. Fill all slots first or use Disband.`,
    );
    return;
  }

  await db.update(parties).set({ status: "cleared", updatedAt: new Date() }).where(eq(parties.id, partyId));

  const members = await db.select().from(partyMembers).where(eq(partyMembers.partyId, partyId));
  await Promise.all(members.map((m) => awardPoints(m.userId, row.party.guildId, row.content.pointsOnClear)));

  const fullData = await getPartyWithDetails(partyId);
  if (fullData) {
    await refreshAllPartyMessages(
      { party: { ...fullData.party, status: "cleared" }, content: fullData.content, members: fullData.members, leaderName: fullData.leaderName, leaderDiscordId: fullData.leaderDiscordId },
      interaction.client,
    );
  }

  await interaction.editReply(
    `🎉 **Party #${partyId} cleared!** +${row.content.pointsOnClear} points awarded to all ${memberCount} members.`,
  );
}

// ── Leave (member only, not leader) ─────────────────────────────────────────

async function handlePartyLeaveButton(interaction: ButtonInteraction, partyId: number) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const user = await upsertUser(interaction.user.id, interaction.user.username);

  const [party] = await db
    .select()
    .from(parties)
    .where(and(eq(parties.id, partyId), eq(parties.status, "open")));

  if (!party) {
    await interaction.editReply("Party not found or already closed.");
    return;
  }

  if (party.leaderId === user.id) {
    await interaction.editReply("You're the party leader — use **Disband** to close the party instead.");
    return;
  }

  const [membership] = await db
    .select()
    .from(partyMembers)
    .where(and(eq(partyMembers.partyId, partyId), eq(partyMembers.userId, user.id)));

  if (!membership) {
    await interaction.editReply("You're not in this party.");
    return;
  }

  await db.delete(partyMembers).where(and(eq(partyMembers.partyId, partyId), eq(partyMembers.userId, user.id)));

  const fullData = await getPartyWithDetails(partyId);
  if (fullData) {
    await refreshAllPartyMessages(fullData, interaction.client);
  }

  await interaction.editReply(`You've left **Party #${partyId}**.`);
}

// ── Disband (leader only) ────────────────────────────────────────────────────

async function handlePartyDisbandButton(interaction: ButtonInteraction, partyId: number) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const user = await upsertUser(interaction.user.id, interaction.user.username);

  const [party] = await db
    .select()
    .from(parties)
    .where(and(eq(parties.id, partyId), eq(parties.status, "open")));

  if (!party) {
    await interaction.editReply("Party not found or already closed.");
    return;
  }

  if (party.leaderId !== user.id) {
    await interaction.editReply("Only the party leader can disband this party.");
    return;
  }

  await db.update(parties).set({ status: "disbanded", updatedAt: new Date() }).where(eq(parties.id, partyId));

  const fullData = await getPartyWithDetails(partyId);
  if (fullData) {
    await refreshAllPartyMessages(
      { party: { ...fullData.party, status: "disbanded" }, content: fullData.content, members: fullData.members, leaderName: fullData.leaderName, leaderDiscordId: fullData.leaderDiscordId },
      interaction.client,
    );
  }

  await interaction.editReply(`**Party #${partyId} disbanded.** No points awarded.`);
}
