// Focuses a note's existing tab, in this window or another, instead of
// opening a duplicate. Wraps WorkspaceLeaf.openFile, which links, the quick
// switcher and the file explorer all call, so the check runs before the new
// tab is painted.
import { Plugin, WorkspaceLeaf } from "obsidian";
import { around } from "monkey-around";

const viewState = (leaf) => {
  try {
    return leaf.getViewState();
  } catch {
    return undefined;
  }
};

// Prefer the copy the user touched last when the same file is open more than
// once in a scope.
const newer = (current, leaf) =>
  !current || (leaf.activeTime ?? 0) > (current.activeTime ?? 0) ? leaf : current;

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

  // Look in the target's tab group first, then in any other window. Splits in
  // this window stay separate tab groups, so they can still show a note twice.
  // Any failure falls back to Obsidian's normal behaviour.
  findExisting(target, file) {
    try {
      if (typeof file?.path !== "string" || !target?.parent) return null;
      if (viewState(target)?.state?.file === file.path) return null;
      const type = this.app.viewRegistry?.getTypeByExtension?.(file.extension);
      const targetWindow = target.getContainer?.();
      // "Open in new window" creates an empty popout and then opens the file
      // there. Leave that explicit request alone.
      if (this.isEmptyPopout(target, targetWindow)) return null;
      let sameGroup = null;
      let otherWindow = null;
      this.app.workspace.iterateAllLeaves((leaf) => {
        if (leaf === target || !this.shows(leaf, file, type)) return;
        if (leaf.parent === target.parent) {
          sameGroup = newer(sameGroup, leaf);
        } else if (leaf.getContainer?.() !== targetWindow) {
          otherWindow = newer(otherWindow, leaf);
        }
      });
      return sameGroup || otherWindow;
    } catch (error) {
      console.error("Focus Existing Tab:", error);
      return null;
    }
  }

  // A popout created by "Open in new window" starts with one empty leaf.
  isEmptyPopout(target, container) {
    if (!container || container === this.app.workspace.rootSplit) return false;
    if (target.view?.getViewType?.() !== "empty") return false;
    let leaves = 0;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.getContainer?.() === container) leaves += 1;
      return leaves > 1;
    });
    return leaves === 1;
  }

  // True when the leaf is a file view of this file, not a linked view such as
  // a local graph or backlinks pane that only tracks it.
  shows(leaf, file, type) {
    const vs = viewState(leaf);
    if (vs?.state?.file !== file.path) return false;
    if (type && vs.type === type) return true;
    // Other file views of the same file, e.g. a Kanban board for a Markdown note.
    return !leaf.isDeferred && leaf.view?.navigation === true;
  }

  async focus(target, existing, state) {
    // A fresh tab from getLeaf("tab") is still empty here; close it unseen.
    if (target.view?.getViewType?.() === "empty") target.detach();
    if (state?.active !== false) this.app.workspace.setActiveLeaf(existing, { focus: true });
    // Reapply the requested state, e.g. a heading or block subpath. A tab not
    // shown since startup must load its view first.
    if (state?.eState) {
      if (existing.isDeferred) await existing.loadIfDeferred?.();
      existing.setEphemeralState(state.eState);
    }
  }
}
