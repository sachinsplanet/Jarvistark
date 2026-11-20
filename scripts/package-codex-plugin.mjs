import { copyFile, cp, mkdir, mkdtemp, rename, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const repo = fileURLToPath(new URL("../", import.meta.url));
const pluginSource = join(repo, "apps/plugin");
const dist = join(repo, "dist");
const destination = join(dist, "jarvistark-codex");
const coreRequire = createRequire(join(repo, "packages/core/package.json"));
const zodDirectory = dirname(coreRequire.resolve("zod/package.json"));

await mkdir(dist, { recursive: true });
const staging = await mkdtemp(join(dist, "jarvistark-codex-"));
try {
	const marketplaceConfig = join(staging, ".agents/plugins");
	const plugin = join(staging, "plugins/jarvistark");
	await Promise.all([
		mkdir(marketplaceConfig, { recursive: true }),
		mkdir(join(plugin, ".codex-plugin"), { recursive: true }),
		mkdir(join(plugin, "bin"), { recursive: true }),
	]);
	await Promise.all([
		copyFile(join(pluginSource, "marketplace.json"), join(marketplaceConfig, "marketplace.json")),
		copyFile(join(pluginSource, "README.md"), join(staging, "README.md")),
		copyFile(
			join(pluginSource, ".codex-plugin/plugin.json"),
			join(plugin, ".codex-plugin/plugin.json"),
		),
		cp(join(pluginSource, "skills"), join(plugin, "skills"), { recursive: true }),
		copyFile(
			join(repo, "apps/cli/dist/workspace-review.html"),
			join(plugin, "bin/workspace-review.html"),
		),
		copyFile(join(repo, "LICENSE"), join(plugin, "LICENSE")),
		copyFile(join(zodDirectory, "LICENSE"), join(plugin, "LICENSE-zod")),
		build({
			absWorkingDir: repo,
			entryPoints: ["apps/cli/dist/main.js"],
			outfile: join(plugin, "bin/jarvistark.mjs"),
			bundle: true,
			platform: "node",
			format: "esm",
			target: "node22",
		}),
	]);
	await rm(destination, { recursive: true, force: true });
	await rename(staging, destination);
} finally {
	await rm(staging, { recursive: true, force: true });
}

console.log(`Packaged Codex marketplace at ${destination}`);
