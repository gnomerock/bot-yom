import "dotenv/config";
import { Client, Collection, GatewayIntentBits } from "discord.js";
import type { BotClient, Command } from "./types";
import ping from "./commands/ping";
import ready from "./events/ready";
import interactionCreate from "./events/interactionCreate";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
}) as BotClient;

client.commands = new Collection<string, Command>();

// Register commands
for (const command of [ping]) {
  client.commands.set(command.data.name, command);
}

// Register events
for (const event of [ready, interactionCreate]) {
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args as [never]));
  } else {
    client.on(event.name, (...args) => event.execute(...args as [never]));
  }
}

client.login(process.env.DISCORD_TOKEN);
