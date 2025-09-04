require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

const upload = multer({ dest: "uploads/" });

// Load environment variables
const PORT = process.env.PORT || 5000;
const token = process.env.WA_ACCESS_TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;
const apiVersion = process.env.GRAPH_API_VERSION || "v23.0";

// ------------------- EXISTING ENDPOINT -------------------
app.post("/send-message", async (req, res) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) {
      return res.status(400).json({ error: "Recipient and message are required" });
    }

    const response = await axios.post(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).json({ success: true, message: "Message sent", data: response.data });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ success: false, error: "Error sending message" });
  }
});

// ------------------- NEW ENDPOINT: SEND SIGNUP -------------------
app.post("/send-signup", async (req, res) => {
  try {
    const { userId, name, email } = req.body;
    if (!userId || !name || !email) {
      return res.status(400).json({ error: "userId, name, and email are required" });
    }

    const message = `📝 New Signup\n\nID: ${userId}\nName: ${name}\nEmail: ${email}`;

    const response = await axios.post(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: process.env.ADMIN_NUMBER, // 👈 Apna WhatsApp number env me dalna
        type: "text",
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).json({ success: true, message: "Signup sent", data: response.data });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ success: false, error: "Error sending signup" });
  }
});

// ------------------- NEW ENDPOINT: SEND SCREENSHOT -------------------
app.post("/send-screenshot", upload.single("screenshot"), async (req, res) => {
  try {
    const { userId } = req.body;
    const file = req.file;

    if (!userId || !file) {
      return res.status(400).json({ error: "userId and screenshot are required" });
    }

    // WhatsApp Cloud API direct file upload karne ka support deta hai
    // Step 1: Upload media
    const mediaRes = await axios.post(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/media`,
      {
        messaging_product: "whatsapp",
        file: require("fs").createReadStream(file.path),
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      }
    );

    const mediaId = mediaRes.data.id;

    // Step 2: Send screenshot message
    const response = await axios.post(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: process.env.ADMIN_NUMBER,
        type: "image",
        image: { id: mediaId, caption: `📸 Deposit Proof from ${userId}` },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).json({ success: true, message: "Screenshot sent", data: response.data });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ success: false, error: "Error sending screenshot" });
  }
});

// ------------------- START SERVER -------------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
