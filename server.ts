import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { deployCommands } from "./src/deploy-commands";
import { startBot } from "./src/index";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "8080", 10);

const app = next({ dev, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  await deployCommands();
  await startBot();

  createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  }).listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
