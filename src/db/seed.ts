// Run with: bun run src/db/seed.ts
// Seeds the content table with Dawntrail FFXIV content.
// Safe to re-run — skips entries that already exist by name.

import { db } from ".";
import { content } from "./schema";
import { eq } from "drizzle-orm";

const SEED_CONTENT = [
  // ── Normal Raids ───────────────────────────────────────────────────────────
  { name: "AAC Light-heavyweight M1", type: "raid" as const, requiredPlayers: 8, description: "Arcadion: Light-heavyweight M1 (Normal)", pointsOnClear: 100 },
  { name: "AAC Light-heavyweight M2", type: "raid" as const, requiredPlayers: 8, description: "Arcadion: Light-heavyweight M2 (Normal)", pointsOnClear: 100 },
  { name: "AAC Light-heavyweight M3", type: "raid" as const, requiredPlayers: 8, description: "Arcadion: Light-heavyweight M3 (Normal)", pointsOnClear: 100 },
  { name: "AAC Light-heavyweight M4", type: "raid" as const, requiredPlayers: 8, description: "Arcadion: Light-heavyweight M4 (Normal)", pointsOnClear: 100 },
  { name: "AAC Cruiserweight M5", type: "raid" as const, requiredPlayers: 8, description: "Arcadion: Cruiserweight M5 (Normal)", pointsOnClear: 100 },
  { name: "AAC Cruiserweight M6", type: "raid" as const, requiredPlayers: 8, description: "Arcadion: Cruiserweight M6 (Normal)", pointsOnClear: 100 },
  { name: "AAC Cruiserweight M7", type: "raid" as const, requiredPlayers: 8, description: "Arcadion: Cruiserweight M7 (Normal)", pointsOnClear: 100 },
  { name: "AAC Cruiserweight M8", type: "raid" as const, requiredPlayers: 8, description: "Arcadion: Cruiserweight M8 (Normal)", pointsOnClear: 100 },
  // ── Savage Raids ───────────────────────────────────────────────────────────
  { name: "AAC Light-heavyweight M1S", type: "high-end" as const, requiredPlayers: 8, description: "Arcadion: Light-heavyweight M1 (Savage)", pointsOnClear: 500 },
  { name: "AAC Light-heavyweight M2S", type: "high-end" as const, requiredPlayers: 8, description: "Arcadion: Light-heavyweight M2 (Savage)", pointsOnClear: 500 },
  { name: "AAC Light-heavyweight M3S", type: "high-end" as const, requiredPlayers: 8, description: "Arcadion: Light-heavyweight M3 (Savage)", pointsOnClear: 500 },
  { name: "AAC Light-heavyweight M4S", type: "high-end" as const, requiredPlayers: 8, description: "Arcadion: Light-heavyweight M4 (Savage)", pointsOnClear: 500 },
  { name: "AAC Cruiserweight M5S", type: "high-end" as const, requiredPlayers: 8, description: "Arcadion: Cruiserweight M5 (Savage)", pointsOnClear: 750 },
  { name: "AAC Cruiserweight M6S", type: "high-end" as const, requiredPlayers: 8, description: "Arcadion: Cruiserweight M6 (Savage)", pointsOnClear: 750 },
  { name: "AAC Cruiserweight M7S", type: "high-end" as const, requiredPlayers: 8, description: "Arcadion: Cruiserweight M7 (Savage)", pointsOnClear: 750 },
  { name: "AAC Cruiserweight M8S", type: "high-end" as const, requiredPlayers: 8, description: "Arcadion: Cruiserweight M8 (Savage)", pointsOnClear: 750 },
  // ── Ultimates ──────────────────────────────────────────────────────────────
  { name: "The Omega Protocol (Ultimate)", type: "high-end" as const, requiredPlayers: 8, description: "TOP — The Omega Protocol", pointsOnClear: 2000 },
  { name: "Dragonsong's Reprise (Ultimate)", type: "high-end" as const, requiredPlayers: 8, description: "DSR — Dragonsong's Reprise", pointsOnClear: 2000 },
  { name: "Futures Rewritten (Ultimate)", type: "high-end" as const, requiredPlayers: 8, description: "FRU — Futures Rewritten", pointsOnClear: 2000 },
  // ── Chaotic ────────────────────────────────────────────────────────────────
  { name: "Cloud of Darkness (Chaotic)", type: "high-end" as const, requiredPlayers: 24, description: "The Cloud of Darkness (Chaotic Alliance Raid)", pointsOnClear: 800 },
];

const existing = await db.select({ name: content.name }).from(content);
const existingNames = new Set(existing.map((r) => r.name));

const toInsert = SEED_CONTENT.filter((c) => !existingNames.has(c.name));

if (toInsert.length === 0) {
  console.log("All content already seeded, nothing to add.");
} else {
  await db.insert(content).values(toInsert);
  console.log(`Seeded ${toInsert.length} content entries.`);
}

process.exit(0);
