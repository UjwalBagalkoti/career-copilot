import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matchHandler from "./api/match.js";
import questionsHandler from "./api/questions.js";
import feedbackHandler from "./api/feedback.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, "dist");
const port = Number(process.env.PORT || 3000);

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(body);
}

function makeResponse(res) {
  return {
    status(code) { res.statusCode = code; return this; },
    json(data) { sendJson(res, res.statusCode || 200, data); },
  };
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

const handlers = {
  "/api/match": matchHandler,
  "/api/questions": questionsHandler,
  "/api/feedback": feedbackHandler,
};

const server = http.createServer(async (req, res) => {
  try {
    if (handlers[req.url]) {
      if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
      req.body = await readBody(req);
      return handlers[req.url](req, makeResponse(res));
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      return sendJson(res, 405, { error: "Method not allowed" });
    }

    let requestPath = new URL(req.url, "http://localhost").pathname;
    if (requestPath === "/") requestPath = "/index.html";
    let filePath = path.resolve(dist, "." + requestPath);
    if (!filePath.startsWith(path.resolve(dist) + path.sep)) return sendJson(res, 403, { error: "Forbidden" });
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) filePath = path.join(dist, "index.html");

    const types = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".svg": "image/svg+xml",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".ico": "image/x-icon"
    };
    res.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "application/octet-stream" });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) sendJson(res, 500, { error: error.message || "Internal server error" });
    else res.end();
  }
});

server.listen(port, "0.0.0.0", () => console.log(`Career Copilot listening on ${port}`));
