const express = require("express");
const axios = require("axios");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const fs = require("fs");
const FormData = require("form-data");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const {
  PORT = 5000,
  GRAPH_API_VERSION,
  PHONE_NUMBER_ID,
  WA_ACCESS_TOKEN,
  ADMIN_NUMBER
} = process.env;

const WA_MSG_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}/messages`;

// ========== SIGNUP ==========
app.post("/api/signup", async (req, res) => {
  try {
    const { name, email } = req.body || {};
    if (!name || !email) return res.status(400).json({ ok:false, error:"name & email required" });

    await axios.post(WA_MSG_URL, {
      messaging_product: "whatsapp",
      to: ADMIN_NUMBER,
      type: "text",
      text: { body: `📝 New Signup\nName: ${name}\nEmail: ${email}` }
    }, {
      headers: { Authorization: `Bearer ${WA_ACCESS_TOKEN}`, "Content-Type":"application/json" }
    });

    res.json({ ok: true });
  } catch (e) {
    console.error(e?.response?.data || e.message);
    res.status(500).json({ ok:false, error:"WhatsApp send failed" });
  }
});

// ========== DEPOSIT (amount + screenshot) ==========
const upload = multer({ dest: "uploads/" });

app.post("/api/deposit", upload.single("screenshot"), async (req, res) => {
  try {
    const { method, amount, txnId, userId } = req.body || {};
    if (!method || !amount || !txnId || !userId || !req.file) {
      return res.status(400).json({ ok:false, error:"method, amount, txnId, userId, screenshot required" });
    }

    // 1) Upload media to WhatsApp
    const form = new FormData();
    form.append("file", fs.createReadStream(req.file.path));
    form.append("messaging_product", "whatsapp");

    const mediaRes = await axios.post(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}/media`,
      form,
      { headers: { Authorization: `Bearer ${WA_ACCESS_TOKEN}`, ...form.getHeaders() } }
    );
    const mediaId = mediaRes.data.id;

    // 2) Send image + caption to your WhatsApp
    await axios.post(WA_MSG_URL, {
      messaging_product: "whatsapp",
      to: ADMIN_NUMBER,
      type: "image",
      image: { id: mediaId, caption: `💰 Deposit\nUser: ${userId}\nMethod: ${method}\nAmount: ${amount}\nTxn: ${txnId}` }
    }, { headers: { Authorization: `Bearer ${WA_ACCESS_TOKEN}`, "Content-Type":"application/json" } });

    fs.unlink(req.file.path, () => {});
    res.json({ ok:true });
  } catch (e) {
    console.error(e?.response?.data || e.message);
    res.status(500).json({ ok:false, error:"Deposit failed" });
  }
});

// ========== HEALTH CHECK ==========
app.get("/api/health", (_req, res) => res.json({ ok:true }));

app.listen(PORT, () => console.log(`Backend running → http://localhost:${PORT}`));
