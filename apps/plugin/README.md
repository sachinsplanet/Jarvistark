# Install Jarvistark in Codex

You need Node.js 22 or later and a Codex version with the `codex plugin add` command. The plugin includes the Jarvistark CLI and its runtime dependencies.

Extract the archive to a directory you can keep, or use the `dist/jarvistark-codex` directory from the source build. In a terminal, register the extracted `jarvistark-codex` directory and install the plugin.

```sh
codex plugin marketplace add "/absolute/path/to/jarvistark-codex"
codex plugin add jarvistark@jarvistark-local
```

Open a new Codex chat in your app workspace. Type `$jarvistark` and select **Jarvistark Planning** in the skill picker. In a plain-text prompt, use the qualified name.

```text
$jarvistark:jarvistark Help me plan a Community Seed Library where volunteers can track seed varieties and packet counts.
```

The entry skill guides intake, environment inspection, architecture review, and task planning. It can implement approved tasks and record check evidence when you ask. The agent opens a local workspace review. Enter your name, select claims or tasks, and approve them. Choose **Return to Codex** to continue planning. When you ask to build, **Start next task** sends the displayed coding prompt to the waiting Codex session. The bundled CLI records decisions and check evidence in the app workspace.

To invoke a workflow skill directly, select it in the picker or use one of these names.

- `$jarvistark:jarvistark-intake`
- `$jarvistark:jarvistark-environment`
- `$jarvistark:jarvistark-architecture`
- `$jarvistark:jarvistark-task-planning`
- `$jarvistark:jarvistark-prompts`
- `$jarvistark:jarvistark-implementation`

For direct CLI use, run `node "/absolute/path/to/jarvistark-codex/plugins/jarvistark/bin/jarvistark.mjs" --help`. Pass `--workspace "/absolute/path/to/app"` for commands that operate on your app.
