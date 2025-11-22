const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

const app = express();
app.use(express.json());

// Basic HTML scraper
async function scrapeStatic(url) {
  return axios.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
      "Accept": "text/html",
    }
  }).then((r) => r.data);
}

// Puppeteer Fallback
async function scrapeBrowser(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled"
    ]
  });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

  const html = await page.content();
  await browser.close();
  return html;
}

app.post("/scrape", async (req, res) => {
  const url = req.body.url;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    let html;

    // Try static scrape first
    try {
      html = await scrapeStatic(url);
      if (!html || html.length < 5000) throw new Error("Static failed");
    } catch {
      // Fallback Puppeteer
      html = await scrapeBrowser(url);
    }

    const $ = cheerio.load(html);

    // Extract data
    const title = $("h1.product-title").text().trim() || null;
    const price = $("span.price").first().text().trim() || null;
    const product_id = $("div.product-sku span.value").text().trim() || null;

    const images = [];
    $("div.product-media img").each((i, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src");
      if (src?.startsWith("http")) images.push(src);
    });

    const description = $(".product-description").text().trim() || null;

    const breadcrumbs = [];
    $("nav.breadcrumb a").each((i, el) => {
      const txt = $(el).text().trim();
      if (txt) breadcrumbs.push(txt);
    });

    let availability = null;
    const btn = $("button.add-to-cart").text().trim();
    if (btn.includes("Adauga în Coș")) availability = "in_stock";
    if (btn.includes("Stoc epuizat")) availability = "out_of_stock";

    return res.json({
      title,
      price,
      product_id,
      images,
      description,
      breadcrumbs,
      availability,
      url
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Scraper with Puppeteer running on 3000"));
