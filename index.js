import { location } from "./router.js";
import { App } from "./src/app.js";
import { todos } from "./src/todos.js";

location.value = new URL(window.location);

let initialData;
try {
  initialData = JSON.parse(localStorage.getItem("todos"));
} catch (e) {}

todos.value = initialData || [
  { text: "first", done: false },
  { text: "second", done: true },
];

todos.watch((o) => {
  localStorage.setItem("todos", JSON.stringify(o));
  fetch("/todos", { method: "post", body: JSON.stringify(o) });
});

document.body.replaceChildren(App());
