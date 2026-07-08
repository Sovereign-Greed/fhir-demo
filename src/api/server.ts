import { config } from "../config.js";
import { getDb } from "../db/connection.js";
import { createApp } from "./app.js";

getDb();

const app = createApp();

const server = app.listen(config.apiPort, () => {
  console.log(`API listening on http://localhost:${config.apiPort}`);
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${config.apiPort} is already in use.`);
    process.exit(1);
  }

  throw error;
});
