import express from "express";
import logger from "morgan";
import { Server } from "socket.io";
import { createServer } from "node:http";

const PORT = process.env.PORT ?? 4321;

const app = express();
const server = createServer(app);
const io = new Server(server);

io.on("connection", (socket) => {
  console.log("A user has connected.");
});

app.use(logger("dev"));

app.get("/", (req, res) => {
  res.sendFile(`${process.cwd()}/client/index.html`);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
