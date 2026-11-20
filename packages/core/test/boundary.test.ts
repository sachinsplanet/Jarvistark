import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function getAllTsFiles(dir: string): string[] {
	const files: string[] = [];
	for (const entry of readdirSync(dir)) {
		const fullPath = join(dir, entry);
		const stat = statSync(fullPath);
		if (stat.isDirectory()) {
			files.push(...getAllTsFiles(fullPath));
		} else if (fullPath.endsWith(".ts") && !fullPath.endsWith(".d.ts")) {
			files.push(fullPath);
		}
	}
	return files;
}

describe("packages/core architectural boundary test", () => {
	it("enforces zero forbidden imports across packages/core/src", () => {
		const srcDir = join(__dirname, "../src");
		const tsFiles = getAllTsFiles(srcDir);
		expect(tsFiles.length).toBeGreaterThan(15);

		// Forbidden imports: node built-ins, network, filesystem, external models
		const forbiddenPatterns = [
			/\bfrom\s+["']node:/,
			/\bfrom\s+["'](fs|path|crypto|net|http|https|child_process|os|cluster|dgram|dns|tls)["']/,
			/\bfrom\s+["'](openai|@anthropic-ai|@ai-sdk|ai)["']/,
			/\bimport\s*\(\s*["']node:/,
			/\brequire\s*\(\s*["']node:/,
		];

		const violations: { file: string; line: string }[] = [];

		for (const file of tsFiles) {
			const content = readFileSync(file, "utf-8");
			const lines = content.split("\n");

			for (const line of lines) {
				const trimmed = line.trim();
				// Ignore comment lines
				if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
					continue;
				}

				for (const pattern of forbiddenPatterns) {
					if (pattern.test(trimmed)) {
						violations.push({ file, line: trimmed });
					}
				}
			}
		}

		expect(
			violations,
			`Core boundary violation! Found forbidden external imports:\n${JSON.stringify(violations, null, 2)}`,
		).toEqual([]);
	});
});
