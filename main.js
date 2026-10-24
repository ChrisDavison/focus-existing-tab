// Focuses a note's existing tab instead of opening a duplicate. Wraps
// WorkspaceLeaf.openFile, which links, the quick switcher and the file
// explorer all call, so the check runs before the new tab is painted.
const { Plugin, WorkspaceLeaf } = require("obsidian");

const leafPath = (leaf) => leaf.getViewState()?.state?.file;

module.exports = class FocusExistingTabPlugin extends Plugin {
  onload() {
    const proto = WorkspaceLeaf.prototype;
    const original = proto.openFile;
    const plugin = this;
    proto.openFile = function (file, state) {
      const existing = plugin.findExisting(this, file);
      if (!existing) return original.call(this, file, state);
      return plugin.focus(this, existing, file, state);
    };
    this.unpatch = () => { proto.openFile = original; };
  }

  onunload() {
    if (this.unpatch) this.unpatch();
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

  async focus(target, existing, file, state) {
    const { workspace } = this.app;
    // A fresh tab from getLeaf("tab") is still empty here; close it unseen.
    if (target.view?.getViewType() === "empty") target.detach();
    if (state?.active !== false) workspace.setActiveLeaf(existing, { focus: true });
    // Reapply the requested state, e.g. a heading or block subpath.
    if (state?.eState) existing.setEphemeralState(state.eState);
  }
};
