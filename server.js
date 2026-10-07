const express = require("express");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

const requests = new Map();

app.post("/api/demo-request", (_req, res) => {
  const id = "DEMO-" + crypto.randomInt(100000, 999999);

  requests.set(id, {
    status: "pending",
    createdAt: Date.now()
  });

  res.json({ id });
});

app.get("/api/demo-request/:id", (req, res) => {
  const request = requests.get(req.params.id);

  if (!request) {
    return res.status(404).json({ error: "Not found" });
  }

  res.json({ status: request.status });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
