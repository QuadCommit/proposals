/* ============================================================
   generate-pdf.mjs — Export a proposal to PDF
   Proposal Engine · QuadCommit

   Usage:
     npm run pdf                 -> data/scarling.json -> pdf/scarling.pdf
     npm run pdf -- other-client -> data/other-client.json -> pdf/other-client.pdf

   The script serves the repository locally, opens the proposal
   with Playwright (Edge by default), waits for fonts and data,
   and prints it using assets/css/print.css.
   ============================================================ */

import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const slug = (process.argv[2] || "scarling").trim().toLowerCase();

if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error("Invalid proposal slug: " + slug);
  process.exit(1);
}

const outputPath = path.resolve(ROOT, process.argv[3] || path.join("pdf", slug + ".pdf"));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8"
};

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url, "http://127.0.0.1");
      let pathname = decodeURIComponent(requestUrl.pathname);
      if (pathname.endsWith("/")) pathname += "index.html";

      const filePath = path.resolve(ROOT, "." + pathname);
      if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
        res.writeHead(403).end("Forbidden");
        return;
      }

      const body = await fs.readFile(filePath);
      res.writeHead(200, {
        "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-store"
      });
      res.end(req.method === "HEAD" ? undefined : body);
    } catch {
      res.writeHead(404).end("Not found");
    }
  });
}

async function launchBrowser() {
  const channels = process.env.PLAYWRIGHT_CHANNEL
    ? [process.env.PLAYWRIGHT_CHANNEL]
    : ["msedge", "chrome", null];

  let lastError;
  for (const channel of channels) {
    try {
      return await chromium.launch(channel ? { channel, headless: true } : { headless: true });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

const server = createServer();
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

const port = server.address().port;
let browser;

try {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  await page.goto("http://127.0.0.1:" + port + "/?p=" + encodeURIComponent(slug), {
    waitUntil: "domcontentloaded",
    timeout: 60000
  });
  await page.waitForSelector("#proposal-content section", { timeout: 30000 });
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  });
  await page.waitForTimeout(800);

  const labels = await page.evaluate(() => {
    const text = (selector, fallback) => {
      const el = document.querySelector(selector);
      return (el && el.textContent.trim()) || fallback;
    };
    return {
      company: text('[data-bind="meta.company.name"]', "QuadCommit"),
      project: text('[data-bind="meta.project.name"]', "Propuesta"),
      client: text('[data-bind="meta.client.name"]', "")
    };
  });

  const footerLeft = [labels.company, "Propuesta " + labels.project, labels.client]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" · ");

  await page.emulateMedia({ media: "print" });
  await page.waitForTimeout(250);

  await page.pdf({
    path: outputPath,
    format: "A4",
    printBackground: true,
    margin: { top: "14mm", bottom: "18mm", left: "13mm", right: "13mm" },
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate:
      '<div style="width:100%;padding:0 13mm;font-family:Inter,Arial,sans-serif;font-size:8px;color:#6b7884;display:flex;justify-content:space-between;">' +
      "<span>" + footerLeft + "</span>" +
      '<span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>' +
      "</div>",
    tagged: true,
    outline: true,
    title: "Propuesta · " + labels.project + " — " + labels.company,
    author: labels.company,
    subject: "Propuesta comercial y técnica · " + labels.project,
    keywords: labels.project + ", propuesta, " + labels.company,
    creator: "QuadCommit Proposal Engine"
  });

  const stats = await fs.stat(outputPath);
  console.log("PDF generated: " + outputPath + " (" + Math.round(stats.size / 1024) + " KB)");
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
