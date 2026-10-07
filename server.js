const express = require("express");
const https = require("https");

const app = express();

app.use(express.json());
app.use(express.static("."));

const PORT = process.env.PORT || 10000;

function sendTelegramMessage(token, chatId, message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      chat_id: chatId,
      text: message
    });

    const request = https.request(
      {
        hostname: "api.telegram.org",
        path: `/bot${token}/sendMessage`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data)
        }
      },
      (response) => {
        let body = "";

        response.on("data", chunk => {
          body += chunk;
        });

        response.on("end", () => {
          try {
            const result = JSON.parse(body);

            if (!response.ok || !result.ok) {
              reject(new Error("Telegram API request failed"));
              return;
            }

            resolve(result);
          } catch {
            reject(new Error("Invalid Telegram response"));
          }
        });
      }
    );

    request.on("error", reject);

    request.write(data);
    request.end();
  });
}

app.post("/demo-notification", async (req, res) => {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      console.error("Missing Telegram environment variables");

      return res.status(500).json({
        success: false,
        error: "Telegram configuration is missing"
      });
    }

    await sendTelegramMessage(
      token,
      chatId,
      "🔔 DEMO VERIFICATION SUBMITTED\n\n" +
      "Status: Awaiting demo review\n\n" +
      "No OTP or PIN was transmitted."
    );

    res.json({
      success: true
    });

  } catch (error) {
    console.error("Telegram error:", error.message);

    res.status(500).json({
      success: false,
      error: "Unable to send demo notification"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
