import { Events, Client } from "discord.js";
import { join } from "node:path";
import { readdirSync } from "node:fs";
import { setupJobEmojis } from "../utils/jobEmoji";

const jobsDir = join(import.meta.dir, "../..", "public", "jobs");

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client) {
    await client.application?.emojis.fetch();

    // Auto-create any missing application emojis from public/jobs/*.png
    const existingNames = new Set(
      client.application?.emojis.cache.map((e) => e.name?.toLowerCase()) ?? [],
    );
    const files = readdirSync(jobsDir).filter((f) => f.endsWith(".png"));
    for (const file of files) {
      const name = file.replace(".png", "");
      if (!existingNames.has(name)) {
        try {
          await client.application?.emojis.create({
            attachment: join(jobsDir, file),
            name,
          });
        } catch (err) {
          console.error(`Failed to create application emoji "${name}":`, err);
        }
      }
    }

    // Re-fetch so newly created emojis are in cache
    await client.application?.emojis.fetch();
    setupJobEmojis(client);
    console.log(`Ready! Logged in as ${client.user?.tag}`);
  },
};
