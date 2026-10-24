# Focus Existing Tab

When you open a note that is already open in a tab, this plugin switches to that tab instead of opening a second copy.

It works however you open the note: clicking a link, the quick switcher, the file explorer, search results, bookmarks, or other plugins that open files the standard way. The check runs before the new tab is drawn, so you never see a duplicate tab appear and then close.

## How it differs from similar plugins

- [Mononote](https://github.com/czottmann/obsidian-mononote) has the same goal. It reacts after a tab has become active, so the duplicate tab is opened first and then closed, and it needs *Settings → Editor → Always focus new tabs* turned on. Focus Existing Tab steps in before the duplicate tab is shown and works whether or not new tabs are focused.
- [Opener](https://github.com/aidan-gibson/obsidian-opener) also switched to existing tabs, and opened PDFs in your system's default app. It is no longer maintained and its author recommends Mononote. Focus Existing Tab only handles switching tabs.

## Behaviour

- **Same tab group only.** It only looks for the note among the tabs in the group where the note would open. Splits and popout windows are separate tab groups, so you can still keep the same note side by side in two splits.
- **Heading and block links are applied.** Opening `[[Note#Heading]]` or `[[Note#^block]]` switches to the existing tab and scrolls to the heading or block.
- **The new tab is closed unseen.** When a link would open a new, empty tab, that tab is closed before it is drawn. When a link would replace the note in the current tab, the current tab is left as it is.
- **Requests not to focus are respected.** If a command or plugin opens a note and explicitly asks not to activate it, the existing tab stays in the background.
- **Only file views count.** A local graph, backlinks pane or outline that tracks the note is not treated as an open copy of it.
- **Back and forward history is not covered.** Navigating back or forward in a tab can still show a note that is open in another tab.

## Install

From Obsidian, open *Settings → Community plugins → Browse*, search for "Focus Existing Tab", then install and enable it.

To try a release before it reaches the community plugin directory, install [BRAT](https://github.com/TfTHacker/obsidian42-brat), add the beta plugin `ChrisDavison/focus-existing-tab`, then enable Focus Existing Tab under *Settings → Community plugins*.

You can also install it by hand: copy `main.js` and `manifest.json` from the [latest release](https://github.com/ChrisDavison/focus-existing-tab/releases/latest) into `<vault>/.obsidian/plugins/focus-existing-tab/`, then enable the plugin.

## Limitations

The plugin wraps an internal method that Obsidian uses to open files in a tab, and finds open tabs through parts of the workspace that are not documented. A future Obsidian release could change these and stop the plugin from working. If anything unexpected happens while it searches for an open tab, the plugin steps aside and Obsidian opens the note as usual.

## Development

```sh
npm install
npm run build   # bundles src/main.js into main.js
npm run dev     # rebuilds on change
```

Copy `main.js` and `manifest.json` into a test vault's `.obsidian/plugins/focus-existing-tab/` folder and reload the plugin.

## License

[MIT](LICENSE)
