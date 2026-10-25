const { combineRgb } = require('@companion-module/base');

// reply ids used by the opacity requests, handled in Pixera.processReceivedData
const ID_LAYER_GETINST = 62;
const ID_LAYER_GETOPACITY = 63;
const ID_TIMELINE_GETOPACITY = 64;

// a poll reply that left Pixera before our last set would snap the value back,
// so ignore replies for this long after we changed a value ourselves
const LOCAL_CHANGE_HOLD = 1000;
// polling can run every 50ms, opacity doesn't need to be asked that often
const POLL_MIN_INTERVAL = 250;

const MODE_CHOICES = [
	{ id: 'set', label: 'Set to value' },
	{ id: 'increase', label: 'Increase by step' },
	{ id: 'decrease', label: 'Decrease by step' },
	{ id: 'toggle', label: 'Toggle between 0% and 100%' },
];

const COMPARE_CHOICES = [
	{ id: 'gt', label: 'Greater than' },
	{ id: 'gte', label: 'Greater than or equal' },
	{ id: 'eq', label: 'Equal' },
	{ id: 'lte', label: 'Less than or equal' },
	{ id: 'lt', label: 'Less than' },
];

function clamp01(value) {
	return Math.min(1, Math.max(0, value));
}

// opacity is 0..1 in Pixera; actions and variables work in percent
function toPercent(value) {
	return Math.round(value * 1000) / 10;
}

function safeId(name) {
	return (name + '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

module.exports = {
	resetOpacityState() {
		let self = this;
		//timeline handle -> {opacity, pending, requested, localAt}
		self.TIMELINE_OPACITY = {};
		//layer path -> {handle, opacity, pending, requested, localAt}
		self.LAYER_OPACITY = {};
		self.OPACITY_LAST_POLL = 0;
	},

	getOpacityActions() {
		let self = this;
		let actions = {};

		actions.timeline_opacity_adjust = {
			name: 'Timeline Opacity Adjust (Set/Step)',
			description:
				'Use Increase on rotate right and Decrease on rotate left of a Stream Deck+ dial',
			options: [
				{
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'timeline',
					default: 0,
					choices: self.CHOICES_TIMELINENAME,
				},
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'mode',
					default: 'increase',
					choices: MODE_CHOICES,
				},
				{
					type: 'number',
					label: 'Opacity (%)',
					id: 'value',
					default: 100,
					min: 0,
					max: 100,
					step: 0.1,
					isVisible: (options) => options.mode == 'set',
				},
				{
					type: 'number',
					label: 'Step (%)',
					id: 'step',
					default: 5,
					min: 0.1,
					max: 100,
					step: 0.1,
					isVisible: (options) => options.mode == 'increase' || options.mode == 'decrease',
				},
			],
			callback: async (event) => {
				let opt = event.options;
				let op = self.opacityOperation(opt);
				if (opt.timeline == -1) {
					for (let i = 0; i < self.SELECTEDTIMELINES.length; i++) {
						self.adjustTimelineOpacity(self.SELECTEDTIMELINES[i], op);
					}
				} else {
					self.adjustTimelineOpacity(parseInt(opt.timeline), op);
				}
			},
		};

		actions.layer_opacity_adjust = {
			name: 'Layer Opacity Adjust (Set/Step)',
			description:
				'Use Increase on rotate right and Decrease on rotate left of a Stream Deck+ dial',
			options: [
				{
					type: 'textinput',
					label: 'Layer Path',
					id: 'layerPath',
					default: 'Timeline 1.Layer 1',
					useVariables: true,
				},
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'mode',
					default: 'increase',
					choices: MODE_CHOICES,
				},
				{
					type: 'number',
					label: 'Opacity (%)',
					id: 'value',
					default: 100,
					min: 0,
					max: 100,
					step: 0.1,
					isVisible: (options) => options.mode == 'set',
				},
				{
					type: 'number',
					label: 'Step (%)',
					id: 'step',
					default: 5,
					min: 0.1,
					max: 100,
					step: 0.1,
					isVisible: (options) => options.mode == 'increase' || options.mode == 'decrease',
				},
			],
			callback: async (event) => {
				let opt = event.options;
				let path = (await self.parseVariablesInString(opt.layerPath)).trim();
				if (!path) {
					self.log('warn', 'Layer Opacity: no layer path set');
					return;
				}
				self.adjustLayerOpacity(path, self.opacityOperation(opt));
			},
		};

		return actions;
	},

	getOpacityFeedbacks() {
		let self = this;
		let timelineChoices = self.CHOICES_TIMELINENAME.filter(
			(choice) => choice.id != -1
		);
		return {
			opacity_level: {
				type: 'boolean',
				name: 'Timeline/Layer Opacity Level',
				description:
					'Change the button style when a timeline or layer opacity matches the condition',
				defaultStyle: {
					color: combineRgb(0, 0, 0),
					bgcolor: combineRgb(255, 255, 0),
				},
				options: [
					{
						type: 'dropdown',
						label: 'Target',
						id: 'target',
						default: 'timeline',
						choices: [
							{ id: 'timeline', label: 'Timeline' },
							{ id: 'layer', label: 'Layer' },
						],
					},
					{
						type: 'dropdown',
						label: 'Timeline Name',
						id: 'timeline',
						default: 0,
						choices: timelineChoices,
						isVisible: (options) => options.target == 'timeline',
					},
					{
						type: 'textinput',
						label: 'Layer Path',
						id: 'layerPath',
						default: 'Timeline 1.Layer 1',
						isVisible: (options) => options.target == 'layer',
					},
					{
						type: 'dropdown',
						label: 'Condition',
						id: 'compare',
						default: 'gt',
						choices: COMPARE_CHOICES,
					},
					{
						type: 'number',
						label: 'Opacity (%)',
						id: 'value',
						default: 0,
						min: 0,
						max: 100,
						step: 0.1,
					},
				],
				callback: function (feedback) {
					let opt = feedback.options;
					let opacity = null;
					if (opt.target == 'layer') {
						let path = (opt.layerPath + '').trim();
						if (!path) return false;
						let state = self.layerOpacityState(path);
						if (state.opacity == null) {
							self.requestLayerOpacity(path);
							return false;
						}
						opacity = state.opacity;
					} else {
						let handle = parseInt(opt.timeline);
						let state = self.timelineOpacityState(handle);
						if (state.opacity == null) {
							self.requestTimelineOpacity(handle);
							return false;
						}
						opacity = state.opacity;
					}
					let pct = toPercent(opacity);
					let value = parseFloat(opt.value);
					switch (opt.compare) {
						case 'gte':
							return pct >= value;
						case 'eq':
							return pct == value;
						case 'lte':
							return pct <= value;
						case 'lt':
							return pct < value;
						default:
							return pct > value;
					}
				},
			},
		};
	},

	opacityOperation(opt) {
		if (opt.mode == 'set') {
			return { mode: 'set', value: clamp01(parseFloat(opt.value) / 100) };
		}
		if (opt.mode == 'toggle') {
			return { mode: 'toggle' };
		}
		let step = Math.abs(parseFloat(opt.step) / 100) || 0;
		return { mode: 'step', value: opt.mode == 'decrease' ? -step : step };
	},

	applyOpacityOperation(current, op) {
		if (op.mode == 'set') return op.value;
		if (op.mode == 'toggle') return current > 0 ? 0 : 1;
		return clamp01(current + op.value);
	},

	timelineOpacityState(handle) {
		let self = this;
		if (!self.TIMELINE_OPACITY[handle]) {
			self.TIMELINE_OPACITY[handle] = {
				opacity: null,
				pending: [],
				requested: false,
				localAt: 0,
			};
		}
		return self.TIMELINE_OPACITY[handle];
	},

	layerOpacityState(path) {
		let self = this;
		if (!self.LAYER_OPACITY[path]) {
			self.LAYER_OPACITY[path] = {
				handle: null,
				opacity: null,
				pending: [],
				requested: false,
				localAt: 0,
			};
		}
		return self.LAYER_OPACITY[path];
	},

	adjustTimelineOpacity(handle, op) {
		let self = this;
		if (isNaN(handle) || handle < 0) {
			return;
		}
		let state = self.timelineOpacityState(handle);
		// a relative step needs the current value; keep turning the dial working
		// from our own cache so fast rotations don't wait for a round trip each time
		if (op.mode != 'set' && state.opacity == null) {
			state.pending.push(op);
			self.requestTimelineOpacity(handle);
			return;
		}
		self.setTimelineOpacity(handle, self.applyOpacityOperation(state.opacity, op));
	},

	setTimelineOpacity(handle, value) {
		let self = this;
		let state = self.timelineOpacityState(handle);
		state.opacity = value;
		state.localAt = Date.now();
		self.pixera.sendParams(0, 'Pixera.Timelines.Timeline.setOpacity', {
			handle: handle,
			value: value,
		});
		self.opacityChanged(self.timelineOpacityVariableId(handle), self.timelineName(handle), value);
	},

	requestTimelineOpacity(handle) {
		let self = this;
		let state = self.timelineOpacityState(handle);
		if (state.requested || !self.pixera) return;
		state.requested = true;
		self.pixera.sendParams(ID_TIMELINE_GETOPACITY, 'Pixera.Timelines.Timeline.getOpacity', {
			handle: handle,
		});
	},

	adjustLayerOpacity(path, op) {
		let self = this;
		let state = self.layerOpacityState(path);
		if (state.handle == null || (op.mode != 'set' && state.opacity == null)) {
			state.pending.push(op);
			self.requestLayerOpacity(path);
			return;
		}
		self.setLayerOpacity(path, self.applyOpacityOperation(state.opacity, op));
	},

	setLayerOpacity(path, value) {
		let self = this;
		let state = self.layerOpacityState(path);
		state.opacity = value;
		state.localAt = Date.now();
		self.pixera.sendParams(0, 'Pixera.Timelines.Layer.setOpacity', {
			handle: state.handle,
			value: value,
		});
		self.opacityChanged(self.layerOpacityVariableId(path), path, value);
	},

	requestLayerOpacity(path) {
		let self = this;
		let state = self.layerOpacityState(path);
		if (state.requested || !self.pixera) return;
		state.requested = true;
		if (state.handle == null) {
			self.pixera.sendParams(ID_LAYER_GETINST, 'Pixera.Timelines.Layer.getInst', {
				instancePath: path,
			});
		} else {
			self.pixera.sendParams(ID_LAYER_GETOPACITY, 'Pixera.Timelines.Layer.getOpacity', {
				handle: state.handle,
			});
		}
	},

	pollOpacity() {
		let self = this;
		let now = Date.now();
		if (now - self.OPACITY_LAST_POLL < POLL_MIN_INTERVAL) return;
		self.OPACITY_LAST_POLL = now;
		for (let i = 0; i < self.CHOICES_TIMELINEFEEDBACK.length; i++) {
			self.requestTimelineOpacity(self.CHOICES_TIMELINEFEEDBACK[i]['handle']);
		}
		for (let path in self.LAYER_OPACITY) {
			if (self.LAYER_OPACITY[path].handle != null) {
				self.requestLayerOpacity(path);
			}
		}
	},

	// returns true when the reply id belongs to the opacity requests
	handleOpacityReply(jsonData) {
		let self = this;
		let context = jsonData.context || {};
		let result = jsonData.result;
		switch (jsonData.id) {
			case ID_LAYER_GETINST: //Pixera.Timelines.Layer.getInst
				{
					let path = context['instancePath'];
					if (!self.LAYER_OPACITY[path]) {
						// without a context fall back to the oldest lookup still waiting
						path = Object.keys(self.LAYER_OPACITY).find(
							(key) => self.LAYER_OPACITY[key].requested && self.LAYER_OPACITY[key].handle == null
						);
					}
					let state = self.LAYER_OPACITY[path];
					if (!state) return true;
					state.requested = false;
					if (result == null) {
						self.log('warn', 'Layer Opacity: no layer found at path "' + path + '"');
						state.pending = [];
						return true;
					}
					state.handle = result;
					self.updateOpacityVariableDefinitions();
					self.requestLayerOpacity(path);
				}
				return true;
			case ID_LAYER_GETOPACITY: //Pixera.Timelines.Layer.getOpacity
				{
					for (let path in self.LAYER_OPACITY) {
						let state = self.LAYER_OPACITY[path];
						if (state.handle != context['handle']) continue;
						state.requested = false;
						if (result == null) {
							// the handle went stale (e.g. project reloaded), look it up again next time
							state.handle = null;
							state.pending = [];
							continue;
						}
						if (state.pending.length == 0 && Date.now() - state.localAt < LOCAL_CHANGE_HOLD) continue;
						let value = clamp01(parseFloat(result));
						let pending = state.pending;
						state.pending = [];
						if (pending.length == 0) {
							if (value !== state.opacity) {
								state.opacity = value;
								self.opacityChanged(self.layerOpacityVariableId(path), path, value, true);
							}
							continue;
						}
						for (let i = 0; i < pending.length; i++) {
							value = self.applyOpacityOperation(value, pending[i]);
						}
						self.setLayerOpacity(path, value);
					}
				}
				return true;
			case ID_TIMELINE_GETOPACITY: //Pixera.Timelines.Timeline.getOpacity
				{
					let handle = context['handle'];
					let state = self.TIMELINE_OPACITY[handle];
					if (!state) return true;
					state.requested = false;
					if (result == null) {
						state.pending = [];
						return true;
					}
					if (state.pending.length == 0 && Date.now() - state.localAt < LOCAL_CHANGE_HOLD) return true;
					let value = clamp01(parseFloat(result));
					let pending = state.pending;
					state.pending = [];
					if (pending.length == 0) {
						if (value !== state.opacity) {
							state.opacity = value;
							self.opacityChanged(self.timelineOpacityVariableId(handle), self.timelineName(handle), value, true);
						}
						return true;
					}
					for (let i = 0; i < pending.length; i++) {
						value = self.applyOpacityOperation(value, pending[i]);
					}
					self.setTimelineOpacity(handle, value);
				}
				return true;
		}
		return false;
	},

	opacityChanged(variableId, name, value, fromPoll) {
		let self = this;
		let values = {};
		if (variableId) {
			values[variableId] = toPercent(value);
		}
		// what the dial last touched, so one encoder display can show any target
		if (!fromPoll) {
			values['opacity_last_name'] = name;
			values['opacity_last_value'] = toPercent(value);
		}
		self.setVariableValues(values);
		self.checkFeedbacks('opacity_level');
	},

	timelineName(handle) {
		let self = this;
		for (let i = 0; i < self.CHOICES_TIMELINEFEEDBACK.length; i++) {
			if (self.CHOICES_TIMELINEFEEDBACK[i]['handle'] == handle) {
				return self.CHOICES_TIMELINEFEEDBACK[i]['name'];
			}
		}
		return 'Timeline ' + handle;
	},

	timelineOpacityVariableId(handle) {
		let self = this;
		for (let i = 0; i < self.CHOICES_TIMELINEFEEDBACK.length; i++) {
			if (self.CHOICES_TIMELINEFEEDBACK[i]['handle'] == handle) {
				return 'timeline_opacity_' + safeId(self.CHOICES_TIMELINEFEEDBACK[i]['name']);
			}
		}
		return null;
	},

	layerOpacityVariableId(path) {
		return 'layer_opacity_' + safeId(path);
	},

	updateOpacityVariableDefinitions() {
		let self = this;
		let definitions = [
			{ variableId: 'opacity_last_name', name: 'Opacity: last changed timeline/layer' },
			{ variableId: 'opacity_last_value', name: 'Opacity: last changed value (%)' },
		];
		let values = {};
		let seen = {};
		for (let i = 0; i < self.CHOICES_TIMELINEFEEDBACK.length; i++) {
			let timeline = self.CHOICES_TIMELINEFEEDBACK[i];
			if (timeline['name'] === '0') continue; //attributes not received yet
			let id = self.timelineOpacityVariableId(timeline['handle']);
			if (seen[id]) continue;
			seen[id] = true;
			definitions.push({
				variableId: id,
				name: 'Timeline Opacity (%): ' + timeline['name'],
			});
			let state = self.TIMELINE_OPACITY[timeline['handle']];
			if (state && state.opacity != null) values[id] = toPercent(state.opacity);
		}
		for (let path in self.LAYER_OPACITY) {
			let state = self.LAYER_OPACITY[path];
			if (state.handle == null) continue;
			let id = self.layerOpacityVariableId(path);
			if (seen[id]) continue;
			seen[id] = true;
			definitions.push({ variableId: id, name: 'Layer Opacity (%): ' + path });
			if (state.opacity != null) values[id] = toPercent(state.opacity);
		}
		self.setVariableDefinitions(definitions);
		self.setVariableValues(values);
	},

	updateOpacityPresets() {
		let self = this;
		let presets = {};
		for (let i = 0; i < self.CHOICES_TIMELINEFEEDBACK.length; i++) {
			let timeline = self.CHOICES_TIMELINEFEEDBACK[i];
			if (timeline['name'] === '0') continue;
			let handle = timeline['handle'];
			let variable = self.timelineOpacityVariableId(handle);
			presets['timeline_opacity_dial_' + handle] = {
				type: 'button',
				category: 'Opacity Dials (Stream Deck+)',
				name: timeline['name'] + ' opacity dial',
				style: {
					text: timeline['name'] + '\n$(' + self.label + ':' + variable + ')%',
					size: '14',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 0, 0),
				},
				options: { rotaryActions: true },
				feedbacks: [],
				steps: [
					{
						// press toggles the timeline off/on, turning fades it in 5% steps
						down: [
							{
								actionId: 'timeline_opacity_adjust',
								options: { timeline: handle, mode: 'toggle', value: 100, step: 5 },
							},
						],
						up: [],
						rotate_left: [
							{
								actionId: 'timeline_opacity_adjust',
								options: { timeline: handle, mode: 'decrease', value: 100, step: 5 },
							},
						],
						rotate_right: [
							{
								actionId: 'timeline_opacity_adjust',
								options: { timeline: handle, mode: 'increase', value: 100, step: 5 },
							},
						],
					},
				],
			};
		}
		self.setPresetDefinitions(presets);
	},
};
