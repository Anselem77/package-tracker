const express = require("express");
const cors = require("cors");
const { randomUUID } = require("crypto");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const dbPath = path.resolve(__dirname, "data.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Unable to open database", err);
    process.exit(1);
  }
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS packages (
    trackingId TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    description TEXT NOT NULL,
    createdAt TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trackingId TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL,
    date TEXT NOT NULL,
    FOREIGN KEY(trackingId) REFERENCES packages(trackingId)
  )`);
});

const dbRun = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

const dbGet = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

const dbAll = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

function generateTrackingId() {
  return `PKG-${randomUUID().slice(0, 8).toUpperCase()}`;
}

app.use((req, res, next) => {
  if (req.method === "POST" && req.get("content-length") > 0 && !req.is("application/json")) {
    return res.status(415).json({ error: "Content-Type must be application/json" });
  }
  next();
});

app.post("/create", async (req, res) => {
  const { description = "Package created" } = req.body || {};
  const trackingId = generateTrackingId();
  const now = new Date().toISOString();

  try {
    await dbRun(
      "INSERT INTO packages (trackingId, status, description, createdAt) VALUES (?, ?, ?, ?)",
      [trackingId, "Created", description, now]
    );
    await dbRun(
      "INSERT INTO history (trackingId, location, status, date) VALUES (?, ?, ?, ?)",
      [trackingId, "Warehouse", "Created", now]
    );

    res.status(201).json({
      trackingId,
      status: "Created",
      description,
      history: [
        {
          location: "Warehouse",
          status: "Created",
          date: now,
        },
      ],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/track/:id", async (req, res) => {
  try {
    const pkg = await dbGet(
      "SELECT trackingId, status, description FROM packages WHERE trackingId = ?",
      [req.params.id]
    );
    if (!pkg) {
      return res.status(404).json({ error: "Package not found" });
    }

    const history = await dbAll(
      "SELECT location, status, date FROM history WHERE trackingId = ? ORDER BY date ASC",
      [req.params.id]
    );

    res.json({ ...pkg, history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/update", async (req, res) => {
  const { trackingId, location, status } = req.body || {};
  if (!trackingId || !location || !status) {
    return res.status(400).json({ error: "trackingId, location, and status are required" });
  }

  try {
    const pkg = await dbGet(
      "SELECT trackingId FROM packages WHERE trackingId = ?",
      [trackingId]
    );
    if (!pkg) {
      return res.status(404).json({ error: "Package not found" });
    }

    const now = new Date().toISOString();
    await dbRun(
      "UPDATE packages SET status = ? WHERE trackingId = ?",
      [status, trackingId]
    );
    await dbRun(
      "INSERT INTO history (trackingId, location, status, date) VALUES (?, ?, ?, ?)",
      [trackingId, location, status, now]
    );

    const updatedPkg = await dbGet(
      "SELECT trackingId, status, description FROM packages WHERE trackingId = ?",
      [trackingId]
    );
    const history = await dbAll(
      "SELECT location, status, date FROM history WHERE trackingId = ? ORDER BY date ASC",
      [trackingId]
    );

    res.json({ message: "Package updated", package: { ...updatedPkg, history } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON payload" });
  }
  next(err);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));