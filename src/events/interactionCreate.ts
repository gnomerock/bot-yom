import { Events, type Interaction } from "discord.js";
import type { BotClient } from "../types";
import { handleSelectMenu } from "../handlers/selectMenu";
import { handleButton } from "../handlers/button";

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
        console.error(error);
        const msg = { content: "An error occurred while running this command.", ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg);
        } else {
          await interaction.reply(msg);
        }
      }
    } else if (interaction.isStringSelectMenu()) {
      try {
        await handleSelectMenu(interaction);
      } catch (error) {
        console.error(error);
        const msg = { content: "An error occurred.", ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg);
        } else {
          await interaction.reply(msg);
        }
      }
    } else if (interaction.isButton()) {
      try {
        await handleButton(interaction);
      } catch (error) {
        console.error(error);
        const msg = { content: "An error occurred.", ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg);
        } else {
          await interaction.reply(msg);
        }
      }
    }
  },
};
