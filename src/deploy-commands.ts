import { REST, Routes } from "discord.js";
import ping from "./commands/ping";

const commands = [ping].map((c) => c.data.toJSON());

export async function deployCommands() {
  const rest = new REST().setToken(process.env.DISCORD_TOKEN!);
  const clientId = process.env.DISCORD_CLIENT_ID!;
  const guildId = process.env.DISCORD_GUILD_ID;

  console.log(`Deploying ${commands.length} application command(s)...`);

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log(`Deployed to guild ${guildId}`);
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log("Deployed globally");
  }
}

// Support running standalone: bun run src/deploy-commands.ts
if (import.meta.main) {
  deployCommands().catch(console.error);
}
