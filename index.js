const axios = require("axios");
const cheerio = require("cheerio");
const express = require("express");

const app = express();
app.use(express.json());

app.post("/scrape", async (req, res) => {
  const url = req.body.url;
  if (!url) return res.status(400).json({ error: "url required" });

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const title = $("h1").first().text() || null;
    const price = $(".price, .product-price").first().text() || null;

    res.json({ title, price });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3000, () => console.log("Scraper running on port 3000"));
