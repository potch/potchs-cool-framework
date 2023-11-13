const nodeMock = {
  append(...nodes) {
    for (let n of nodes) {
      n = n.nodeType ? n : createTextNode(n.toString());
      this.childNodes.push(n);
      n.parentNode = this;
    }
  },
  setAttribute(a, v) {
    this.attributes.set(a, v);
  },
  removeAttribute(a) {
    this.attributes.delete(a);
  },
  insertBefore(node, ref) {
    this.childNodes.splice(this.childNodes.indexOf(ref) - 1, 0, node);
  },
  remove() {
    if (this.parentNode) {
      this.parentNode.childNodes = this.parentNode.childNodes.filter(
        (n) => n !== this
      );
    }
  },
  get outerHTML() {
    let indent = "    ";
    for (let n = this; n.parentNode; n = n.parentNode ) {
      indent+= "  "
    }
    switch (this.nodeType) {
      case 1:
        return (
          indent + "<" +
          this.tagName +
          [...this.attributes]
            .map(([a, v]) => ` ${a}="${v.toString()}"`)
            .join("") +
          (this.childNodes.length
            ? ">\n" +
              this.childNodes.map((n) => n.outerHTML).join("\n") +
              "\n" + indent + "</" +
              this.tagName +
              ">"
            : "/>")
        );
      case 3:
        return indent + this.textContent;
    }
    return "";
  },
};

const _node = (props) => Object.assign(Object.create(nodeMock), props);
const createElement = (tagName) =>
  _node({
    nodeType: 1,
    tagName,
    attributes: new Map(),
    childNodes: [],
  });
const createTextNode = (textContent) => _node({ nodeType: 3, textContent });
const createComment = (data) => _node({ nodeType: 8, data });

export const document = {
  createElement,
  createTextNode,
  createComment,
  body: createElement("body"),
};

export const serializeSignal = (name, s) =>
  `<script type="application/json" data-signal="${name}">${JSON.stringify(
    s.value
  )}</script>`;
