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

// Role → emoji component data for buttons (populated at startup)
const roleEmojiMap = new Map<string, { id: string; name: string }>();

export function setupJobEmojis(client: Client) {
  const cache = client.application?.emojis.cache;
  if (!cache) return;

  for (const emoji of cache.values()) {
    if (!emoji.name || !emoji.id) continue;
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

    // Role emojis for buttons
    if (name === "tank" || name === "healer" || name === "dps") {
      roleEmojiMap.set(name, { id: emoji.id, name: emoji.name });
    }
  }
}

export function roleEmojiForButton(role: "tank" | "healer" | "dps"): { id: string; name: string } | undefined {
  return roleEmojiMap.get(role);
}

const ROLE_EMOJI_FALLBACK: Record<string, string> = { tank: "🛡", healer: "💚", dps: "⚔" };

export function roleEmojiString(role: "tank" | "healer" | "dps"): string {
  const e = roleEmojiMap.get(role);
  return e ? `<:${e.name}:${e.id}>` : ROLE_EMOJI_FALLBACK[role];
}

export function jobEmoji(job: Job | string): string {
  return emojiMap.get(job as Job) ?? "";
}

// Normalize type aliases before emoji lookup
const CONTENT_TYPE_ALIASES: Record<string, ContentType> = {
  "highend": "high-end",
};

export function contentTypeEmoji(type: ContentType | string): string {
  const normalized = (CONTENT_TYPE_ALIASES[type as string] ?? type) as ContentType;
  // Only fall back to raid emoji when the type IS raid (or unrecognised non-highend types)
  if (normalized === "high-end") {
    return contentEmojiMap.get("high-end") ?? "⚔️";
  }
  return contentEmojiMap.get("raid") ?? "⚔️";
}
