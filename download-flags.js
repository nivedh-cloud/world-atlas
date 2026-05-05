import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const countriesJson = JSON.parse(
  fs.readFileSync("./src/data/countries.json", "utf-8")
);
const flagsDir = path.join(__dirname, "public", "flags");

// Ensure flags directory exists
if (!fs.existsSync(flagsDir)) {
  fs.mkdirSync(flagsDir, { recursive: true });
}

let downloaded = 0;
let failed = 0;
const failedFlags = [];

// Simple emoji flag generator as fallback
const generateFlagSvg = (countryCode) => {
  const codePoints = Array.from(countryCode.toUpperCase())
    .map((char) => 0x1f1e6 + char.charCodeAt(0) - 65)
    .map((codePoint) => String.fromCodePoint(codePoint))
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="320" height="240">
    <defs>
      <style>
        text { font-family: "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif; }
      </style>
    </defs>
    <rect width="320" height="240" fill="#f5f5f5" stroke="#ddd" stroke-width="1"/>
    <text x="160" y="160" font-size="100" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="#000">
      ${codePoints}
    </text>
  </svg>`;
};

const downloadFlag = (code) => {
  return new Promise((resolve) => {
    const flagPath = path.join(flagsDir, `${code.toLowerCase()}.svg`);

    // Skip if already exists
    if (fs.existsSync(flagPath)) {
      console.log(`✓ ${code} (cached)`);
      downloaded++;
      resolve();
      return;
    }

    // Try flagpedia API first
    const url = `https://flagcdn.com/w320/${code.toLowerCase()}.svg`;

    https
      .get(url, { timeout: 5000 }, (response) => {
        if (response.statusCode === 200) {
          const file = fs.createWriteStream(flagPath);
          response.pipe(file);
          file.on("finish", () => {
            file.close();
            console.log(`✓ ${code}`);
            downloaded++;
            resolve();
          });
          file.on("error", (err) => {
            fs.unlink(flagPath, () => {});
            // Fallback to emoji flag
            fs.writeFileSync(flagPath, generateFlagSvg(code), "utf-8");
            console.log(`✓ ${code} (emoji)`);
            downloaded++;
            resolve();
          });
        } else {
          // Fallback to emoji flag for 404
          fs.writeFileSync(flagPath, generateFlagSvg(code), "utf-8");
          console.log(`✓ ${code} (emoji)`);
          downloaded++;
          resolve();
        }
      })
      .on("error", (err) => {
        // Fallback to emoji flag
        fs.writeFileSync(flagPath, generateFlagSvg(code), "utf-8");
        console.log(`✓ ${code} (emoji)`);
        downloaded++;
        resolve();
      });
  });
};

const downloadAllFlags = async () => {
  console.log(`Processing ${countriesJson.length} flag SVGs...\n`);

  // Download with concurrency limit (10 at a time)
  const batchSize = 10;
  for (let i = 0; i < countriesJson.length; i += batchSize) {
    const batch = countriesJson.slice(i, i + batchSize);
    await Promise.all(batch.map((country) => downloadFlag(country.code)));
  }

  console.log(
    `\n\nDone! Processed: ${downloaded}/${countriesJson.length}`
  );
};

downloadAllFlags();
