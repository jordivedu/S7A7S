import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, "basketstat.db"));

// ... (rest of the database initialization remains the same)
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    number TEXT,
    club_name TEXT,
    club_logo TEXT,
    player_image TEXT
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    category TEXT,
    rival TEXT,
    season TEXT,
    is_home INTEGER DEFAULT 1,
    team_score INTEGER DEFAULT 0,
    rival_score INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    pir INTEGER DEFAULT 0,
    two_made INTEGER DEFAULT 0,
    two_missed INTEGER DEFAULT 0,
    three_made INTEGER DEFAULT 0,
    three_missed INTEGER DEFAULT 0,
    ft_made INTEGER DEFAULT 0,
    ft_missed INTEGER DEFAULT 0,
    off_reb INTEGER DEFAULT 0,
    def_reb INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    steals INTEGER DEFAULT 0,
    turnovers INTEGER DEFAULT 0,
    blocks INTEGER DEFAULT 0,
    FOREIGN KEY (player_id) REFERENCES players (id)
  );
`);

// Migration for existing databases
try {
  db.prepare("ALTER TABLE matches ADD COLUMN is_home INTEGER DEFAULT 1").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE matches ADD COLUMN team_score INTEGER DEFAULT 0").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE matches ADD COLUMN rival_score INTEGER DEFAULT 0").run();
} catch (e) {}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get("/api/players", (req, res) => {
    const players = db.prepare("SELECT * FROM players").all();
    res.json(players);
  });

  app.post("/api/players", (req, res) => {
    const { name, number, club_name, club_logo, player_image } = req.body;
    const info = db.prepare(
      "INSERT INTO players (name, number, club_name, club_logo, player_image) VALUES (?, ?, ?, ?, ?)"
    ).run(name, number, club_name, club_logo, player_image);
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/matches", (req, res) => {
    const { player_id } = req.query;
    let query = "SELECT matches.*, players.name as player_name FROM matches JOIN players ON matches.player_id = players.id";
    let params = [];
    if (player_id) {
      query += " WHERE player_id = ?";
      params.push(player_id);
    }
    query += " ORDER BY date DESC";
    const matches = db.prepare(query).all(...params);
    res.json(matches);
  });

  app.post("/api/matches", (req, res) => {
    const {
      player_id, date, category, rival, season, is_home, team_score, rival_score,
      points, pir, two_made, two_missed, three_made, three_missed,
      ft_made, ft_missed, off_reb, def_reb, assists, steals, turnovers, blocks
    } = req.body;
    
    const info = db.prepare(`
      INSERT INTO matches (
        player_id, date, category, rival, season, is_home, team_score, rival_score,
        points, pir, two_made, two_missed, three_made, three_missed,
        ft_made, ft_missed, off_reb, def_reb, assists, steals, turnovers, blocks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      player_id, date, category, rival, season, is_home, team_score, rival_score,
      points, pir, two_made, two_missed, three_made, three_missed,
      ft_made, ft_missed, off_reb, def_reb, assists, steals, turnovers, blocks
    );
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/matches/:id", (req, res) => {
    const { id } = req.params;
    const {
      player_id, date, category, rival, season, is_home, team_score, rival_score,
      points, pir, two_made, two_missed, three_made, three_missed,
      ft_made, ft_missed, off_reb, def_reb, assists, steals, turnovers, blocks
    } = req.body;
    
    db.prepare(`
      UPDATE matches SET
        player_id = ?, date = ?, category = ?, rival = ?, season = ?, is_home = ?, team_score = ?, rival_score = ?,
        points = ?, pir = ?, two_made = ?, two_missed = ?, three_made = ?, three_missed = ?,
        ft_made = ?, ft_missed = ?, off_reb = ?, def_reb = ?, assists = ?, steals = ?, turnovers = ?, blocks = ?
      WHERE id = ?
    `).run(
      player_id, date, category, rival, season, is_home, team_score, rival_score,
      points, pir, two_made, two_missed, three_made, three_missed,
      ft_made, ft_missed, off_reb, def_reb, assists, steals, turnovers, blocks,
      id
    );
    res.json({ success: true });
  });

  app.delete("/api/matches/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM matches WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/stats/averages", (req, res) => {
    const { player_id, season } = req.query;
    let query = `
      SELECT 
        COUNT(*) as games_played,
        AVG(points) as avg_points,
        AVG(pir) as avg_pir,
        AVG(two_made) as avg_two_made,
        AVG(three_made) as avg_three_made,
        AVG(ft_made) as avg_ft_made,
        AVG(off_reb + def_reb) as avg_rebounds,
        AVG(assists) as avg_assists,
        AVG(steals) as avg_steals,
        AVG(turnovers) as avg_turnovers,
        AVG(blocks) as avg_blocks
      FROM matches
      WHERE 1=1
    `;
    let params = [];
    if (player_id) {
      query += " AND player_id = ?";
      params.push(player_id);
    }
    if (season) {
      query += " AND season = ?";
      params.push(season);
    }
    const stats = db.prepare(query).get(...params);
    res.json(stats);
  });

  // Serve PWA manifest directly with correct MIME type
  app.get("/manifest.json", (req, res) => {
    res.setHeader("Content-Type", "application/manifest+json");
    res.json({
      "name": "S7A7S Basket Stats",
      "short_name": "S7A7S",
      "start_url": "/",
      "display": "standalone",
      "background_color": "#ffffff",
      "theme_color": "#ea580c",
      "icons": [
        {
          "src": "https://placehold.co/192x192/ea580c/white/png?text=S7A7S",
          "sizes": "192x192",
          "type": "image/png"
        },
        {
          "src": "https://placehold.co/512x512/ea580c/white/png?text=S7A7S",
          "sizes": "512x512",
          "type": "image/png"
        }
      ]
    });
  });

  // Serve Service Worker directly
  app.get("/sw.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    res.send(`
      self.addEventListener('install', (e) => self.skipWaiting());
      self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
      self.addEventListener('fetch', (e) => e.respondWith(fetch(e.request)));
    `);
  });

  app.use(express.static(path.join(__dirname, "public")));

  // Vite middleware for development or if dist doesn't exist
  const isProd = process.env.NODE_ENV === "production" && fs.existsSync(path.join(__dirname, "dist"));
  
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
