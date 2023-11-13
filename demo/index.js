import { location } from "../src/router.js";
import { $ } from "../src/pcf.js";
import { App } from "./app.js";
import { todos } from "./todos.js";

location.value = new URL(window.location);

todos.value = JSON.parse($('[data-signal="todos"]').innerText);

fetch("/todos").then(r => r.json()).then(t => {
  todos.value = t
  
  todos.watch((o) => {
    localStorage.setItem("todos", JSON.stringify(o));
    fetch("/todos", {
      method: "post",
      body: JSON.stringify(o.map(({ text, done }) => ({ text, done }))),
    });
  });
  
  document.body.replaceChildren(App());
});

