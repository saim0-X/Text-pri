import express from "express";
import axios from "axios";
import cheerio from "cheerio";
import FormData from "form-data";

const app = express();
const PORT = process.env.PORT || 3000;

// =====================
// Templates mapping
// =====================
const TEMPLATES = {
  "1": "https://textpro.me/create-neon-light-text-effect-online-882.html",
  "2": "https://textpro.me/create-glossy-metal-text-effect-online-188.html",
  "3": "https://textpro.me/3d-box-text-effect-online-880.html",
  "4": "https://textpro.me/create-gradient-text-effect-online-999.html",
  "5": "https://textpro.me/create-blackpink-logo-style-online-1132.html"
};

// =====================
// Scraping & Generate function
// =====================
async function generateTextPro(id, text) {
  const url = TEMPLATES[id];
  if (!url) throw new Error("Invalid template ID");

  // STEP 1 — Load template page
  const page = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  const cookie = page.headers["set-cookie"]?.join("; ") || "";
  const $ = cheerio.load(page.data);

  // Hidden form values
  const token = $('input[name="token"]').val();
  const buildServer = $('input[name="build_server"]').val();
  const buildServerId = $('input[name="build_server_id"]').val();
  const submit = $('input[name="submit"]').val();

  if (!token) throw new Error("Token not found — parsing failed");

  // STEP 2 — Prepare form
  const form = new FormData();
  form.append("text[]", text);
  form.append("submit", submit);
  form.append("token", token);
  form.append("build_server", buildServer);
  form.append("build_server_id", buildServerId);

  // STEP 3 — POST form
  const postPage = await axios.post(url, form, {
    headers: {
      ...form.getHeaders(),
      Cookie: cookie,
      "User-Agent": "Mozilla/5.0"
    }
  });

  const $2 = cheerio.load(postPage.data);
  const formValue =
    $2("#form_value").text() ||
    $2("#form_value_input").text() ||
    $2("#form_value").val();

  if (!formValue) throw new Error("form_value not found");

  // STEP 4 — Generate final image
  const create = await axios.post(
    new URL("/effect/create-image", url).href,
    JSON.parse(formValue),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: cookie,
        "User-Agent": "Mozilla/5.0"
      }
    }
  );

  return buildServer + (create.data?.fullsize_image || create.data?.image);
}

// =====================
// API Route
// =====================
app.get("/api/textpro", async (req, res) => {
  const { id, text } = req.query;

  if (!id || !text)
    return res.status(400).json({
      error: "Missing ?id= & ?text="
    });

  try {
    const image = await generateTextPro(id, text);
    res.json({
      status: true,
      template_id: id,
      input: text,
      image
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      error: err.message
    });
  }
});

app.listen(PORT, () => console.log("TextPro API running on PORT " + PORT));
