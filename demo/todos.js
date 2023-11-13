import { signal } from "../src/signal.js";

export const todos = signal([]);

export const addTodo = (text) => {
  todos.value = [...todos.value, { text, done: false }];
};
export const updateTodo = (index, obj) => {
  const t = todos.value;
  const todo = t[index];
  todos.value = Object.assign([], t, { [index]: { ...todo, ...obj } });
};
export const deleteTodo = (todo) => {
  todos.value = todos.value.filter((t) => t !== todo);
};
