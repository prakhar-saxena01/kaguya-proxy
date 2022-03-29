const express = require("express");
const axios = require("axios");
const app = express();
require("dotenv").config();

const PORT = process.env.PORT || 3000;
const MAIN_NODE_SERVER =
  process.env.NODE_SERVER || "http://localhost:3001/kaguya";

const getScrapers = () => {
  return axios
    .get(`${MAIN_NODE_SERVER}/proxy/sources`)
    .then((res) => res.data.sources);
};

getScrapers().then((scrapers) => {
  app.get("/proxy", async (req, res) => {
    const { url, source_id } = req.query;

    const scraper = scrapers.find((scraper) => scraper.id === source_id);

    if (!scraper) {
      return res.status(400).send("Invalid source id");
    }

    const decodedUrl = decodeURIComponent(url);

    const host = new URL(decodedUrl).host;

    const response = await axios.get(decodedUrl, {
      responseType: "stream",
      headers: { ...req.headers, ...scraper.headers, host },
      validateStatus: () => true,
      maxRedirects: 0,
    });

    const blacklistHeaders = [
      "transfer-encoding",
      "access-control-allow-origin",
      "access-control-allow-methods",
    ];

    const loweredCaseHeaders = Object.keys(response.headers).map((header) =>
      header.toLowerCase()
    );

    if (!loweredCaseHeaders.includes("cache-control")) {
      res.setHeader("Cache-Control", "public, max-age=600");
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "*");

    for (let header in response.headers) {
      if (blacklistHeaders.includes(header.toLowerCase())) continue;

      if (header.toLowerCase() === "location") {
        const encodedUrl = encodeURIComponent(response.headers[header]);

        res.redirect(302, `/proxy/?url=${encodedUrl}&source_id=${source_id}`);

        return;
      }

      res.setHeader(header, response.headers[header]);
    }

    res.status(response.status);

    response.data.pipe(res);
  });

  app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
  });
});
