import type { Client } from "discord.js";
import { JOBS, type Job } from "../db/schema";

// 3-char emoji name → full Job name
const JOB_ABBREV: Record<string, Job> = {
  // Tanks
  pld: "Paladin",
  war: "Warrior",
  drk: "Dark Knight",
  gnb: "Gunbreaker",
  // Healers
  whm: "White Mage",
  sch: "Scholar",
  ast: "Astrologian",
  sge: "Sage",
  // Melee DPS
  mnk: "Monk",
  drg: "Dragoon",
  nin: "Ninja",
  sam: "Samurai",
  rpr: "Reaper",
  vpr: "Viper",
  // Physical Ranged DPS
  brd: "Bard",
  mch: "Machinist",
  dnc: "Dancer",
  // Magical Ranged DPS
  blm: "Black Mage",
  smn: "Summoner",
  rdm: "Red Mage",
  pct: "Pictomancer",
  // Limited
  blu: "Blue Mage",
};

// Job name → <:name:id> emoji string (populated at startup)
const emojiMap = new Map<Job, string>();

export function setupJobEmojis(client: Client) {
  const cache = client.application?.emojis.cache;
  if (!cache) return;

  for (const emoji of cache.values()) {
    if (!emoji.name) continue;

    const abbrev = emoji.name.toLowerCase();
    const job = JOB_ABBREV[abbrev];

    if (job) {
      emojiMap.set(
        job,
        emoji.animated
          ? `<a:${emoji.name}:${emoji.id}>`
          : `<:${emoji.name}:${emoji.id}>`,
      );
    }
  }
}

export function jobEmoji(job: Job | string): string {
  return emojiMap.get(job as Job) ?? "";
}
