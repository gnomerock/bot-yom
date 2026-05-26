import { Client, Collection, GatewayIntentBits } from "discord.js";
import type { BotClient, Command } from "./types";
import ping from "./commands/ping";
import help from "./commands/help";
import list from "./commands/list";
import create from "./commands/create";
import join from "./commands/join";
import done from "./commands/done";
import lb from "./commands/lb";
import ready from "./events/ready";
import interactionCreate from "./events/interactionCreate";
import { deployCommands } from "./deploy-commands";

// Health check server for Fly.io
Bun.serve({
  port: parseInt(process.env.PORT || "8080", 10),
  fetch() {
    return new Response("ok");
  },
});

async function startBot() {
  await deployCommands();

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  }) as BotClient;

  client.commands = new Collection<string, Command>();

  for (const command of [ping, help, list, create, join, done, lb]) {
    client.commands.set(command.data.name, command);
  }

  for (const event of [ready, interactionCreate]) {
    const name = event.name as any;
    const handler = (...args: unknown[]) =>
      (event.execute as (...a: unknown[]) => unknown)(...args);
    if ("once" in event && event.once) {
      client.once(name, handler);
    } else {
      client.on(name, handler);
    }
  }

  await client.login(process.env.DISCORD_TOKEN);
}

startBot().catch(console.error);
