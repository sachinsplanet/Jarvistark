# Read-only inspection examples

Use checks appropriate to the workspace. Include the working directory when it affects the result. Project files are evidence about the setup. Inspect commands before relying on them and keep project scripts out of the inspection itself.

| Project signals | Declared requirements | Available installation |
|---|---|---|
| Node.js | `package.json` engines, packageManager, dependency groups, the appropriate lockfile, runtime pin, workspace config | `command -v node` and `node --version`. For an npm workspace, use `npm ls --depth=0 --json` in the relevant package. Inspect its JSON and problems together, because an unmet dependency can give a nonzero exit while other versions are still available. For pnpm and Yarn, use the matching manager's local inventory when it is already available. Use its resolver for layouts such as Yarn Plug'n'Play. |
| Python | `pyproject.toml`, requirement and lock files, Python pin, documented virtual environment and extras | Check the interpreter selected for the project with `python --version` and a local inventory such as `python -m pip list --format=json` when pip is available. Verify the interpreter belongs to the intended environment. If the project environment is absent, a global package inventory does not establish which project packages are installed. |
| System tools and services | Setup docs, dev container files, Compose, CI, environment variable names in example files | Use executable resolution and local version checks when safe. A database CLI version verifies only the client. Treat a database, queue, or external API as unverified unless there is separate evidence it is usable for the target checked. |

Avoid Corepack shims, `npx`, or similar wrappers when a version probe could download a tool. Use an already available executable or explicit local installation metadata. Avoid running scripts or imports to discover package versions. With Node, inspect package-manager metadata or installed manifests in the selected workspace when available. A dependency may be hoisted in a monorepo, so a missing subproject `node_modules` directory is inconclusive by itself.

For npm, `npm ls --depth=0 --json --offline --logs-max=0 --no-update-notifier` keeps the inventory local and suppresses logs when npm reports unmet dependencies.

Treat a dev-only install gap as blocking only for the relevant development, build, or test workflow. Check target-specific optional dependencies against the target platform or leave them unverified. Keep committed runtime or platform requirements distinct from findings about the current shell. When pins conflict, show the sources and the decision that would resolve them.
