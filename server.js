const express = require("express");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const requests = new Map();

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const WEBHOOK_URL = process.env.WEBHOOK_URL;


/* =========================================
   CREATE DEMO REQUEST
========================================= */

app.post("/demo-message", async (req, res) => {
  const { page, message } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({
      success: false,
      error: "Demo message is required"
    });
  }

  const requestId = crypto.randomUUID();

  const request = {
    id: requestId,
    page: page === 2 ? 2 : 1,
    message: message.trim(),
    status: "pending",
    createdAt: new Date().toISOString()
  };

  requests.set(requestId, request);

  try {
    await sendTelegramDemoRequest(request);
  } catch (error) {
    console.error("Telegram error:", error);
  }

  res.json({
    success: true,
    requestId
  });
});


/* =========================================
   USER CHECKS REQUEST STATUS
========================================= */

app.get("/demo-status/:id", (req, res) => {
  const request = requests.get(req.params.id);

  if (!request) {
    return res.status(404).json({
      status: "not_found"
    });
  }

  /*
    IMPORTANT:
    Return both status AND page so the frontend
    knows whether this is Page 1 or Page 2.
  */

  res.json({
    status: request.status,
    page: request.page
  });
});


/* =========================================
   TELEGRAM WEBHOOK
========================================= */

app.post("/telegram-webhook", async (req, res) => {
  try {
    const update = req.body;

    console.log(
      "Telegram webhook received:",
      JSON.stringify(update)
    );

    if (!update.callback_query) {
      return res.sendStatus(200);
    }

    const callback = update.callback_query;

    const data = callback.data || "";

    if (!data.startsWith("demo:")) {
      return res.sendStatus(200);
    }

    const parts = data.split(":");

    const action = parts[1];
    const requestId = parts[2];

    const request = requests.get(requestId);

    if (!request) {
      await answerCallback(
        callback.id,
        "Demo request no longer exists."
      );

      return res.sendStatus(200);
    }


    /* =========================================
       APPROVE
    ========================================= */

    if (action === "approve") {

      request.status = "approved";

      requests.set(requestId, request);

      await answerCallback(
        callback.id,
        "Demo request approved."
      );

      if (
        callback.message &&
        callback.message.chat &&
        callback.message.message_id
      ) {
        await editTelegramMessage(
          callback.message.chat.id,
          callback.message.message_id,
          buildTelegramMessage(
            request,
            "APPROVED"
          )
        );
      }
    }


    /* =========================================
       DECLINE
    ========================================= */

    else if (action === "decline") {

      request.status = "declined";

      requests.set(requestId, request);

      await answerCallback(
        callback.id,
        "Demo request declined."
      );

      if (
        callback.message &&
        callback.message.chat &&
        callback.message.message_id
      ) {
        await editTelegramMessage(
          callback.message.chat.id,
          callback.message.message_id,
          buildTelegramMessage(
            request,
            "DECLINED"
          )
        );
      }
    }


    /* =========================================
       EXTEND
    ========================================= */

    else if (action === "extend") {

      request.status = "pending";

      requests.set(requestId, request);

      await answerCallback(
        callback.id,
        "Demo review time extended."
      );

      if (
        callback.message &&
        callback.message.chat &&
        callback.message.message_id
      ) {
        await editTelegramMessage(
          callback.message.chat.id,
          callback.message.message_id,
          buildTelegramMessage(
            request,
            "WAITING FOR REVIEW"
          )
        );
      }
    }

    return res.sendStatus(200);

  } catch (error) {

    console.error(
      "Webhook error:",
      error
    );

    return res.sendStatus(200);
  }
});


/* =========================================
   TELEGRAM MESSAGE
========================================= */

function buildTelegramMessage(request, status) {

  return (
`🧪 DEMO VERIFICATION
━━━━━━━━━━━━━━━━━━━━

PAGE: ${request.page}
DEMO ID: ${request.id}

TIME:
${new Date(request.createdAt).toLocaleString()}

DEMO MESSAGE:
${request.message}

━━━━━━━━━━━━━━━━━━━━

STATUS:
${status}`
  );
}


/* =========================================
   SEND TELEGRAM MESSAGE WITH BUTTONS
========================================= */

async function sendTelegramDemoRequest(request) {

  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing"
    );
  }

  const url =
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

  const response = await fetch(
    url,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({

        chat_id: TELEGRAM_CHAT_ID,

        text: buildTelegramMessage(
          request,
          "⏳ WAITING FOR REVIEW"
        ),

        reply_markup: {

          inline_keyboard: [

            [
              {
                text: "✅ Approve",
                callback_data:
                  `demo:approve:${request.id}`
              }
            ],

            [
              {
                text: "Correct Demo",
                callback_data:
                  `demo:approve:${request.id}`
              },

              {
                text: "❌ Decline",
                callback_data:
                  `demo:decline:${request.id}`
              }
            ],

            [
              {
                text: "⏱ Extend Time",
                callback_data:
                  `demo:extend:${request.id}`
              }
            ]

          ]

        }

      })
    }
  );

  if (!response.ok) {
    throw new Error(
      await response.text()
    );
  }
}


/* =========================================
   ANSWER TELEGRAM BUTTON
========================================= */

async function answerCallback(
  callbackId,
  text
) {

  if (!TELEGRAM_TOKEN) {
    return;
  }

  const url =
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`;

  await fetch(
    url,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        callback_query_id: callbackId,
        text: text
      })
    }
  );
}


/* =========================================
   UPDATE TELEGRAM MESSAGE
========================================= */

async function editTelegramMessage(
  chatId,
  messageId,
  text
) {

  if (!TELEGRAM_TOKEN) {
    return;
  }

  const url =
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`;

  await fetch(
    url,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({

        chat_id: chatId,

        message_id: messageId,

        text: text,

        reply_markup: {
          inline_keyboard: []
        }

      })
    }
  );
}


/* =========================================
   SET TELEGRAM WEBHOOK
========================================= */

async function setupWebhook() {

  if (!TELEGRAM_TOKEN || !WEBHOOK_URL) {

    console.log(
      "Webhook not configured. " +
      "Set TELEGRAM_BOT_TOKEN and WEBHOOK_URL."
    );

    return;
  }

  const webhook =
    WEBHOOK_URL.replace(/\/$/, "") +
    "/telegram-webhook";

  const url =
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook`;

  try {

    const response = await fetch(
      url,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          url: webhook
        })
      }
    );

    const result =
      await response.json();

    console.log(
      "Telegram webhook:",
      result
    );

  } catch (error) {

    console.error(
      "Webhook setup failed:",
      error
    );
  }
}


/* =========================================
   START SERVER
========================================= */

app.listen(
  PORT,
  async () => {

    console.log(
      `Demo server running on port ${PORT}`
    );

    await setupWebhook();

  }
);
