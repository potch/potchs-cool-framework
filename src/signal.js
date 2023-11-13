// reactive value source thingy
const signal = (value) => {
  let subs = new Set();
  return {
    get value() {
      return value;
    },
    set value(v) {
      if (value !== v) {
        value = v;
        subs.forEach((s) => s(value));
      }
    },
    watch(fn, runNow = false) {
      subs.add(fn);
      if (runNow) fn(value);
      return () => subs.delete(fn);
    },
  };
};

// side effect
const effect = (fn, ...deps) => {
  let update = () => fn(...deps.map((d) => d.value));
  let subs = deps.map((dep) => dep.watch(update));
  return [update, () => subs.forEach((f) => f())];
};

// derived reactive value thingy
const computed = (fn, ...deps) => {
  let s = signal();
  let [update] = effect((...vals) => (s.value = fn(...vals)), ...deps);
  update();
  return s;
};

export { signal, computed, effect };
