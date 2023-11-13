import { dom as _ } from "../src/pcf.js";
import { computed } from "../src/signal.js";
import { Route, Link } from "../src/router.js";
import { addTodo, todos } from "./todos.js";
import { Todo } from "./todo.js";

const TodoList = () =>
  _.div(
    { class: "content" },
    _.ul(
      { class: "todos" },
      computed((t) => t.map((todo, i) => Todo({ todo, index: i })), todos)
    ),
    _.form(
      {
        onsubmit: (e) => {
          e.preventDefault();
          addTodo(e.target.elements.todo.value);
          e.target.reset();
        },
        onclick: console.log,
      },
      _.input({ type: "text", name: "todo" }),
      _.button({ class: "icon" }, "➕")
    )
  );

export const App = () =>
  _.div(
    { class: "app" },
    _.header(
      {},
      _.h1({}, "Todos"),
      Link({ href: "/" }, "home"),
      Link({ href: "/about" }, "about")
    ),
    Route({ pattern: "/", handler: TodoList }),
    Route({ pattern: "/about" }, _.h1({}, "About"))
  );
