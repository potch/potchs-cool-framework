import { signal, computed, record, on, dom } from "./pcf.js";

export const location = signal();
const paramsRoot = signal({});
export const routeResponded = signal(false);
export const params = record(paramsRoot);

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

export const Route = ({ match, pattern, handler }, ...children) => {
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
  }, true);

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

export const Link = ({ href, ...props }, ...children) =>
  dom.a(
    {
      href,
      ...props,
      class: computed((l) => (l.pathname === href ? "active" : ""), location),
    },
    ...children
  );
