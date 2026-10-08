const express = require("express");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));


/*
  Demo requests are kept in memory.

  Each request has:
  id
  page
  message
  status
*/
const requests = new Map();


/*
  STEP 1 / STEP 2 SUBMISSION
*/
app.post("/demo-message", async (req, res) => {

  const { page, message } = req.body;

  if (
    !message ||
    typeof message !== "string" ||
    !message.trim()
  ) {
    return res.status(400).json({
      success: false,
      error: "Demo message is required"
    });
  }

  const requestId = crypto.randomUUID();

  requests.set(requestId, {
    id: requestId,
    page: page === 2 ? 2 : 1,
    message: message.trim(),
    status: "pending",
    createdAt: new Date().toISOString()
  });


  /*
    Send only the submitted DEMO MESSAGE
    to Telegram.
  */

  const telegramMessage =
`🧪 DEMO MESSAGE — PAGE ${page === 2 ? 2 : 1}

${message.trim()}

Status: WAITING FOR REVIEW`;


  try {

    await sendToTelegram(telegramMessage);

    res.json({
      success: true,
      requestId: requestId
    });

  } catch (error) {

    console.error("Telegram error:", error);

    /*
      The request remains pending even if
      Telegram is unavailable.
    */

    res.json({
      success: true,
      requestId: requestId
    });
  }
});


/*
  CLIENT CHECKS THIS EVERY 2 SECONDS
*/
app.get("/demo-status/:id", (req, res) => {

  const request =
    requests.get(req.params.id);

  if (!request) {
    return res.status(404).json({
      status: "not_found"
    });
  }

  res.json({
    status: request.status
  });
});


/*
  DEMO REVIEW PAGE

  Open:

  /review

  It asks for the REVIEWER_KEY environment
  variable before showing requests.
*/
app.get("/review", (req, res) => {

  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Demo Reviewer</title>

<style>
body {
  font-family: Arial;
  background: #f5f5f5;
  padding: 20px;
}

.card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 15px;
}

button {
  padding: 12px 18px;
  margin: 5px;
  border: 0;
  border-radius: 7px;
  font-weight: bold;
}

.approve {
  background: #22c55e;
  color: white;
}

.decline {
  background: #ef4444;
  color: white;
}

textarea {
  width: 100%;
  min-height: 100px;
}
</style>
</head>

<body>

<h2>Demo Reviewer</h2>

<input
  id="key"
  type="password"
  placeholder="Reviewer key"
  style="width:100%;padding:12px;"
>

<button onclick="loadRequests()">
Load Requests
</button>

<div id="requests"></div>

<script>

async function loadRequests() {

  const key =
    document.getElementById("key").value;

  const response = await fetch(
    "/review/requests",
    {
      headers: {
        "x-reviewer-key": key
      }
    }
  );

  if (!response.ok) {
    alert("Invalid reviewer key");
    return;
  }

  const data = await response.json();

  const container =
    document.getElementById("requests");

  container.innerHTML = "";

  data.forEach(request => {

    const card =
      document.createElement("div");

    card.className = "card";

    card.innerHTML = \`
      <strong>Page:</strong> \${request.page}<br>
      <strong>Status:</strong> \${request.status}<br><br>

      <textarea readonly>\${escapeHtml(
        request.message
      )}</textarea>

      <br>

      <button
        class="approve"
        onclick="decide('\${request.id}','approved')"
      >
        Approve
      </button>

      <button
        class="decline"
        onclick="decide('\${request.id}','declined')"
      >
        Decline
      </button>
    \`;

    container.appendChild(card);
  });
}


async function decide(id, status) {

  const key =
    document.getElementById("key").value;

  const response = await fetch(
    "/review/decision",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-reviewer-key": key
      },

      body: JSON.stringify({
        id: id,
        status: status
      })
    }
  );

  if (!response.ok) {
    alert("Unable to update request");
    return;
  }

  loadRequests();
}


function escapeHtml(value) {

  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g
