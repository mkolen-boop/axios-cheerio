const axios = require("axios");
const cheerio = require("cheerio");
const express = require("express");

const app = express();
app.use(express.json());

app.post("/scrape", async (req, res) => {
  const url = req.body.url;
  if (!url) return res.status(400).json({ error: "url required" });

  try {
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });

    const $ = cheerio.load(html);

    // Title
    const title =
      $("h1").first().text().trim() ||
      $('meta[property="og:title"]').attr("content") ||
      $("title").text().trim() ||
      null;

    // Price
    const price =
      $(".price, .product-price, [itemprop='price']").first().text().trim() ||
      null;

    // Currency
    const currency =
      $("[itemprop='priceCurrency']").attr("content") ||
      (price && price.replace(/[0-9.,]/g, "").trim()) ||
      null;

    // Images
    const images = [];
    $("img").each((i, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src");
      if (src && src.startsWith("http")) images.push(src);
    });

    // Description
    const description =
      $(".description, .product-description, [itemprop='description']")
        .first()
        .text()
        .trim() ||
      null;

    // Availability
    const availability =
      $("[itemprop='availability']").attr("content") ||
      $(".in-stock, .out-of-stock").text().trim() ||
      null;

    // Rating
    const rating =
      $("[itemprop='ratingValue']").attr("content") ||
      $(".rating").first().text().trim() ||
      null;

    // Product ID / SKU
    const product_id =
      $("[itemprop='sku']").attr("content") ||
      $(".sku").text().trim() ||
      null;

    // Category
    const category =
      $("[itemprop='category']").text().trim() ||
      $('meta[property="product:category"]').attr("content") ||
      null;

    // Breadcrumbs
    const breadcrumbs = [];
    $(".breadcrumb a").each((i, el) => {
      const text = $(el).text().trim();
      if (text) breadcrumbs.push(text);
    });

    // Meta tags
    const meta = {
      title: $('meta[name="title"]').attr("content") || null,
      description: $('meta[name="description"]').attr("content") || null,
      keywords: $('meta[name="keywords"]').attr("content") || null
    };

    return res.json({
      title,
      price,
      currency,
      images,
      description,
      availability,
      rating,
      product_id,
      category,
      breadcrumbs,
      meta,
      raw_html: html.length > 10000 ? "trimmed" : html
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log("Scraper running on port 3000"));
