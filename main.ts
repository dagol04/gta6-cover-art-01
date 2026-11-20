// Sunset Cover Studio — hand-in program for the gta6-cover-art-01 bounty.
// Node 22, standard library only. Copies this repo's app/ and screenshots/
// into the output directory and writes /output/dossier.json using the
// vendored make.fun library (the summary the judge reads).
//
// Try the app first with `node serve.ts`, then open http://localhost:8080.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// These caps mirror the scorer's own (see the kit's RULES.txt, "The gate"):
// the dossier text is capped at 160 KiB, at most 4 screenshots of 256 KiB
// each, and app/ stays within 993 files and 48 MiB in all.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

/** Stages the entry's app/ and screenshots/ into a fresh output directory. */
function stageFiles(rootDir, outputDir) {
  mkdirSync(outputDir, { recursive: true });
  cpSync(join(rootDir, 'app'), join(outputDir, 'app'), { recursive: true });
  mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
  if (existsSync(join(rootDir, 'screenshots'))) {
    cpSync(join(rootDir, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
  }
}

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

stageFiles(rootDir, outputDir);
writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, DOSSIER_CAPS));
