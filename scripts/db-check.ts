import { closeDb, getDb, listTables } from "../src/db/connection.js";
import { resolveDatabasePath } from "../src/config.js";

const db = getDb();
const tables = listTables();

console.log(`Database: ${resolveDatabasePath()}`);
console.log(`Tables: ${tables.join(", ")}`);

closeDb();
