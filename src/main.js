// Focuses a note's existing tab instead of opening a duplicate. Wraps
// WorkspaceLeaf.openFile, which links, the quick switcher and the file
// explorer all call, so the check runs before the new tab is painted.
import { Plugin, WorkspaceLeaf } from "obsidian";
import { around } from "monkey-around";

const leafPath = (leaf) => leaf.getViewState()?.state?.file;

export default class FocusExistingTabPlugin extends Plugin {
  onload() {
    const plugin = this;
    this.register(
      around(WorkspaceLeaf.prototype, {
        openFile(next) {
          return function (file, state) {
            const existing = plugin.findExisting(this, file);
            if (!existing) return next.call(this, file, state);
            return plugin.focus(this, existing, state);
          };
        },
      }),
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
    const { workspace } = this.app;
    // A fresh tab from getLeaf("tab") is still empty here; close it unseen.
    if (target.view?.getViewType() === "empty") target.detach();
    if (state?.active !== false) workspace.setActiveLeaf(existing, { focus: true });
    // Reapply the requested state, e.g. a heading or block subpath.
    if (state?.eState) existing.setEphemeralState(state.eState);
  }
}
