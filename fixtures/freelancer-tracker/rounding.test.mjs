import assert from "node:assert/strict";
import test from "node:test";
import { createTracker } from "./tracker.mjs";

test("total earnings round to the nearest whole cent", () => {
	const tracker = createTracker();
	const id = tracker.createProject("alice", "Fractional work", 1001);
	tracker.recordHours("alice", id, 0.333);
	assert.equal(tracker.earnings("alice"), 333);
});
