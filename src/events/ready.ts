import { Events, Client } from "discord.js";
import { join } from "node:path";
import { setupJobEmojis } from "../utils/jobEmoji";

const publicDir = join(import.meta.dir, "../..", "public");

const ROLE_EMOJI_FILES = [
  { name: "tank",   file: "tank.png" },
  { name: "healer", file: "healer.png" },
  { name: "dps",    file: "dps.png" },
] as const;

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client) {
    await client.application?.emojis.fetch();

    // Auto-create role emojis from public/jobs/ if not yet uploaded
    const existingNames = new Set(
      client.application?.emojis.cache.map((e) => e.name?.toLowerCase()) ?? [],
    );
    for (const { name, file } of ROLE_EMOJI_FILES) {
      if (!existingNames.has(name)) {
        try {
          await client.application?.emojis.create({
            attachment: join(publicDir, "jobs", file),
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
