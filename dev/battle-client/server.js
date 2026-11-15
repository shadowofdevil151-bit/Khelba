import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.BATTLE_TEST_CLIENT_PORT || 4173);
const host = process.env.BATTLE_TEST_CLIENT_HOST || "127.0.0.1";

const html = "text/html; charset=utf-8";
const css = "text/css; charset=utf-8";
const js = "text/javascript; charset=utf-8";

// Only these files are ever served (server.js and anything else stay private).
const assets = new Map([
  ["/", { file: "index.html", type: html }],
  ["/index.html", { file: "index.html", type: html }],
  ["/style.css", { file: "style.css", type: css }],
  ["/academic.css", { file: "academic.css", type: css }],
  ["/client.js", { file: "client.js", type: js }],
  ["/academic.js", { file: "academic.js", type: js }]
]);

const baseHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store"
};

const send = (response, status, body = "", headers = {}) => {
  response.writeHead(status, {
    ...baseHeaders,
    "Content-Type": "text/plain; charset=utf-8",
    ...headers
  }).end(body);
};

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    send(response, 405, "Method not allowed", { Allow: "GET, HEAD" });
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    send(response, 400, "Invalid URL");
    return;
  }

  if (pathname === "/favicon.ico") {
    response.writeHead(204, baseHeaders).end();
    return;
  }

  const asset = assets.get(pathname);
  if (!asset) {
    send(response, 404, "Not found");
    return;
  }

  try {
    const contents = await readFile(resolve(root, asset.file));
    response.writeHead(200, {
      ...baseHeaders,
      "Content-Type": asset.type,
      "Content-Length": contents.length
    });
    response.end(request.method === "HEAD" ? undefined : contents);
  } catch (error) {
    console.error(`Failed to read ${asset.file}:`, error.message);
    send(response, error.code === "ENOENT" ? 404 : 500,
      error.code === "ENOENT" ? "Not found" : "Unable to read test client asset");
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Set BATTLE_TEST_CLIENT_PORT to another port.`);
  } else {
    console.error("Server error:", error.message);
  }
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`Khelba console:  http://${host}:${port}   (Battle)`);
  console.log(`                 http://${host}:${port}/#academic   (Academic)`);
  console.log(`Add this exact origin to ALLOWED_ORIGINS (http://localhost:${port} and http://127.0.0.1:${port} are different origins).`);
});

const stop = () => {
  server.close(() => process.exit(0));
  server.closeAllConnections?.();
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);