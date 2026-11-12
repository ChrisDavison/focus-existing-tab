const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const { runInNewContext } = require("node:vm");

const bundle = readFileSync(require.resolve("../main.js"), "utf8");
const file = { path: "Note.md", extension: "md" };

async function workspace(saved) {
  class WorkspaceLeaf {
    constructor(parent, container, path = file.path, activeTime = 0, type = "markdown") {
      this.parent = parent;
      this.container = container;
      this.path = path;
      this.activeTime = activeTime;
      this.view = { getViewType: () => type, navigation: type === "markdown" };
      this.type = type;
    }
    getContainer() { return this.container; }
    getViewState() { return { type: this.type, state: { file: this.path } }; }
    async openFile(openedFile, state) { this.opened = { file: openedFile, state }; }
    detach() { this.detached = true; }
    setEphemeralState(state) { this.ephemeralState = state; }
    async loadIfDeferred() { this.loaded = true; }
  }
  class Plugin {
    async loadData() { return saved; }
    register() {}
    addSettingTab(tab) { this.settingTab = tab; }
  }
  class PluginSettingTab {}
  const module = { exports: {} };
  runInNewContext(bundle, {
    module,
    require: () => ({ Plugin, PluginSettingTab, WorkspaceLeaf }),
    console,
  });
  const plugin = new module.exports.default();
  const mainWindow = {};
  const popout = {};
  const group = {};
  const leaves = [];
  plugin.app = {
    viewRegistry: { getTypeByExtension: () => "markdown" },
    workspace: {
      rootSplit: mainWindow,
      iterateAllLeaves: (visit) => leaves.forEach(visit),
      setActiveLeaf: (leaf) => { plugin.activeLeaf = leaf; },
    },
  };
  await plugin.onload();
  function add(parent = group, container = mainWindow, path = file.path, time = 0, type = "markdown") {
    const leaf = new WorkspaceLeaf(parent, container, path, time, type);
    leaves.push(leaf);
    return leaf;
  }
  const target = add(group, mainWindow, "Other.md");
  return { plugin, target, add, group, mainWindow, popout, leaves };
}

test("settings load each scope and use all windows for missing or invalid saved data", async () => {
  for (const scope of ["tab-group", "window", "vault"]) {
    const { plugin } = await workspace({ scope });
    assert.equal(plugin.settings.scope, scope);
    assert.ok(plugin.settingTab);
  }
  for (const saved of [undefined, null, {}, { scope: "unknown" }]) {
    const { plugin } = await workspace(saved);
    assert.equal(plugin.settings.scope, "vault");
  }
});

test("tab group scope excludes other groups and windows", async () => {
  const { plugin, target, add, popout } = await workspace({ scope: "tab-group" });
  add({});
  add({}, popout);
  assert.equal(plugin.findExisting(target, file), null);
  const older = add(undefined, undefined, file.path, 1);
  const newer = add(undefined, undefined, file.path, 2);
  assert.equal(plugin.findExisting(target, file), newer);
  older.activeTime = 3;
  assert.equal(plugin.findExisting(target, file), older);
});

test("window scope includes other groups but excludes other windows", async () => {
  const { plugin, target, add, popout } = await workspace({ scope: "window" });
  add({}, popout, file.path, 100);
  assert.equal(plugin.findExisting(target, file), null);
  const sameWindow = add({}, undefined, file.path, 2);
  assert.equal(plugin.findExisting(target, file), sameWindow);
  const sameGroup = add(undefined, undefined, file.path, 1);
  assert.equal(plugin.findExisting(target, file), sameGroup);
});

test("window scope follows a request in a popout window", async () => {
  const { plugin, target, add, popout } = await workspace({ scope: "window" });
  target.container = popout;
  add({}, undefined, file.path, 100);
  const sameWindow = add({}, popout);
  assert.equal(plugin.findExisting(target, file), sameWindow);
});

test("all windows scope ranks group, window, then most recently active other window", async () => {
  const { plugin, target, add, popout } = await workspace();
  add({}, popout, file.path, 9);
  const recentOtherWindow = add({}, {}, file.path, 10);
  assert.equal(plugin.findExisting(target, file), recentOtherWindow);
  const sameWindow = add({}, undefined, file.path, 2);
  assert.equal(plugin.findExisting(target, file), sameWindow);
  const sameGroup = add(undefined, undefined, file.path, 1);
  assert.equal(plugin.findExisting(target, file), sameGroup);
});

test("scope changes take effect for the next open without reloading", async () => {
  const { plugin, target, add } = await workspace({ scope: "tab-group" });
  const existing = add({});
  await target.openFile(file);
  assert.equal(target.opened.file, file);
  assert.equal(plugin.activeLeaf, undefined);
  plugin.settings.scope = "window";
  await target.openFile(file);
  assert.equal(plugin.activeLeaf, existing);
});

test("redirect closes an empty target and applies state to a deferred matching tab", async () => {
  const { plugin, add } = await workspace();
  const existing = add({});
  existing.isDeferred = true;
  const target = add({}, undefined, null, 0, "empty");
  const eState = { subpath: "#Heading" };
  await target.openFile(file, { active: false, eState });
  assert.equal(target.detached, true);
  assert.equal(plugin.activeLeaf, undefined);
  assert.equal(existing.loaded, true);
  assert.equal(existing.ephemeralState, eState);
  assert.equal(target.opened, undefined);
});

test("an explicit new empty window still opens its own copy for every scope", async () => {
  for (const scope of ["tab-group", "window", "vault"]) {
    const { plugin, add, popout } = await workspace({ scope });
    add();
    const target = add({}, popout, null, 0, "empty");
    await target.openFile(file);
    assert.equal(target.opened.file, file);
    assert.equal(plugin.activeLeaf, undefined);
    assert.equal(target.detached, undefined);
  }
});

test("linked views do not match and a target already showing the file stays in place", async () => {
  const { plugin, target, add } = await workspace();
  add(undefined, undefined, file.path, 100, "backlink");
  assert.equal(plugin.findExisting(target, file), null);
  add();
  target.path = file.path;
  assert.equal(plugin.findExisting(target, file), null);
});
