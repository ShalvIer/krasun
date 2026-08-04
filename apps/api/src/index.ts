import { createServer } from "node:http";
import { createApp } from "./app.js";
import { createSocketServer } from "./sockets/index.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";

const app = createApp();
const server = createServer(app);
app.locals.io = createSocketServer(server);
server.listen(env.API_PORT, () => console.info(`Krasun API listening on http://localhost:${env.API_PORT}`));

async function shutdown() {
  server.close();
  await prisma.$disconnect();
}
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
