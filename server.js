require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

// Load environment variables
const PORT = process.env.PORT || 5000;
const token = process.env.WA_ACCESS_TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;
const apiVersion = process.env.GRAPH_API_VERSION || "v23.0"; // Use .env version or default

// Send message API
app.post("/send-message", async (req, res) => {
  try {
    const { to, message } = req.body;

    // Input validation
    if (!to || !message) {
      return res.status(400).json({ error: "Recipient and message are required" });
    }

    // Optional: restrict messages to ADMIN_NUMBER during testing
    // if (to !== process.env.ADMIN_NUMBER) {
    //   return res.status(403).json({ error: "You can only send messages to the admin number." });
    // }

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

    res.status(200).json(response.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Error sending message" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
