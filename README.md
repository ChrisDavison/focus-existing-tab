# Focus Existing Tab

When you open a note that is already open in a tab in the same tab group, this plugin focuses that tab instead. It checks before the new tab is drawn, so there is no flash of a duplicate tab being opened and closed. Links, the quick switcher and the file explorer are all covered. Heading and block links are applied to the existing tab. Splits can still show the same note side by side.

## Install

Install with [BRAT](https://github.com/TfTHacker/obsidian42-brat) using `ChrisDavison/focus-existing-tab`, or copy `main.js` and `manifest.json` from the latest release into `<vault>/.obsidian/plugins/focus-existing-tab/`.

To install a local checkout into a vault, run `./copy.sh <vault>`.

## Limitations

It relies on undocumented internals of Obsidian's workspace, so a future Obsidian release could break it.
