export function createTracker() {
	const projects = new Map();
	let nextId = 1;
	return {
		createProject(owner, name, rateCents) {
			if (!owner || !name || !Number.isInteger(rateCents) || rateCents < 0)
				throw new Error("Invalid project");
			const id = `project-${nextId++}`;
			projects.set(id, { owner, name, rateCents, hours: [] });
			return id;
		},
		getProject(owner, id) {
			const project = projects.get(id);
			if (!project || project.owner !== owner) throw new Error("Forbidden");
			return { ...project, hours: [...project.hours] };
		},
		recordHours() {
			throw new Error("Not implemented");
		},
		earnings() {
			throw new Error("Not implemented");
		},
	};
}
