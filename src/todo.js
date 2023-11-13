import { dom as _, signal, record } from "../pcf.js";
import { updateTodo, deleteTodo } from "./todos.js";

export const Todo = ({ todo, index }) => {
  const r = record(signal(todo));
  const editField = signal(null);
  editField.watch((e) => e && requestAnimationFrame(() => e.select()));
  return _.li(
    { class: "todo" },
    _.input({
      type: "checkbox",
      checked: r.done,
      onclick: (e) => updateTodo(index, { done: !!e.target.checked }),
    }),
    r.editing.switch(
      (t) =>
        _.input({
          type: "text",
          value: r.text,
          ref: editField,
          onblur: (e) =>
            updateTodo(index, { text: e.target.value, editing: false }),
          onkeydown: (e) => {
            if (e.key === "Enter")
              updateTodo(index, { text: e.target.value, editing: false });
            if (e.key === "Escape") updateTodo(index, { editing: false });
          },
        }),
      (f) =>
        _.span(
          {
            onclick: () => updateTodo(index, { editing: true }),
          },
          r.text
        )
    ),
    r.done.switch((t) =>
      _.button({ class: "icon", onclick: () => deleteTodo(todo) }, "🗑️")
    )
  );
};
