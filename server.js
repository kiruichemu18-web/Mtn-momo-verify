const express = require("express");
const https = require("https");

const app = express();

app.use(express.json());
app.use(express.static("."));

const PORT = process.env.PORT || 10000;

/*
  Send a message to Telegram.
  No OTP, PIN, password, or authentication code
  is sent by this application.
*/
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

        response.on("data", (chunk) => {
          body += chunk;
        });

        response.on("end", () => {
          try {
            const result = JSON.parse(body);

            if (!response.ok || !result.ok) {
              console.error("Telegram API error:", result);
              reject(new Error("Telegram API request failed"));
              return;
            }

            resolve(result);
          } catch (error) {
            console.error("Telegram response error:", error);
            reject(new Error("Invalid Telegram response"));
          }
        });
      }
    );

    request.on("error", (error) => {
      reject(error);
    });

    request.write(data);
    request.end();
  });
}


/*
  CHECK TELEGRAM CONFIGURATION

  This does NOT reveal the token or chat ID.
*/
app.get("/telegram-status", (req, res) => {
  res.json({
    botTokenConfigured: Boolean(
      process.env.TELEGRAM_BOT_TOKEN
    ),

    chatIdConfigured: Boolean(
      process.env.TELEGRAM_CHAT_ID
    )
  });
});


/*
  DEMO NOTIFICATION

  Only a non-sensitive demo status is sent.
*/
app.post("/demo-notification", async (req, res) => {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      console.error(
        "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID"
      );

      return res.status(500).json({
        success: false,
        error: "Telegram configuration is missing"
      });
    }

    const message =
      "🔔 DEMO VERIFICATION SUBMITTED\n\n" +
      "Status: Awaiting demo review\n\n" +
      "This is a training simulation.\n" +
      "No OTP or PIN was transmitted.";

    await sendTelegramMessage(
      token,
      chatId,
      message
    );

    console.log(
      "Demo notification sent successfully."
    );

    res.json({
      success: true
    });

  } catch (error) {
    console.error(
      "Telegram notification error:",
      error.message
    );

    res.status(500).json({
      success: false,
      error: "Unable to send demo notification"
    });
  }
});


/*
  HEALTH CHECK
*/
app.get("/health", (req, res) => {
  res.json({
    status: "ok"
  });
});


/*
  START SERVER
*/
app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );
});
