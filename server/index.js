import express from "express";
import logger from "morgan";
import dotenv from "dotenv";
import { createClient } from "@libsql/client";
import { Server } from "socket.io";
import { createServer } from "node:http";

dotenv.config();
const PORT = process.env.PORT ?? 4321;

const db = createClient({
  url: "libsql://skilled-bug-xavigomez.turso.io",
  authToken: process.env.DB_TOKEN,
});

await db.execute(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT
  )
`);

const app = express();
const server = createServer(app);
const io = new Server(server);

io.on("connection", async (socket) => {
  console.log("A user has connected.");

  socket.on("chat message", async (msg) => {
    let result;
    try {
      result = await db.execute({
        sql: `INSERT INTO messages (message) VALUES (:msg)`,
        args: { msg },
      });
    } catch (e) {
      throw new Error(e);
    }
    io.emit("chat message", msg, result.lastInsertRowid.toString());
  });

  socket.on("disconnect", () => {
    console.log("A user has disconnected");
  });

  if (!socket.recovered) {
    try {
      const results = await db.execute({
        sql: "SELECT message FROM messages WHERE id > ?",
        args: [socket.handshake.auth.serverOffset ?? 0],
      });

      results.rows.forEach((row) => {
        socket.emit("chat message", row.message, row.id);
      });
    } catch (e) {
      throw new Error(e);
    }
  }
});

app.use(logger("dev"));

app.get("/", (req, res) => {
  res.sendFile(`${process.cwd()}/client/index.html`);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
