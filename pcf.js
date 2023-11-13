// potch's cool framework!

let doc = globalThis.document;
export const setDoc = (d) => (doc = d);

// utils

const FUNCTION = "function";
const UNDEF = "undefined";
export const is = (v, t) => typeof v === t;

// dom stuff
export const $ = (selector, scope = doc) => scope.querySelector(selector);
export const $$ = (selector, scope = doc) => [
  ...scope.querySelectorAll(selector),
];
export const on = (el, event, options) => (
  el.addEventListener(event, options),
  () => el.removeEventListener(event, options)
);

// reactive thingies

// reactive value source thingy
export const signal = (value) => {
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
    watch(fn, runNow = false) {
      subs.add(fn);
      if (runNow) fn(value);
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
export const computed = (fn, ...deps) => {
  const update = () => fn(...deps.map((d) => d.value));
  const s = signal(update());

  // watch referenced signals and recompute
  deps.forEach((dep) => dep.watch(() => (s.value = update())));

  return s;
};

// helper for object signals, to make props computed signals
export const record = (sig) => {
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

export const dom = new Proxy(makeDom, {
  get:
    (d, tag) =>
    (...args) =>
      d(tag, ...args),
  apply: (d, t, args) => d(...args),
});
