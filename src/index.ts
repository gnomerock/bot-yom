import { Client, Collection, GatewayIntentBits } from "discord.js";
import type { BotClient, Command } from "./types";
import ping from "./commands/ping";
import ready from "./events/ready";
import interactionCreate from "./events/interactionCreate";
import { deployCommands } from "./deploy-commands";

// Health check server required by Fly.io
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

  for (const command of [ping]) {
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
