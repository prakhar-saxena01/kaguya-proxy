const express = require("express");
const cors = require("cors");
const axios = require("axios");
const qs = require("qs");
const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());

app.get("/secret", async (req, res) => {
  const { url, headers } = req.query;

  const decodedUrl = decodeURIComponent(url);

  const host = new URL(decodedUrl).host;

  const response = await axios.get(decodedUrl, {
    responseType: "stream",
    headers: { ...req.headers, ...headers, host },
    validateStatus: () => true,
    maxRedirects: 0,
  });

  res.setHeader("Cache-Control", "public, max-age=3600");

  for (let header in response.headers) {
    if (header.toLowerCase() === "location") {
      res.redirect(
        302,
        `/secret?url=${encodeURIComponent(
          response.headers[header]
        )}&${qs.stringify({ headers })}`
      );

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
