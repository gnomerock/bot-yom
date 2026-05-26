import { Events, Client } from "discord.js";
import { setupJobEmojis } from "../utils/jobEmoji";

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client) {
    // Fetch application emojis so jobEmoji() works everywhere
    await client.application?.emojis.fetch();
    setupJobEmojis(client);
    console.log(`Ready! Logged in as ${client.user?.tag}`);
  },
};
