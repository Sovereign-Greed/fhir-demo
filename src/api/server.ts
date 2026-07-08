import { config } from "../config.js";
import { getDb } from "../db/connection.js";
import { createApp } from "./app.js";

getDb();

const app = createApp();

app.listen(config.apiPort, () => {
  console.log(`API listening on http://localhost:${config.apiPort}`);
});
