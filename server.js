import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve, extname, basename } from "node:path";

import { setDoc } from "./src/pcf.js";
import { location, routeResponded } from "./src/router.js";
import { document as mockDoc, serializeSignal } from "./src/ssr.js";
setDoc(mockDoc);

import { App } from "./demo/app.js";
import { todos } from "./demo/todos.js";

todos.value = [
  { text: "first", done: false },
  { text: "second", done: true },
  { text: "Though all human population of old together; for sinful men, spring there, with plenty of ruin", done: false }
];

const render = () => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>app thing</title>
    <link rel="stylesheet" href="/style.css" />
    <script type="module" src="/bundle.min.js"></script>
  </head>
  <body>
${App().outerHTML}
    ${serializeSignal('todos', todos)}
  </body>
</html>
`;

const SERVER_ROOT = new URL("http://localhost:8080/");

const MIMES = {
  js: "text/javascript",
  css: "text/css",
  json: "application/json",
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, SERVER_ROOT);
  console.log(req.method, url.pathname);

  const body = new Promise((resolve) => {
    const chunks = [];
    req.on("data", (chunk) => {
      chunks.push(chunk);
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
  });

  req.addListener("close", () => console.log(res.statusCode));
  if (req.method === "POST") {
    if (url.pathname === "/todos") {
      try {
        todos.value = JSON.parse((await body).toString("utf8"));
        res.statusCode = 204;
        return res.end();
      } catch (e) {
        res.statusCode = 500;
        return res.end(e.message);
      }
    }
  }
  if (req.method === "GET") {
    if (url.pathname === "/todos") {
      res.setHeader("Content-Type", MIMES.json);
      return res.end(JSON.stringify(todos.value));
    }

    if (url.pathname.indexOf(".") > -1) {
      try {
        console.log("maybe file");
        const filePath = resolve(".", url.pathname.slice(1));
        const content = readFileSync(filePath);
        let ext = extname(filePath).slice(1);
        if (ext === 'gz') {
          res.setHeader("Content-Encoding", "gzip");
          ext = extname(basename(filePath, '.gz')).slice(1);
        }
        if (ext in MIMES) {
          res.setHeader("Content-Type", MIMES[ext]);
        }
        return res.end(content);
      } catch (e) {
        res.statusCode = "404";
        return res.end("Not Found");
      }
    }

    try {
      console.log("maybe route");
      location.value = url;
      routeResponded.value = false;
      const result = render();
      if (routeResponded.value) {
        console.log("is route");
        return res.end(result);
      }
    } catch (e) {
      console.error(e);
    }

    res.statusCode = "404";
    res.end("Not Found");
  }
});

server.listen(SERVER_ROOT.port, () => {
  console.log("check it out", SERVER_ROOT.href);
});
