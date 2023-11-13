// potch's cool framework!

let doc = globalThis.document;

// utils

const FUNCTION = "function";
const UNDEF = "undefined";
const is = (v, t) => typeof v === t;
const on = (el, event, options) => (
  el.addEventListener(event, options),
  () => el.removeEventListener(event, options)
);

// reactive thingies

// reactive value source thingy
const signal = (value) => {
  const subs = new Set();
  const set = (v) => {
    value = v;
    subs.forEach((s) => s(value));
  };
  return {
    get value() {
      return value;
    },
    set value(v) {
      if (value !== v) set(v);
    },
    watch(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    compute(fn) {
      return computed(fn, this);
    },
    switch(t, f) {
      return this.compute((v) =>
        v ? (is(t, FUNCTION) ? t(v) : t) : is(f, FUNCTION) ? f(v) : f
      );
    },
  };
};

// derived reactive thingy
const computed = (fn, ...deps) => {
  const update = () => fn(...deps.map((d) => d.value));
  const s = signal(update());

  // watch referenced signals and recompute
  deps.forEach((dep) => dep.watch(() => (s.value = update())));

  return s;
};

// helper for object signals, to make props computed signals
const record = (sig) => {
  const memo = new Map();
  return new Proxy(sig, {
    get(s, f) {
      if (!memo.has(f)) {
        memo.set(
          f,
          s.compute((v) => v && v[f])
        );
      }
      return memo.get(f);
    },
    set(s, k, v) {
      s.value = Object.assign({}, s.value, { [k]: v });
      return true;
    },
  });
};

const signalToNodes = (v) => {
  if (is(v, UNDEF) || v === null) return [];
  return (Array.isArray(v) ? v.flat() : [v]).map((val) =>
    val.nodeType ? val : doc.createTextNode(val.toString())
  );
};

const setProp = (el, key, value) => {
  if (is(value, FUNCTION) || is(value, "object") || key in el) {
    el[key] = value === null ? "" : value;
  } else {
    if (
      value !== null &&
      (value !== false || key.startsWith("aria-") || key.startsWith("data-"))
    ) {
      el.setAttribute(key, value);
    } else {
      el.removeAttribute(key);
    }
  }
};

// dom creation
const makeDom = (tag, props = {}, ...children) => {
  // components and component-like things
  if (is(tag, FUNCTION)) {
    const result = tag(props, ...children);
    return result;
  }
  const el = doc.createElement(tag);
  if (props) {
    Object.entries(props).forEach(([key, value]) => {
      if (key === "ref" && value.watch) {
        el.ref = value;
        return (value.value = el);
      }
      if (value.watch) {
        value.watch((v) => setProp(el, key, v));
        setProp(el, key, value.value);
      } else {
        setProp(el, key, value);
      }
    });
  }
  let childNodes = [];
  children = children.flat();
  for (let c of children) {
    if (is(c, FUNCTION)) {
      childNodes.push(c(el));
    } else if (c.watch || c.then) {
      const insertionPoint = doc.createComment("");

      const update = (v) => {
        while (nodes.length) {
          const n = nodes.pop();
          if (n.ref) {
            n.ref.value = null;
          }
          n.remove();
        }
        nodes = signalToNodes(v);
        nodes.forEach((n) =>
          insertionPoint.parentNode.insertBefore(n, insertionPoint)
        );
      };

      let nodes = signalToNodes(c.value);
      if (c.watch) {
        c.watch(update);
      }
      if (c.then) {
        c.then(update);
      }

      childNodes.push(...nodes, insertionPoint);
    } else {
      childNodes.push(c);
    }
  }
  childNodes.forEach((c) => !is(c, UNDEF) && el.append(c));
  return el;
};

const dom = new Proxy(makeDom, {
  get:
    (d, tag) =>
    (...args) =>
      d(tag, ...args),
  apply: (d, t, args) => d(...args),
});

const location = signal();
const paramsRoot = signal({});
const routeResponded = signal(false);
const params = record(paramsRoot);

const navigate = (url) => {
  paramsRoot.value = {};
  routeResponded.value = false;
  location.value = url || new URL(location.value);
};

if (globalThis.window) {
  on(window, "click", (e) => {
    if (!e.target.href) return;
    const url = e.target.href && new URL(e.target.href);
    if (url && url.origin === location.value.origin) {
      e.preventDefault();
      history.pushState({}, "", url.href);
      navigate(url);
    }
  });

  on(window, "popstate", () => navigate());
}

const Route = ({ match, pattern, handler }, ...children) => {
  let paramTokens = [];

  if (!match && pattern) {
    const parts = pattern.split("/");
    parts.forEach((p, i) => {
      if (p[0] === ":") paramTokens.push([p.slice(1), i]);
    });

    match = (l) => {
      const pathParts = l.pathname.split("/");
      return (
        pathParts.length === parts.length &&
        pathParts.reduce(
          (m, p, i) => m && (p === parts[i] || parts[i][0] === ":"),
          true
        )
      );
    };
  }

  const active = computed((l) => match && match(l), location);
  active.watch((isActive) => {
    if (isActive) {
      routeResponded.value = true;
    }
  });

  if (paramTokens.length) {
    active.watch((isActive) => {
      if (isActive) {
        const path = location.value.pathname.split("/");
        paramTokens.forEach(([p, i]) => (params[p] = path[i]));
      }
    });
  }

  return computed(
    (active) => (active ? (handler && handler()) || children : undefined),
    active
  );
};

const Link = ({ href, ...props }, ...children) =>
  dom.a(
    {
      href,
      ...props,
      class: computed((l) => (l.pathname === href ? "active" : ""), location),
    },
    ...children
  );

const todos = signal([]);

const addTodo = (text) => {
  todos.value = [...todos.value, { text, done: false }];
};
const updateTodo = (index, obj) => {
  const t = todos.value;
  const todo = t[index];
  todos.value = Object.assign([], t, { [index]: { ...todo, ...obj } });
};
const deleteTodo = (todo) => {
  todos.value = todos.value.filter((t) => t !== todo);
};

const Todo = ({ todo, index }) => {
  const r = record(signal(todo));
  const editField = signal(null);
  editField.watch((e) => e && requestAnimationFrame(() => e.select()));
  return dom.li(
    { class: "todo" },
    dom.input({
      type: "checkbox",
      checked: r.done,
      onclick: (e) => updateTodo(index, { done: !!e.target.checked }),
    }),
    r.editing.switch(
      (t) =>
        dom.input({
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
        dom.span(
          {
            onclick: () => updateTodo(index, { editing: true }),
          },
          r.text
        )
    ),
    r.done.switch((t) =>
      dom.button({ class: "icon", onclick: () => deleteTodo(todo) }, "🗑️")
    )
  );
};

const TodoList = () =>
  dom.div(
    { class: "content" },
    dom.ul(
      { class: "todos" },
      computed((t) => t.map((todo, i) => Todo({ todo, index: i })), todos)
    ),
    dom.form(
      {
        onsubmit: (e) => {
          e.preventDefault();
          addTodo(e.target.elements.todo.value);
          e.target.reset();
        },
        onclick: console.log,
      },
      dom.input({ type: "text", name: "todo" }),
      dom.button({ class: "icon" }, "➕")
    )
  );

const App = () =>
  dom.div(
    { class: "app" },
    dom.header(
      {},
      dom.h1({}, "Todos"),
      Link({ href: "/" }, "home"),
      Link({ href: "/about" }, "about")
    ),
    Route({ pattern: "/", handler: TodoList }),
    Route({ pattern: "/about" }, dom.h1({}, "About"))
  );

location.value = new URL(window.location);

let initialData;
try {
  initialData = JSON.parse(localStorage.getItem("todos"));
} catch (e) {}

todos.value = initialData || [
  { text: "first", done: false },
  { text: "second", done: true },
];

todos.watch((o) => localStorage.setItem("todos", JSON.stringify(o)));

document.body.replaceChildren(App());
