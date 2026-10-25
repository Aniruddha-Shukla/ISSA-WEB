#!/usr/bin/env node
// Turns the raw photos/posters in content-inbox/ into small, web-ready copies in
// public/images/ (see content-inbox/README.md). Re-running only processes new or
// changed files; pass --force to redo everything.
//
//   npm run content:import
//
// PDFs are unpacked first (needs poppler: `brew install poppler`): the photos embedded
// in events/<Event name>.pdf land in events/<Event name>/ (page 1 is also rendered as
// poster-page-1.png); photos from a PDF in team/ go to team/_pdf-<name>/ to be renamed
// after the people in them (folders starting with "_" are not imported).
//
// Every image is auto-rotated, resized, converted to WebP and stripped of metadata
// (EXIF location data from phones never reaches the public site). A list of what was
// produced is written to content-inbox/.manifest.json.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, relative, sep } from "node:path";
import sharp from "sharp";

const INBOX = "content-inbox";
const OUT = join("public", "images");
const FORCE = process.argv.includes("--force");
const IMAGE = /\.(jpe?g|png|webp|gif|avif|tiff?|heic|heif|svg)$/i;

const rules = {
  logo: { fit: "inside", width: 512, height: 512, quality: 90 },
  team: { fit: "cover", width: 800, height: 800, position: "attention", quality: 80 },
  poster: { fit: "inside", width: 1400, height: 1400, quality: 82 },
  photo: { fit: "inside", width: 1600, height: 1600, quality: 76 },
};

function ruleFor(parts, name) {
  const [top] = parts;
  if (parts.some((p) => p.startsWith("_"))) return null; // staging folders, e.g. team/_pdf-cores
  if (top === "logo") return "logo";
  if (top === "team") return "team";
  if (top === "posters") return "poster";
  if (top === "events" && /poster/i.test(name)) return "poster";
  if (top === "events" || top === "gallery") return "photo";
  return null;
}

const slug = (s) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "image";

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;
const isNewer = async (output, input) => {
  try {
    return (await stat(output)).mtimeMs >= (await stat(input)).mtimeMs;
  } catch {
    return false;
  }
};

let scratch = null;
async function decodable(input) {
  if (!/\.(heic|heif)$/i.test(input)) return input;
  // sharp's prebuilt binaries can't decode iPhone HEIC; macOS's sips can.
  scratch ??= await mkdtemp(join(tmpdir(), "issa-import-"));
  const jpg = join(scratch, `${basename(input, extname(input))}-${Date.now()}.jpg`);
  try {
    execFileSync("sips", ["-s", "format", "jpeg", input, "--out", jpg], { stdio: "ignore" });
  } catch {
    throw new Error("HEIC needs macOS (sips) — export it as JPG instead");
  }
  return jpg;
}

// ---------------------------------------------------------------- PDFs → images
const MIN_SIDE = 300; // smaller embedded images are logos, icons and decorations

function pdfDestination(pdf) {
  const parts = relative(INBOX, pdf).split(sep);
  const name = basename(pdf, extname(pdf));
  if (parts[0] === "team") return join(INBOX, "team", `_pdf-${slug(name)}`);
  return join(dirname(pdf), name);
}

async function unpackPdf(pdf, dest) {
  await mkdir(dest, { recursive: true });
  // Index of every embedded image: keep real pictures, drop masks and tiny artwork.
  const keep = new Set(
    execFileSync("pdfimages", ["-list", pdf], { encoding: "utf8" })
      .split("\n")
      .slice(2)
      .map((line) => line.trim().split(/\s+/))
      .filter(([, num, type, w, h]) => num && type === "image" && Math.min(Number(w), Number(h)) >= MIN_SIDE)
      .map(([, num]) => num.padStart(3, "0")),
  );
  const raw = join(dest, ".raw");
  await rm(raw, { recursive: true, force: true });
  await mkdir(raw);
  // -all keeps JPEGs exactly as embedded (no re-compression).
  execFileSync("pdfimages", ["-all", "-p", pdf, join(raw, "img")]);

  const seen = new Set();
  let photos = 0;
  for (const file of (await readdir(raw)).sort()) {
    const m = file.match(/^img-(\d+)-(\d+)\.(\w+)$/);
    if (!m || !keep.has(m[2])) continue;
    let path = join(raw, file);
    if (m[3] === "jp2") {
      // JPEG 2000: sharp can't read it, macOS's sips can
      const png = path.replace(/\.jp2$/, ".png");
      try {
        execFileSync("sips", ["-s", "format", "png", path, "--out", png], { stdio: "ignore" });
        path = png;
      } catch {
        continue;
      }
    } else if (!/^(jpe?g|png|tiff?)$/i.test(m[3])) continue; // bilevel scans (ccitt/jbig2)
    const hash = createHash("sha1")
      .update(await readFile(path))
      .digest("hex");
    if (seen.has(hash)) continue; // the same picture repeated on several pages
    seen.add(hash);
    photos++;
    await rename(
      path,
      join(dest, `p${String(Number(m[1])).padStart(2, "0")}-${String(photos).padStart(2, "0")}${extname(path)}`),
    );
  }
  await rm(raw, { recursive: true, force: true });

  // Page 1 as an image (often the poster). If nothing usable was embedded (e.g. a
  // fully vector design), render every page instead.
  const firstPage = basename(dest).startsWith("_") ? "page-1" : "poster-page-1";
  const render = (args) =>
    execFileSync("pdftoppm", ["-png", "-r", "150", ...args, pdf, join(dest, args.length ? firstPage : "page")]);
  if (photos) render(["-f", "1", "-l", "1", "-singlefile"]);
  else render([]);
  await writeFile(join(dest, ".from-pdf"), `${relative(INBOX, pdf)}\n`);
  return photos;
}

async function unpackPdfs() {
  const pdfs = [];
  for await (const file of walk(INBOX)) if (/\.pdf$/i.test(file)) pdfs.push(file);
  if (!pdfs.length) return;
  try {
    execFileSync("pdfimages", ["-v"], { stdio: "ignore" });
  } catch {
    throw new Error("Reading PDFs needs poppler — install it with: brew install poppler");
  }
  for (const pdf of pdfs) {
    const dest = pdfDestination(pdf);
    if (!FORCE && (await isNewer(join(dest, ".from-pdf"), pdf))) continue;
    const photos = await unpackPdf(pdf, dest);
    console.log(`PDF ${relative(INBOX, pdf)} → ${relative(INBOX, dest)}/ (${photos} photos)`);
  }
}

await unpackPdfs();

const manifest = [];
const used = new Set();
let made = 0;
let skipped = 0;
let inBytes = 0;
let outBytes = 0;
const problems = [];

for await (const input of walk(INBOX)) {
  const parts = relative(INBOX, input).split(sep);
  const name = parts.at(-1);
  if (parts.length < 2 || !IMAGE.test(name)) continue; // README, csv, txt…
  const rule = ruleFor(parts, name);
  if (!rule) continue;

  const isSvg = /\.svg$/i.test(name);
  const dirParts = parts.slice(0, -1).map(slug);
  let base = slug(basename(name, extname(name)));
  let output = join(OUT, ...dirParts, `${base}.${isSvg ? "svg" : "webp"}`);
  for (let n = 2; used.has(output); n++) output = join(OUT, ...dirParts, `${base}-${n}.${isSvg ? "svg" : "webp"}`);
  used.add(output);
  const url = `/${relative("public", output).split(sep).join("/")}`;

  try {
    if (!FORCE && (await isNewer(output, input))) {
      skipped++;
    } else {
      await mkdir(dirname(output), { recursive: true });
      if (isSvg) {
        await copyFile(input, output);
      } else {
        const { width, height, fit, position, quality } = rules[rule];
        await sharp(await decodable(input), { animated: /\.gif$/i.test(name) })
          .rotate()
          .resize({ width, height, fit, position, withoutEnlargement: fit === "inside" })
          .webp({ quality, effort: 5 })
          .toFile(output);
      }
      made++;
    }
    const before = (await stat(input)).size;
    const after = (await stat(output)).size;
    inBytes += before;
    outBytes += after;
    const meta = isSvg ? {} : await sharp(output).metadata();
    manifest.push({ source: relative(INBOX, input), url, kind: rule, width: meta.width, height: meta.height, bytes: after });
  } catch (error) {
    problems.push(`${relative(INBOX, input)}: ${error.message}`);
  }
}

if (scratch) await rm(scratch, { recursive: true, force: true });
await writeFile(join(INBOX, ".manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

const byKind = Object.groupBy(manifest, (m) => m.kind);
console.log(
  `Images: ${manifest.length} (${made} new or updated, ${skipped} unchanged) — ` +
    Object.entries(byKind)
      .map(([k, v]) => `${v.length} ${k}`)
      .join(", "),
);
if (manifest.length) console.log(`Size: ${kb(inBytes)} of originals → ${kb(outBytes)} on the site`);
for (const p of problems) console.warn(`  ! ${p}`);
if (!manifest.length && !problems.length) console.log(`Nothing to import yet — see ${INBOX}/README.md.`);
process.exitCode = problems.length ? 1 : 0;
