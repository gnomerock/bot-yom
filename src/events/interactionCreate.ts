import { Events, MessageFlags, type Interaction } from "discord.js";
import type { BotClient } from "../types";
import { handleSelectMenu } from "../handlers/selectMenu";
import { handleButton } from "../handlers/button";

const errMsg = { content: "An error occurred.", flags: MessageFlags.Ephemeral };

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
    }
  },
};
