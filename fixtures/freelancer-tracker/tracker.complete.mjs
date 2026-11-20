export function createTracker() {
	const projects = new Map();
	let nextId = 1;
	const owned = (owner, id) => {
		const project = projects.get(id);
		if (!project || project.owner !== owner) throw new Error("Forbidden");
		return project;
	};
	return {
		createProject(owner, name, rateCents) {
			if (!owner || !name || !Number.isInteger(rateCents) || rateCents < 0)
				throw new Error("Invalid project");
			const id = `project-${nextId++}`;
			projects.set(id, { owner, name, rateCents, hours: [] });
			return id;
		},
		getProject(owner, id) {
			const project = owned(owner, id);
			return { ...project, hours: [...project.hours] };
		},
		recordHours(owner, id, hours) {
			if (!Number.isFinite(hours) || hours <= 0) throw new Error("Invalid hours");
			owned(owner, id).hours.push(hours);
		},
		earnings(owner) {
			return [...projects.values()]
				.filter((p) => p.owner === owner)
				.reduce((total, p) => total + p.hours.reduce((sum, h) => sum + h, 0) * p.rateCents, 0);
		},
	};
}
