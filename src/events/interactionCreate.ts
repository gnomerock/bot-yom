import { Events, MessageFlags, type Interaction } from "discord.js";
import type { BotClient } from "../types";
import { handleSelectMenu } from "../handlers/selectMenu";
import { handleButton } from "../handlers/button";
import { handleModal } from "../handlers/modal";
import { db } from "../db";
import { content } from "../db/schema";

const errMsg = { content: "An error occurred.", flags: MessageFlags.Ephemeral };

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const RAID_TIMES = [
  "15:00", "16:00", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30",
  "20:00", "20:30", "21:00", "21:30",
  "22:00", "22:30", "23:00", "23:30",
];

function generateDateSuggestions() {
  const now = new Date();
  const suggestions = [];

  for (let i = 0; i < 14; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i));
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const value = `${yyyy}-${mm}-${dd}`;

    const dayName = DAY_NAMES[d.getUTCDay()];
    const monthName = MONTH_NAMES[d.getUTCMonth()];
    const prefix = i === 0 ? "Today" : i === 1 ? "Tomorrow" : dayName;
    const name = `${prefix} — ${dayName.slice(0, 3)}, ${monthName} ${d.getUTCDate()}`;

    suggestions.push({ name, value });
  }

  return suggestions;
}

async function safeReply(interaction: any, error: unknown) {
  console.error(error);
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errMsg);
    } else {
      await interaction.reply(errMsg);
    }
  } catch {}
}

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    if (interaction.isChatInputCommand()) {
      const client = interaction.client as BotClient;
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        console.error(`Unknown command: ${interaction.commandName}`);
        return;
      }
      try {
        await command.execute(interaction);
      } catch (error) {
        await safeReply(interaction, error);
      }
    } else if (interaction.isStringSelectMenu()) {
      try {
        await handleSelectMenu(interaction);
      } catch (error) {
        await safeReply(interaction, error);
      }
    } else if (interaction.isButton()) {
      try {
        await handleButton(interaction);
      } catch (error) {
        await safeReply(interaction, error);
      }
    } else if (interaction.isModalSubmit()) {
      try {
        await handleModal(interaction);
      } catch (error) {
        await safeReply(interaction, error);
      }
    } else if (interaction.isAutocomplete()) {
      try {
        if (interaction.commandName === "create") {
          const focused = interaction.options.getFocused(true);
          const query = focused.value.toLowerCase();

          if (focused.name === "content") {
            const allContent = await db.select().from(content);
            const filtered = allContent
              .filter((c) => c.name.toLowerCase().includes(query))
              .slice(0, 25);
            await interaction.respond(
              filtered.map((c) => ({
                name: `${c.name} · ${c.type === "high-end" ? "High-End" : "Raid"} · ${c.requiredPlayers}p`,
                value: String(c.id),
              })),
            );

          } else if (focused.name === "date") {
            const suggestions = generateDateSuggestions();
            const filtered = suggestions
              .filter((s) => s.name.toLowerCase().includes(query) || s.value.includes(query))
              .slice(0, 25);
            await interaction.respond(filtered);

          } else if (focused.name === "time") {
            const filtered = RAID_TIMES
              .filter((t) => t.startsWith(focused.value))
              .map((t) => ({ name: `${t} UTC`, value: t }))
              .slice(0, 25);
            await interaction.respond(filtered);
          }
        }
      } catch (error) {
        console.error(error);
      }
    }
  },
};
