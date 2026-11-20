# Run the Jarvistark CLI

Use the absolute `SKILL.md` path provided by Codex for the active Jarvistark skill. The plugin root is two directories above the skill’s own directory (`<plugin-root>/skills/<skill-name>/`). The installed CLI is `bin/jarvistark.mjs` under that root. This works for the entry skill and each workflow skill.

Use Node 22 or later and verify the executable with `node "/absolute/path/to/plugin/bin/jarvistark.mjs" --help`. Run workspace commands with the absolute path to the app:

```sh
node "/absolute/path/to/plugin/bin/jarvistark.mjs" --workspace "/absolute/path/to/app" status
```

Use the verified invocation wherever a skill example says `jarvistark`. Pass it to the next skill with the app path.

For a skill loaded from source, use a `jarvistark` executable on PATH or a user-supplied built CLI path such as `node "/absolute/path/to/Jarvistark/apps/cli/dist/main.js"`.

## Workspace review

Run `review` for a requirements or architecture checkpoint. For a final task review that can start a build, run `review --build`. For a planning-only request, use `review`. Open one window per checkpoint. Tell the person to select the items they have read and enter their name. They can approve selected claims, reject claims with a reason, approve task revisions, or leave items pending. A changed workspace requires a fresh review.

The command opens the OS browser and waits. Keep its process alive and poll the same command session for the result. If the host sandbox requires permission for loopback or opening the browser, request that permission through the host. Leave the private address, browser forms and decisions with the person. Never drive the review window or script a terminal confirmation on their behalf.

- **Return to Codex** yields `action: reviewed`. Reload `status` and continue the requested planning stage from the recorded decisions.
- **Start next task** yields `action: build`, the workspace, `dispatchId` and the compiled `prompt`. Act as the builder in the current session. Use the same CLI and workspace to run `begin-build DISPATCH_ID` before editing. Its successful result contains the exact reviewed prompt and the attempt ID. Carry it out through [implementation and verification](../../jarvistark-implementation/SKILL.md). A failed claim means the work moved or another consumer took it. Inspect `status` before doing anything else.
- If the window closes before returning a result, end that waiting command and reopen review. Saved decisions survive. If a build request is interrupted before pickup, reopen `review --build` to recover it, or use its recorded event ID with `begin-build`. An in-progress attempt is visible in `status`.

On a host without a local desktop browser, the person can use the interactive `approve` and `reject` commands with the same CLI and workspace. Confirm the outcomes in `status`. A requested build can then use `next` and `start` through the implementation skill.
