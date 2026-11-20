import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, test } from "node:test";
import { SeedInventory } from "./inventory.mjs";

const directories = [];
function fixture() {
	const directory = mkdtempSync(join(tmpdir(), "seed-inventory-"));
	directories.push(directory);
	const file = join(directory, "seeds.json");
	return { file, inventory: new SeedInventory(file) };
}
afterEach(() => {
	for (const directory of directories.splice(0))
		rmSync(directory, { recursive: true, force: true });
});

test("receives, withdraws and reloads persisted counts", () => {
	const { file, inventory } = fixture();
	assert.deepEqual(inventory.list(), []);
	assert.deepEqual(inventory.addVariety("pea", "Peas", 4), { id: "pea", name: "Peas", packets: 4 });
	assert.equal(inventory.receive("pea", 3).packets, 7);
	assert.equal(inventory.withdraw("pea", 2).packets, 5);
	assert.deepEqual(new SeedInventory(file).list(), [{ id: "pea", name: "Peas", packets: 5 }]);
});

test("rejects invalid counts and insufficient stock without changing stored data", () => {
	const { file, inventory } = fixture();
	inventory.addVariety("pea", "Peas", 2);
	const before = readFileSync(file, "utf8");
	for (const count of [
		-1,
		0,
		0.5,
		Number.NaN,
		Number.POSITIVE_INFINITY,
		"2",
		Number.MAX_SAFE_INTEGER + 1,
	]) {
		assert.throws(() => inventory.receive("pea", count));
		assert.throws(() => inventory.withdraw("pea", count));
	}
	assert.throws(() => inventory.withdraw("pea", 3));
	assert.throws(() => inventory.receive("pea", Number.MAX_SAFE_INTEGER));
	assert.equal(readFileSync(file, "utf8"), before);
	assert.equal(inventory.list()[0].packets, 2);
});

test("validates varieties, unknown IDs and initial counts", () => {
	const { inventory } = fixture();
	for (const count of [
		-1,
		0.5,
		Number.NaN,
		Number.POSITIVE_INFINITY,
		"2",
		Number.MAX_SAFE_INTEGER + 1,
	])
		assert.throws(() => inventory.addVariety("bad", "Bad count", count));
	for (const value of ["", " ", " leading", "trailing ", null, 3]) {
		assert.throws(() => inventory.addVariety(value, "Peas"));
		assert.throws(() => inventory.addVariety("pea", value));
	}
	inventory.addVariety("pea", "Peas");
	assert.throws(() => inventory.addVariety("pea", "Duplicate"));
	assert.throws(() => inventory.receive("missing", 1));
	assert.throws(() => inventory.withdraw("missing", 1));
	assert.deepEqual(inventory.list(), [{ id: "pea", name: "Peas", packets: 0 }]);
});

test("returns detached records in id order", () => {
	const { inventory } = fixture();
	const added = inventory.addVariety("pea", "Peas", 2);
	added.packets = 100;
	inventory.addVariety("bean", "Beans");
	const received = inventory.receive("pea", 1);
	received.packets = 200;
	const withdrawn = inventory.withdraw("pea", 1);
	withdrawn.packets = 300;
	const listed = inventory.list();
	listed[1].packets = 400;
	assert.deepEqual(inventory.list(), [
		{ id: "bean", name: "Beans", packets: 0 },
		{ id: "pea", name: "Peas", packets: 2 },
	]);
});

test("rejects corrupt storage without overwriting it", () => {
	const { file } = fixture();
	for (const text of [
		"{broken",
		"{}",
		'[{"id":"pea","name":"Peas","packets":-1}]',
		'[{"id":"pea","name":"Peas","packets":0},{"id":"pea","name":"Peas","packets":1}]',
	]) {
		writeFileSync(file, text);
		assert.throws(() => new SeedInventory(file));
		assert.equal(readFileSync(file, "utf8"), text);
	}
});
