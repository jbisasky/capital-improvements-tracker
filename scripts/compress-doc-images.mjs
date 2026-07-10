#!/usr/bin/env node
/**
 * Compress raster images under docs/ to ≤200 kB.
 * Usage: node scripts/compress-doc-images.mjs [--check]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const MAX_BYTES = 200 * 1024;
const DOCS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "docs");
const IMAGE_PATTERN = /\.(png|jpe?g|webp)$/i;
const QUALITIES = [85, 75, 65, 55, 45, 35];

const checkOnly = process.argv.includes("--check");

function walkImages(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkImages(full, files);
    } else if (IMAGE_PATTERN.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

async function encodeUnderLimit(input) {
  let image = sharp(input);
  const metadata = await image.metadata();
  image = sharp(input).rotate();

  for (const quality of QUALITIES) {
    const buffer = await image.clone().jpeg({ quality, mozjpeg: true }).toBuffer();
    if (buffer.length <= MAX_BYTES) {
      return buffer;
    }
  }

  const width = metadata.width ?? 1280;
  for (const scale of [0.75, 0.6, 0.5, 0.4]) {
    const scaledWidth = Math.max(320, Math.floor(width * scale));
    for (const quality of QUALITIES) {
      const buffer = await image
        .clone()
        .resize({ width: scaledWidth, withoutEnlargement: true })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
      if (buffer.length <= MAX_BYTES) {
        return buffer;
      }
    }
  }

  throw new Error("unable to compress image under 200 kB limit");
}

function formatKb(bytes) {
  return `${String(Math.round(bytes / 1024))} kB`;
}

async function processFile(filePath) {
  const before = fs.statSync(filePath).size;
  if (checkOnly) {
    return { filePath, before, after: before, ok: before <= MAX_BYTES, skipped: true };
  }

  if (before <= MAX_BYTES && filePath.endsWith(".jpg")) {
    return { filePath, before, after: before, ok: true, skipped: true };
  }

  const buffer = await encodeUnderLimit(filePath);
  const jpgPath = filePath.replace(/\.(png|webp|jpe?g)$/i, ".jpg");

  fs.writeFileSync(jpgPath, buffer);
  if (jpgPath !== filePath) {
    fs.unlinkSync(filePath);
  }

  const after = buffer.length;
  return { filePath: jpgPath, before, after, ok: after <= MAX_BYTES, skipped: false };
}

async function main() {
  if (!fs.existsSync(DOCS_DIR)) {
    console.error(`docs directory not found: ${DOCS_DIR}`);
    process.exit(1);
  }

  const files = walkImages(DOCS_DIR);
  const results = await Promise.all(files.map((f) => processFile(f)));

  let failed = false;
  for (const result of results) {
    if (result.skipped && result.ok) {
      if (!checkOnly) {
        console.log(`skip  ${path.relative(DOCS_DIR, result.filePath)} (${formatKb(result.after)})`);
      }
      continue;
    }
    if (result.ok) {
      console.log(
        `ok    ${path.relative(DOCS_DIR, result.filePath)} ${formatKb(result.before)} → ${formatKb(result.after)}`,
      );
    } else {
      console.error(
        `FAIL  ${path.relative(DOCS_DIR, result.filePath)} still ${formatKb(result.after)} (max ${formatKb(MAX_BYTES)})`,
      );
      failed = true;
    }
  }

  if (checkOnly) {
    const oversized = results.filter((r) => !r.ok);
    if (oversized.length > 0) {
      for (const r of oversized) {
        console.error(`oversized: ${path.relative(DOCS_DIR, r.filePath)} (${formatKb(r.before)})`);
      }
      process.exit(1);
    }
    console.log(`check passed: ${String(results.length)} images ≤ ${formatKb(MAX_BYTES)}`);
    return;
  }

  if (failed) {
    process.exit(1);
  }
  console.log(`done: ${String(results.length)} images processed`);
}

await main();
