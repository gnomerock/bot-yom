import "dotenv/config";
import { REST, Routes } from "discord.js";
import ping from "./commands/ping";

const commands = [ping].map((c) => c.data.toJSON());

const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

(async () => {
  try {
    console.log(`Deploying ${commands.length} application command(s)...`);

    const guildId = process.env.DISCORD_GUILD_ID;
    const clientId = process.env.DISCORD_CLIENT_ID!;

    if (guildId) {
      // Guild-scoped (instant update, for dev)
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      console.log(`Deployed to guild ${guildId}`);
    } else {
      // Global (up to 1h propagation, for prod)
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log("Deployed globally");
    }
  } catch (error) {
    console.error(error);
  }
})();
