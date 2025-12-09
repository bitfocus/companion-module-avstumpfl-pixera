module.exports = {
	updateVariables() {
		let self = this;
		let variables = [];

		for (let i = 0; i < self.CHOICES_TIMELINEFEEDBACK.length; i++) {
			let timeline = self.CHOICES_TIMELINEFEEDBACK[i];
			let name = timeline.name;
			// Skip if name is not yet loaded (default is '0')
			if (name && name !== '0') {
				let safeName = name.replace(/[^a-zA-Z0-9-_]/g, '_');
				variables.push({ variableId: `timeline_${safeName}_time`, name: `Timeline ${name} Time` });
				variables.push({ variableId: `timeline_${safeName}_countdown`, name: `Timeline ${name} Countdown` });
				variables.push({ variableId: `timeline_${safeName}_transport`, name: `Timeline ${name} Transport` });
			}
		}

		self.setVariableDefinitions(variables);
	}
}

