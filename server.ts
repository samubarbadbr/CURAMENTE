import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON with generous limit for diary attachments/backups
  app.use(express.json({ limit: "15mb" }));

  // Ensure data directory exists for server sync storage
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const syncFile = path.join(dataDir, "sync_store.json");

  // Helper to read sync store from file system
  const getSyncStore = (): Record<string, any> => {
    try {
      if (fs.existsSync(syncFile)) {
        const content = fs.readFileSync(syncFile, "utf-8");
        return JSON.parse(content);
      }
    } catch (e) {
      console.error("Error reading sync store file:", e);
    }
    return {};
  };

  // Helper to save sync store to file system
  const saveSyncStore = (store: Record<string, any>) => {
    try {
      fs.writeFileSync(syncFile, JSON.stringify(store, null, 2), "utf-8");
    } catch (e) {
      console.error("Error writing sync store file:", e);
    }
  };

  // API Health Endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // GET Sync Data Endpoint (for Cloud Sync between PC <-> Mobile)
  app.get("/api/sync/:pin", (req, res) => {
    const rawPin = req.params.pin;
    const pin = rawPin ? rawPin.trim().toLowerCase() : "";

    if (!pin || pin.length < 3) {
      return res.status(400).json({ success: false, error: "PIN non valido (minimo 3 caratteri)" });
    }

    const store = getSyncStore();
    const pinData = store[pin];

    if (!pinData) {
      return res.status(404).json({ success: false, error: "Nessun dato trovato per questo PIN di sincronizzazione" });
    }

    return res.json({ success: true, data: pinData });
  });

  // POST Sync Data Endpoint
  app.post("/api/sync/:pin", (req, res) => {
    const rawPin = req.params.pin;
    const pin = rawPin ? rawPin.trim().toLowerCase() : "";

    if (!pin || pin.length < 3) {
      return res.status(400).json({ success: false, error: "PIN non valido (minimo 3 caratteri)" });
    }

    const payload = req.body;
    if (!payload || !payload.entries) {
      return res.status(400).json({ success: false, error: "Payload dati non valido" });
    }

    const store = getSyncStore();
    const nowIso = new Date().toISOString();

    store[pin] = {
      entries: payload.entries || [],
      tags: payload.tags || [],
      settings: payload.settings || {},
      updatedAt: nowIso,
    };

    saveSyncStore(store);

    return res.json({
      success: true,
      message: "Dati sincronizzati con successo sul cloud",
      updatedAt: nowIso,
    });
  });

  // Serve Vite in dev mode or static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server Curamente running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start Curamente server:", err);
});
