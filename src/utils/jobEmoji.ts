import type { Client } from "discord.js";
import { JOBS, type Job, type ContentType } from "../db/schema";

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

// Content type emoji name → ContentType
const CONTENT_EMOJI_NAMES: Record<string, ContentType> = {
  raid: "raid",
  high_end: "high-end",
  highend: "high-end",
};

// Job name → <:name:id> emoji string (populated at startup)
const emojiMap = new Map<Job, string>();

// ContentType → <:name:id> emoji string (populated at startup)
const contentEmojiMap = new Map<ContentType, string>();

export function setupJobEmojis(client: Client) {
  const cache = client.application?.emojis.cache;
  if (!cache) return;

  for (const emoji of cache.values()) {
    if (!emoji.name) continue;
    const name = emoji.name.toLowerCase();
    const str = emoji.animated
      ? `<a:${emoji.name}:${emoji.id}>`
      : `<:${emoji.name}:${emoji.id}>`;

    // Job emojis
    const job = JOB_ABBREV[name];
    if (job) emojiMap.set(job, str);

    // Content type emojis
    const contentType = CONTENT_EMOJI_NAMES[name];
    if (contentType) contentEmojiMap.set(contentType, str);
  }
}

export function jobEmoji(job: Job | string): string {
  return emojiMap.get(job as Job) ?? "";
}

/** Returns the emoji for a content type, falling back to the "raid" emoji or a default. */
export function contentTypeEmoji(type: ContentType | string): string {
  return (
    contentEmojiMap.get(type as ContentType) ??
    contentEmojiMap.get("raid") ??
    "⚔️"
  );
}
