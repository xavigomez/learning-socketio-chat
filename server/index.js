import express from "express";
import logger from "morgan";

const port = process.env.PORT ?? 4321;
const app = express();

app.use(logger("dev"));

app.get("/", (req, res) => {
  res.send("<h1>Chat thingy here</h1>");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
