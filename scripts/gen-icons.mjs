// Generate PNG icons from icon.svg at sizes 16, 32, 48, 128
import sharp from "sharp";
import { readFileSync, mkdirSync, writeFileSync, copyFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const svgPath = join(root, "icon.svg");
const outDirs = [
  join(root, "public", "icons"),
  join(root, "src", "assets", "icons"),
];
const sizes = [16, 32, 48, 128];

const svg = readFileSync(svgPath);

for (const dir of outDirs) {
  mkdirSync(dir, { recursive: true });
}

for (const size of sizes) {
  // Render at 2x then downscale for crisper small sizes
  const buf = await sharp(svg, { density: Math.max(72, size * 4) })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();

  for (const dir of outDirs) {
    const out = join(dir, `${size}.png`);
    writeFileSync(out, buf);
    console.log("✓", out, `(${buf.length} bytes)`);
  }
}

console.log("\nDone. Run ./build.sh to bundle into dist/.");
