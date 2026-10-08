const express = require("express");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const requests = new Map();

/* Submit a demo message */
app.post("/demo-message", async (req, res) => {
  const { page, message } = req.body;

  if (!message || typeof message !== "string" || !message.trim()) {
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

  try {
    await sendToTelegram(
      "🧪 DEMO MESSAGE — PAGE " +
      (page === 2 ? "2" : "1") +
      "\n\n" +
      message.trim() +
      "\n\nStatus: WAITING FOR REVIEW"
    );
  } catch (error) {
    console.error("Telegram error:", error);
  }

  res.json({
    success: true,
    requestId
  });
});


/* User's browser checks this while waiting */
app.get("/demo-status/:id", (req, res) => {
  const request = requests.get(req.params.id);

  if (!request) {
    return res.status(404).json({
      status: "not_found"
    });
  }

  res.json({
    status: request.status
  });
});


/* Reviewer page */
app.get("/review", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Demo Reviewer</title>

<style>
body {
  font-family: Arial, sans-serif;
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

input {
  width: 100%;
  padding: 12px;
  box-sizing: border-box;
}

textarea {
  width: 100%;
  min-height: 100px;
  box-sizing: border-box;
}
</style>
</head>

<body>

<h2>Demo Reviewer</h2>

<input
  id="key"
  type="password"
  placeholder="Reviewer key"
>

<button onclick="loadRequests()">
Load Requests
</button>

<div id="requests"></div>

<script>

async function loadRequests() {
  const key = document.getElementById("key").value;

  const response = await fetch("/review/requests", {
    headers: {
      "x-reviewer-key": key
    }
  });

  if (!response.ok) {
    alert("Invalid reviewer key");
    return;
  }

  const data = await response.json();
  const container = document.getElementById("requests");

  container.innerHTML = "";

  data.forEach(function(request) {

    const card = document.createElement("div");
    card.className = "card";

    const title = document.createElement("div");
    title.innerHTML =
      "<strong>Page:</strong> " +
      request.page +
      "<br><strong>Status:</strong> " +
      request.status +
      "<br><br>";

    const message = document.createElement("textarea");
    message.readOnly = true;
    message.value = request.message;

    const approve = document.createElement("button");
    approve.className = "approve";
    approve.textContent = "Approve";
    approve.onclick = function() {
      decide(request.id, "approved");
    };

    const decline = document.createElement("button");
    decline.className = "decline";
    decline.textContent = "Decline";
    decline.onclick = function() {
      decide(request.id, "declined");
    };

    card.appendChild(title);
    card.appendChild(message);
    card.appendChild(document.createElement("br"));
    card.appendChild(approve);
    card.appendChild(decline);

    container.appendChild(card);
  });
}


async function decide(id, status) {
  const key = document.getElementById("key").value;

  const response = await fetch("/review/decision", {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      "x-reviewer-key": key
    },

    body: JSON.stringify({
      id: id,
      status: status
    })
  });

  if (!response.ok) {
    alert("Unable to update request");
    return;
  }

  loadRequests();
}

</script>

</body>
</html>
  `);
});


/* Get pending demo requests */
app.get("/review/requests", (req, res) => {
  if (!checkReviewerKey(req)) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  const result = [];

  for (const request of requests.values()) {
    result.push({
      id: request.id,
      page: request.page,
      message: request.message,
      status: request.status
    });
  }

  res.json(result);
});


/* Approve or decline */
app.post("/review/decision", (req, res) => {
  if (!checkReviewerKey(req)) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  const { id, status } = req.body;

  if (status !== "approved" && status !== "declined") {
    return res.status(400).json({
      error: "Invalid status"
    });
  }

  const request = requests.get(id);

  if (!request) {
    return res.status(404).json({
      error: "Request not found"
    });
  }

  request.status = status;

  requests.set(id, request);

  res.json({
    success: true
  });
});


function checkReviewerKey(req) {
  const configuredKey = process.env.REVIEWER_KEY;
  const suppliedKey = req.headers["x-reviewer-key"];

  if (!configuredKey || !suppliedKey) {
    return false;
  }

  return suppliedKey === configuredKey;
}


/* Telegram */
async function sendToTelegram(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing"
    );
  }

  const url =
    "https://api.telegram.org/bot" +
    token +
    "/sendMessage";

  const response = await fetch(url, {
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
    throw new Error(await response.text());
  }
}


app.listen(PORT, () => {
  console.log("Demo server running on port " + PORT);
});
