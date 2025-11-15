const express = require("express");
const chromium = require("chrome-aws-lambda");
const puppeteer = require("puppeteer-core");

const app = express();
app.use(express.json());

// Template mapping (5 templates)
const TEMPLATES = {
  "1": "https://textpro.me/create-glitch-text-effect-online-1028.html",
  "2": "https://textpro.me/create-neon-light-text-effect-online-882.html",
  "3": "https://textpro.me/create-3d-gradient-text-effect-online-1005.html",
  "4": "https://textpro.me/create-blackpink-logo-style-online-1001.html",
  "5": "https://textpro.me/create-multicolor-3d-text-effect-online-975.html"
};

app.get("/api/textpro", async (req, res) => {
  const id = req.query.id;
  const text = req.query.text;

  if (!id || !TEMPLATES[id]) {
    return res.status(400).json({ error: "Invalid or missing id" });
  }
  if (!text) {
    return res.status(400).json({ error: "Missing text parameter" });
  }

  const templateUrl = TEMPLATES[id];
  let browser;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath,
      headless: chromium.headless
    });

    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0");

    await page.goto(templateUrl, { waitUntil: "networkidle2" });

    // Splitting multi-text (example: a|b)
    const parts = text.split("|");
    const inputs = await page.$$('[name="text[]"], input[type=text], textarea');

    if (inputs.length === 0) {
      return res.status(500).json({ error: "Input field not found" });
    }

    for (let i = 0; i < parts.length && i < inputs.length; i++) {
      await inputs[i].click({ clickCount: 3 });
      await inputs[i].type(parts[i], { delay: 20 });
    }

    // Click create button
    const selectors = [
      "button[type=submit]",
      ".btn-create",
      "#submit",
      ".create-button"
    ];

    let clicked = false;
    for (const sel of selectors) {
      const btn = await page.$(sel);
      if (btn) {
        await btn.click();
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll("button")].find(b =>
          /create|generate|make/i.test(b.innerText)
        );
        if (btn) btn.click();
      });
    }

    await page.waitForTimeout(3000);

    // Find output image
    const imageUrl = await page.evaluate(() => {
      const imgs = [...document.images].filter(
        i => i.src && i.width > 200 && !i.src.includes("spinner")
      );
      if (imgs.length === 0) return null;

      let largest = imgs[0];
      for (const img of imgs) {
        if (
          img.naturalWidth * img.naturalHeight >
          largest.naturalWidth * largest.naturalHeight
        ) {
          largest = img;
        }
      }
      return largest.src;
    });

    await browser.close();

    if (!imageUrl) {
      return res.status(500).json({ error: "Failed to generate image" });
    }

    return res.json({
      status: "success",
      template_id: id,
      url: imageUrl
    });

  } catch (err) {
    if (browser) await browser.close();
    return res.status(500).json({ error: "Error", details: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("TextPro API is running.");
});

app.listen(process.env.PORT || 3000, () =>
  console.log("Server running...")
);
