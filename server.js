const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));


// STEP 1
// Receives the complete DEMO SMS message.
app.post("/demo-message", async (req, res) => {
  const { demoMessage } = req.body;

  if (!demoMessage || typeof demoMessage !== "string") {
    return res.status(400).send("Demo message is required");
  }

  const telegramMessage =
`🧪 DEMO SMS SUBMISSION

${demoMessage}

This was submitted from the training simulation.`;

  try {
    await sendToTelegram(telegramMessage);

    res.json({
      success: true
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false
    });
  }
});


// STEP 2
// Sends only confirmation that the demo code was entered.
// The actual four digits are deliberately NOT transmitted.
app.post("/demo-verification", async (req, res) => {

  if (req.body.verified !== true) {
    return res.status(400).json({
      success: false
    });
  }

  const telegramMessage =
`🧪 DEMO VERIFICATION

4-digit demo code entered: YES

The demo code itself was not transmitted.`;

  try {
    await sendToTelegram(telegramMessage);

    res.json({
      success: true
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false
    });
  }
});


async function sendToTelegram(message) {

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing"
    );
  }

  const telegramUrl =
    `https://api.telegram.org/bot${token}/sendMessage`;

  const response = await fetch(telegramUrl, {
    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      chat_id: chatId,
      text: message
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Telegram error: ${errorText}`
    );
  }
}


app.listen(PORT, () => {
  console.log(`Demo server running on port ${PORT}`);
});
