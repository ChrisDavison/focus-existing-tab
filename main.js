var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.js
var main_exports = {};
__export(main_exports, {
  default: () => FocusExistingTabPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");

// node_modules/monkey-around/dist/index.mjs
function around(obj, factories) {
  const removers = Object.keys(factories).map((key) => around1(obj, key, factories[key]));
  return removers.length === 1 ? removers[0] : function() {
    removers.forEach((r) => r());
  };
}
function around1(obj, method, createWrapper) {
  const inherited = obj[method], hadOwn = obj.hasOwnProperty(method), original = hadOwn ? inherited : function() {
    return Object.getPrototypeOf(obj)[method].apply(this, arguments);
  };
  let current = createWrapper(original);
  if (inherited)
    Object.setPrototypeOf(current, inherited);
  Object.setPrototypeOf(wrapper, current);
  obj[method] = wrapper;
  return remove;
  function wrapper(...args) {
    if (current === original && obj[method] === wrapper)
      remove();
    return current.apply(this, args);
  }
  function remove() {
    if (obj[method] === wrapper) {
      if (hadOwn)
        obj[method] = original;
      else
        delete obj[method];
    }
    if (current === original)
      return;
    current = original;
    Object.setPrototypeOf(wrapper, inherited || Function);
  }
}

// src/main.js
var leafPath = (leaf) => {
  var _a, _b;
  return (_b = (_a = leaf.getViewState()) == null ? void 0 : _a.state) == null ? void 0 : _b.file;
};
var FocusExistingTabPlugin = class extends import_obsidian.Plugin {
  onload() {
    const plugin = this;
    this.register(
      around(import_obsidian.WorkspaceLeaf.prototype, {
        openFile(next) {
          return function(file, state) {
            const existing = plugin.findExisting(this, file);
            if (!existing) return next.call(this, file, state);
            return plugin.focus(this, existing, state);
          };
        }
      })
    );
  }
  // Look only in the target's tab group, so splits can still show a note twice.
  findExisting(target, file) {
    if (!file || !target.parent || leafPath(target) === file.path) return null;
    let match = null;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (!match && leaf !== target && leaf.parent === target.parent && leafPath(leaf) === file.path) {
        match = leaf;
      }
    });
    return match;
  }
  async focus(target, existing, state) {
    var _a;
    const { workspace } = this.app;
    if (((_a = target.view) == null ? void 0 : _a.getViewType()) === "empty") target.detach();
    if ((state == null ? void 0 : state.active) !== false) workspace.setActiveLeaf(existing, { focus: true });
    if (state == null ? void 0 : state.eState) existing.setEphemeralState(state.eState);
  }
};
