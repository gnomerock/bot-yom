import type { Client } from "discord.js";
import { JOBS, type Job } from "../db/schema";

// Job name → <:name:id> emoji string (populated at startup)
const emojiMap = new Map<Job, string>();

export function setupJobEmojis(client: Client) {
  const cache = client.application?.emojis.cache;
  if (!cache) return;

  for (const emoji of cache.values()) {
    if (!emoji.name) continue;

    // Extract job name from e.g. "Paladin_Icon_10_5" → "Paladin"
    // or "Dark_Knight_Icon_10_5" → "Dark Knight"
    const namePart = emoji.name.replace(/_Icon.*$/i, "").replace(/_/g, " ").trim();

    const job = JOBS.find(
      (j) => j.toLowerCase() === namePart.toLowerCase(),
    );

    if (job) {
      emojiMap.set(job, emoji.animated ? `<a:${emoji.name}:${emoji.id}>` : `<:${emoji.name}:${emoji.id}>`);
    }
  }
}

export function jobEmoji(job: Job | string): string {
  return emojiMap.get(job as Job) ?? "";
}
