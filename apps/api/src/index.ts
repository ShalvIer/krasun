import { createServer } from "node:http";
import { createApp } from "./app.js";
import { createSocketServer } from "./sockets/index.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";

const app = createApp();
const server = createServer(app);
app.locals.io = createSocketServer(server);
const port = env.PORT ?? env.API_PORT;
server.listen(port, "0.0.0.0", () =>
  console.info(`Krasun API listening on http://0.0.0.0:${port}`)
);

async function shutdown() {
  server.close();
  await prisma.$disconnect();
}
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
