import { REST, Routes } from "discord.js";
import ping from "./commands/ping";
import help from "./commands/help";
import list from "./commands/list";
import create from "./commands/create";
import join from "./commands/join";
import done from "./commands/done";
import edit from "./commands/edit";
import leave from "./commands/leave";
import lb from "./commands/lb";
import view from "./commands/view";
import board from "./commands/board";
import unboard from "./commands/unboard";

const commands = [ping, help, list, create, join, done, edit, leave, lb, view, board, unboard].map((c) => c.data.toJSON());

export async function deployCommands() {
  const rest = new REST().setToken(process.env.DISCORD_TOKEN!);
  const clientId = process.env.DISCORD_CLIENT_ID!;
  const guildId = process.env.DISCORD_GUILD_ID;

  console.log(`Deploying ${commands.length} command(s)...`);

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log(`Commands deployed to guild ${guildId}`);
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log("Commands deployed globally");
  }
}

if (import.meta.main) {
  deployCommands().catch(console.error);
}
