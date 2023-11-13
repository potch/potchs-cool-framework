import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve, extname } from "node:path";

import { setDoc } from "./pcf.js";
import { location, routeResponded } from "./router.js";
import { document as mockDoc } from "./ssr.js";
setDoc(mockDoc);

import { App } from "./src/app.js";
import { todos } from "./src/todos.js";

todos.value = [
  { text: "first", done: false },
  { text: "second", done: true },
];

const render = () => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>app thing</title>
    <link rel="stylesheet" href="/style.css" />
    <script type="module" src="/index.js"></script>
  </head>
  <body>
    ${App().outerHTML}
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
        res.end();
      } catch (e) {
        res.statusCode = 500;
        res.end(e);
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
        const ext = extname(filePath).slice(1);
        if (ext in MIMES) {
          res.setHeader("Content-Type", MIMES[ext]);
        }
        return res.end(content);
      } catch (e) {
        res.statusCode = "404";
        res.end("Not Found");
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
