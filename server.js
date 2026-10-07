const express = require("express");

const app = express();
app.use(express.json());
app.use(express.static("."));

const PORT = process.env.PORT || 10000;

app.post("/demo-notification", async (req, res) => {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return res.status(500).json({
        error: "Telegram environment variables are missing"
      });
    }

    const message =
      "🔔 Demo verification submitted\n\n" +
      "Status: Awaiting demo review\n" +
      "No OTP or PIN was transmitted.";

    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message
        })
      }
    );

    const result = await response.json();

    if (!response.ok || !result.ok) {
      return res.status(500).json({
        error: "Telegram request failed"
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Server error"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
