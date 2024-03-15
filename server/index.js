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
  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT,
    username TEXT
  )
`);

const app = express();
const server = createServer(app);
const io = new Server(server);

io.on("connection", async (socket) => {
  console.log(`User "${socket.handshake.auth.userName}" has connected`);

  socket.on("chat message", async (msg) => {
    let result;
    const userName = socket.handshake.auth.userName;
    try {
        result = await db.execute({
        sql: `INSERT INTO chat_messages (message, username) VALUES (:msg, :userName)`,
        args: { msg, userName },
      });
    } catch (e) {
      throw new Error(e);
    }
    io.emit("chat message", msg, result.lastInsertRowid.toString(), userName);
  });

  socket.on("chat buzz", () => {
    io.emit("chat buzz")
  })

  socket.on("disconnect", () => {
    console.log("A user has disconnected");
  });

  if (!socket.recovered) {
    try {
      const results = await db.execute({
        sql: "SELECT id, message, username FROM chat_messages WHERE id > ?",
        args: [socket.handshake.auth.serverOffset ?? 0],
      });

      results.rows.forEach((row) => {
        socket.emit("chat message", row.message, row.id, row.username);
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
