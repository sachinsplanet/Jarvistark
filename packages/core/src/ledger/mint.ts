import type { CheckId, TaskId } from "../checks/schema.js";
import type { ClaimId } from "../claims/schema.js";
import type { ProposalId } from "../proposals/schema.js";
import type { EventId } from "./schema.js";

/**
 * IdMinter guarantees that IDs are minted only by the engine,
 * are strictly sequential, unique, and never reused across sessions.
 */
export class IdMinter {
	private claimCounter = 0;
	private eventCounter = 0;
	private proposalCounter = 0;
	private taskCounter = 0;
	private checkCounter = 0;

	constructor(initial?: {
		claimCounter?: number;
		eventCounter?: number;
		proposalCounter?: number;
		taskCounter?: number;
		checkCounter?: number;
	}) {
		if (initial?.claimCounter) this.claimCounter = initial.claimCounter;
		if (initial?.eventCounter) this.eventCounter = initial.eventCounter;
		if (initial?.proposalCounter) this.proposalCounter = initial.proposalCounter;
		if (initial?.taskCounter) this.taskCounter = initial.taskCounter;
		if (initial?.checkCounter) this.checkCounter = initial.checkCounter;
	}

	/**
	 * Seed the minter from existing entities so IDs are strictly monotonically increasing.
	 */
	static fromExisting(existing: {
		claims?: { id: string }[];
		events?: { id: string }[];
		proposals?: { id: string }[];
		tasks?: { id: string; checks?: { id: string }[] }[];
	}): IdMinter {
		let maxClaim = 0;
		let maxEvent = 0;
		let maxProposal = 0;
		let maxTask = 0;
		let maxCheck = 0;

		const extractNum = (id: string, prefix: string): number => {
			if (id.startsWith(prefix)) {
				const num = Number.parseInt(id.slice(prefix.length), 10);
				return Number.isNaN(num) ? 0 : num;
			}
			return 0;
		};

		for (const c of existing.claims ?? []) {
			maxClaim = Math.max(maxClaim, extractNum(c.id, "CLM-"));
		}
		for (const e of existing.events ?? []) {
			maxEvent = Math.max(maxEvent, extractNum(e.id, "EVT-"));
		}
		for (const p of existing.proposals ?? []) {
			maxProposal = Math.max(maxProposal, extractNum(p.id, "PRP-"));
		}
		for (const t of existing.tasks ?? []) {
			maxTask = Math.max(maxTask, extractNum(t.id, "TSK-"));
			for (const chk of t.checks ?? []) {
				// Format: CHK-001-1 or CHK-1
				const match = chk.id.match(/^CHK-(\d+)/);
				if (match) {
					maxCheck = Math.max(maxCheck, Number.parseInt(match[1], 10));
				}
			}
		}

		return new IdMinter({
			claimCounter: maxClaim,
			eventCounter: maxEvent,
			proposalCounter: maxProposal,
			taskCounter: maxTask,
			checkCounter: maxCheck,
		});
	}

	mintClaimId(): ClaimId {
		this.claimCounter += 1;
		const padded = String(this.claimCounter).padStart(3, "0");
		return `CLM-${padded}`;
	}

	mintEventId(): EventId {
		this.eventCounter += 1;
		const padded = String(this.eventCounter).padStart(3, "0");
		return `EVT-${padded}`;
	}

	mintProposalId(): ProposalId {
		this.proposalCounter += 1;
		const padded = String(this.proposalCounter).padStart(3, "0");
		return `PRP-${padded}`;
	}

	mintTaskId(): TaskId {
		this.taskCounter += 1;
		const padded = String(this.taskCounter).padStart(3, "0");
		return `TSK-${padded}`;
	}

	mintCheckId(taskNumber?: number): CheckId {
		this.checkCounter += 1;
		const tNum = taskNumber ? String(taskNumber).padStart(3, "0") : "001";
		return `CHK-${tNum}-${this.checkCounter}`;
	}
}
