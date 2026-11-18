// Starlight Courier — the entry handoff (Node 22, standard library only).
//
// The game itself is plain static files under game/ plus screenshots/.
// This program's only job is to hand those files to the grader: it copies
// both folders into the output directory and writes dossier.json, the
// summary the judge reads, using the kit's own library. It runs twice in
// the grader and both runs must produce identical bytes, so it does no
// more than copy and summarise — no timestamps, no randomness.
//
// Local check:
//   rm -rf out && mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function handOver(folder) {
  const source = join(repoRoot, folder);
  const target = join(outputDir, folder);
  if (!existsSync(source)) return;
  mkdirSync(target, { recursive: true });
  cpSync(source, target, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
handOver('game');
handOver('screenshots');

// The gate's caps, as the kit's RULES.txt states them: the dossier text is
// capped at 160 KiB, screenshots at 4 files of 256 KiB each, and game/ at
// 993 entries / 48 MiB with paths under 1000 bytes.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
