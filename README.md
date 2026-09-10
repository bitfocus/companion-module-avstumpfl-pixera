# companion-module-avstumpfl-pixera

Companion module for AV Stumpfl Pixera. See [HELP.md](companion/HELP.md) and [LICENSE](LICENSE).

## Development

Requires **Node 22.20 or newer** (`^22.20`). That is the version supported by both
`@companion-module/base` v2 and `@companion-module/tools` v3, and it matches the `node22`
runtime declared in [companion/manifest.json](companion/manifest.json).

The repo ships a [.node-version](.node-version), so with [fnm](https://github.com/Schniz/fnm)
or nvm your shell switches automatically when you enter the directory:

```sh
fnm install 22   # once
yarn install
```

On a newer Node, yarn refuses with `The engine "node" is incompatible`. That is correct:
Companion runs this module on Node 22. If you see that error while fnm is set up, your shell
predates the fnm setup — `exec zsh` reloads it. `yarn dev` also warns on its own when you are
running a different Node than the `node22` runtime from the manifest.

### Testing locally without Companion

`tools/dev.mjs` loads the module outside of Companion, so you can inspect definitions and fire
actions without restarting anything.

```sh
yarn dev                              # config, actions and feedbacks at a glance
yarn dev check                        # validate definitions + dry-run every callback
yarn dev show timeline_next_cue       # option fields of one action, including visibility rules
yarn dev connect --host 10.0.0.5      # connect to a live Pixera, stream the module log
yarn dev action timeline_transport --host 10.0.0.5 --timeline_transport_type=1
```

`check` is the quickest guard after a change: it catches function properties on option fields
(which do not survive the IPC boundary to Companion), duplicate field ids, and visibility
expressions that reference an unknown field.

Host and port can also come from `PIXERA_HOST` / `PIXERA_PORT`.

For a short feedback loop while writing:

```sh
yarn dev:watch    # re-runs 'check' on every change in src/ or tools/
```

That uses the built-in `--watch` of Node 22; any other dev command can be run the same way,
for example `node --watch-path=src tools/dev.mjs connect --host 10.0.0.5` to reconnect after
every save.

### Testing in Companion itself

Companion loads modules from a **dev folder**. Point it at the *parent* directory, not at the
module itself — if the repo lives in `~/companion-modules/companion-module-avstumpfl-pixera`,
the path is `~/companion-modules`.

- **Desktop:** launcher → cog (Advanced Settings) → Developer → *Select*, and turn on
  *Enable Developer Modules*.
- **Headless / from source:** `COMPANION_DEV_MODULES=<path>` (may live in a `.env` in the
  Companion source), or the CLI flag `--extra-module-path <path>`. When running Companion from
  source, the `module-local-dev` directory in the repo is read as well.

Companion detects file changes and restarts only this module; other connections keep running.
You can force a reload by disabling and re-enabling the connection. A dev module with the same
id overrides the bundled version.

### Debugging

- `this.log('debug', '...')` and `console.log(...)` both end up on the module log page
  (via the menu on the connections page).
- For breakpoints: create an empty `DEBUG-INSPECT` file (no extension) in the module root, or
  put a fixed port number in it. Then start *Attach to module in Companion* from
  [.vscode/launch.json](.vscode/launch.json) (port 9229). The file is in `.gitignore`.
  Note that `init()` cannot be debugged reliably this way, because startup has a timeout.

### Publishing

```sh
yarn check:module   # validates the manifest and package structure
yarn package        # builds the distribution package
```

This version requires **Companion 4.3 or newer** (module-base v2).

`@companion-module/base` is deliberately pinned to **~2.0.4**. Each Companion release supports a
limited range of module-base minors, and Companion 4.3 supports v1.0 - v2.0. Installing base 2.1.x
makes Companion refuse to start the module with:

```
error Instance/ProcessManager Module Api version is too new/old: "pixera" 2.1.3
```

Only raise the pin once a Companion release supporting that minor is out; the table in
`node_modules/@companion-module/base/README.md` is the reference.
