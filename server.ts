import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import pg from "pg";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Database Connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_9RKBjwDm1xQl@ep-rapid-cloud-a47w0601-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  });

  // Initialize DB
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT,
        image_url TEXT,
        generated_image_url TEXT,
        config JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Database initialized");
  } catch (err) {
    console.error("Database initialization error:", err);
  }

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes
  app.get("/api/conversations", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM conversations ORDER BY created_at DESC");
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    const { name } = req.body;
    try {
      const result = await pool.query(
        "INSERT INTO conversations (name) VALUES ($1) RETURNING *",
        [name || "New Conversation"]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/conversations/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const messages = await pool.query(
        "SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC",
        [id]
      );
      res.json({ messages: messages.rows });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.patch("/api/conversations/:id", async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    try {
      const result = await pool.query(
        "UPDATE conversations SET name = $1 WHERE id = $2 RETURNING *",
        [name, id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.delete("/api/conversations/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM conversations WHERE id = $1", [id]);
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/conversations/:id/messages", async (req, res) => {
    const { id } = req.params;
    const { role, content, image_url, generated_image_url, config } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO messages (conversation_id, role, content, image_url, generated_image_url, config) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [id, role, content, image_url, generated_image_url, config]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.patch("/api/messages/:id", async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;
    try {
      const result = await pool.query(
        "UPDATE messages SET content = $1 WHERE id = $2 RETURNING *",
        [content, id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.delete("/api/messages/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM messages WHERE id = $1", [id]);
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Vite middleware for development
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
