const { combineRgb } = require('@companion-module/base');

// reply ids used by the opacity requests, handled in Pixera.processReceivedData
const ID_TIMELINE_GETLAYERS = 62;
const ID_LAYER_GETOPACITY = 63;
const ID_TIMELINE_GETOPACITY = 64;
const ID_LAYER_GETNAME = 65;

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
		//layer handle -> {opacity, pending, requested, localAt, active}
		self.LAYER_OPACITY = {};
		//timeline handle -> layer handles, filled from Pixera.Timelines.Timeline.getLayers
		self.TIMELINE_LAYERS = {};
		//layer handle -> {name, timeline}
		self.LAYER_INFO = {};
		self.OPACITY_LAST_POLL = 0;
		clearTimeout(self.OPACITY_REFRESH_TIMER);
	},

	// timelines without the "Selected Timeline" and empty placeholder entries
	opacityTimelineChoices() {
		let self = this;
		let choices = [];
		for (let i = 0; i < self.CHOICES_TIMELINEFEEDBACK.length; i++) {
			let timeline = self.CHOICES_TIMELINEFEEDBACK[i];
			if (timeline['name'] === '0') continue; //attributes not received yet
			choices.push({ id: timeline['handle'], label: timeline['name'] });
		}
		return choices;
	},

	layerChoices(timelineHandle) {
		let self = this;
		let layers = self.TIMELINE_LAYERS[timelineHandle] || [];
		return layers.map((handle) => ({
			id: handle,
			label: self.LAYER_INFO[handle] ? self.LAYER_INFO[handle].name : 'Layer ' + handle,
		}));
	},

	// one layer dropdown per timeline, only the one for the chosen timeline is shown
	layerDropdowns(visibleWhen) {
		let self = this;
		let timelines = self.opacityTimelineChoices();
		let options = [];
		for (let i = 0; i < timelines.length; i++) {
			let choices = self.layerChoices(timelines[i].id);
			options.push({
				type: 'dropdown',
				label: 'Layer',
				id: 'layer_' + timelines[i].id,
				default: choices.length > 0 ? choices[0].id : '',
				choices: choices,
				// isVisible is sent to the UI as source, so the timeline comes in through isVisibleData
				isVisible: visibleWhen,
				isVisibleData: { timeline: timelines[i].id },
			});
		}
		return options;
	},

	selectedLayer(opt) {
		let layer = parseInt(opt['layer_' + opt.timeline]);
		return isNaN(layer) ? null : layer;
	},

	requestTimelineLayers(timelineHandle) {
		let self = this;
		if (!self.pixera || timelineHandle == null || timelineHandle < 0) return;
		self.pixera.sendParams(ID_TIMELINE_GETLAYERS, 'Pixera.Timelines.Timeline.getLayers', {
			handle: timelineHandle,
		});
	},

	// layers can be added or renamed in Pixera at any time
	refreshTimelineLayers() {
		let self = this;
		for (let i = 0; i < self.CHOICES_TIMELINEFEEDBACK.length; i++) {
			self.requestTimelineLayers(self.CHOICES_TIMELINEFEEDBACK[i]['handle']);
		}
	},

	// layer replies arrive one by one, rebuild the dropdowns once they settle
	scheduleOpacityRefresh() {
		let self = this;
		clearTimeout(self.OPACITY_REFRESH_TIMER);
		self.OPACITY_REFRESH_TIMER = setTimeout(() => {
			self.updateActions();
			self.initFeedbacks();
			self.updateOpacityVariableDefinitions();
			self.updateOpacityPresets();
		}, 200);
	},

	getOpacityActions() {
		let self = this;
		let actions = {};
		let layerTimelines = self.opacityTimelineChoices();

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
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'timeline',
					default: layerTimelines.length > 0 ? layerTimelines[0].id : '',
					choices: layerTimelines,
				},
				...self.layerDropdowns((options, data) => options.timeline == data.timeline),
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
				let layer = self.selectedLayer(opt);
				if (layer == null) {
					self.log('warn', 'Layer Opacity: no layer selected');
					return;
				}
				self.adjustLayerOpacity(layer, self.opacityOperation(opt));
			},
		};

		return actions;
	},

	getOpacityFeedbacks() {
		let self = this;
		let timelineChoices = self.opacityTimelineChoices();
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
						default: timelineChoices.length > 0 ? timelineChoices[0].id : '',
						choices: timelineChoices,
					},
					...self.layerDropdowns(
						(options, data) => options.target == 'layer' && options.timeline == data.timeline
					),
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
						let layer = self.selectedLayer(opt);
						if (layer == null) return false;
						let state = self.layerOpacityState(layer);
						state.active = true;
						if (state.opacity == null) {
							self.requestLayerOpacity(layer);
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

	layerOpacityState(handle) {
		let self = this;
		if (!self.LAYER_OPACITY[handle]) {
			self.LAYER_OPACITY[handle] = {
				opacity: null,
				pending: [],
				requested: false,
				localAt: 0,
				active: false,
			};
		}
		return self.LAYER_OPACITY[handle];
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

	adjustLayerOpacity(handle, op) {
		let self = this;
		let state = self.layerOpacityState(handle);
		// only layers someone controls get polled
		state.active = true;
		if (op.mode != 'set' && state.opacity == null) {
			state.pending.push(op);
			self.requestLayerOpacity(handle);
			return;
		}
		self.setLayerOpacity(handle, self.applyOpacityOperation(state.opacity, op));
	},

	setLayerOpacity(handle, value) {
		let self = this;
		let state = self.layerOpacityState(handle);
		state.opacity = value;
		state.localAt = Date.now();
		self.pixera.sendParams(0, 'Pixera.Timelines.Layer.setOpacity', {
			handle: handle,
			value: value,
		});
		self.opacityChanged(self.layerOpacityVariableId(handle), self.layerName(handle), value);
	},

	requestLayerOpacity(handle) {
		let self = this;
		let state = self.layerOpacityState(handle);
		if (state.requested || !self.pixera) return;
		state.requested = true;
		self.pixera.sendParams(ID_LAYER_GETOPACITY, 'Pixera.Timelines.Layer.getOpacity', {
			handle: handle,
		});
	},

	pollOpacity() {
		let self = this;
		let now = Date.now();
		if (now - self.OPACITY_LAST_POLL < POLL_MIN_INTERVAL) return;
		self.OPACITY_LAST_POLL = now;
		for (let i = 0; i < self.CHOICES_TIMELINEFEEDBACK.length; i++) {
			self.requestTimelineOpacity(self.CHOICES_TIMELINEFEEDBACK[i]['handle']);
		}
		for (let handle in self.LAYER_OPACITY) {
			if (self.LAYER_OPACITY[handle].active) {
				self.requestLayerOpacity(parseInt(handle));
			}
		}
	},

	// returns true when the reply id belongs to the opacity requests
	handleOpacityReply(jsonData) {
		let self = this;
		let context = jsonData.context || {};
		let result = jsonData.result;
		switch (jsonData.id) {
			case ID_TIMELINE_GETLAYERS: //Pixera.Timelines.Timeline.getLayers
				{
					let timeline = context['handle'];
					if (timeline == null || !Array.isArray(result)) return true;
					let previous = self.TIMELINE_LAYERS[timeline] || [];
					self.TIMELINE_LAYERS[timeline] = result;
					for (let i = 0; i < result.length; i++) {
						let isNew = !self.LAYER_INFO[result[i]];
						if (isNew) {
							self.LAYER_INFO[result[i]] = { name: 'Layer ' + (i + 1), timeline: timeline };
						}
						self.pixera.sendParams(ID_LAYER_GETNAME, 'Pixera.Timelines.Layer.getName', {
							handle: result[i],
						});
						// fill the variables once, after that only layers in use are polled
						if (isNew) self.requestLayerOpacity(result[i]);
					}
					if (previous.join(',') !== result.join(',')) {
						self.scheduleOpacityRefresh();
					}
				}
				return true;
			case ID_LAYER_GETNAME: //Pixera.Timelines.Layer.getName
				{
					let info = self.LAYER_INFO[context['handle']];
					if (!info || result == null || info.name === result) return true;
					info.name = result;
					self.scheduleOpacityRefresh();
				}
				return true;
			case ID_LAYER_GETOPACITY: //Pixera.Timelines.Layer.getOpacity
				{
					let handle = context['handle'];
					let state = self.LAYER_OPACITY[handle];
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
							self.opacityChanged(self.layerOpacityVariableId(handle), self.layerName(handle), value, true);
						}
						return true;
					}
					for (let i = 0; i < pending.length; i++) {
						value = self.applyOpacityOperation(value, pending[i]);
					}
					self.setLayerOpacity(handle, value);
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

	layerName(handle) {
		let self = this;
		let info = self.LAYER_INFO[handle];
		if (!info) return 'Layer ' + handle;
		return self.timelineName(info.timeline) + ' / ' + info.name;
	},

	layerOpacityVariableId(handle) {
		let self = this;
		let info = self.LAYER_INFO[handle];
		if (!info) return null;
		return 'layer_opacity_' + safeId(self.timelineName(info.timeline)) + '_' + safeId(info.name);
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
		for (let timeline in self.TIMELINE_LAYERS) {
			let layers = self.TIMELINE_LAYERS[timeline];
			for (let i = 0; i < layers.length; i++) {
				let id = self.layerOpacityVariableId(layers[i]);
				if (!id || seen[id]) continue;
				seen[id] = true;
				definitions.push({ variableId: id, name: 'Layer Opacity (%): ' + self.layerName(layers[i]) });
				let state = self.LAYER_OPACITY[layers[i]];
				if (state && state.opacity != null) values[id] = toPercent(state.opacity);
			}
		}
		self.setVariableDefinitions(definitions);
		self.setVariableValues(values);
	},

	opacityDialPreset(name, variable, actionId, target) {
		let self = this;
		let action = (mode) => [
			{ actionId: actionId, options: Object.assign({ mode: mode, value: 100, step: 5 }, target) },
		];
		return {
			type: 'button',
			category: 'Opacity Dials (Stream Deck+)',
			name: name + ' opacity dial',
			style: {
				text: name + '\n$(' + self.label + ':' + variable + ')%',
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			options: { rotaryActions: true },
			feedbacks: [],
			steps: [
				{
					// press toggles off/on, turning fades in 5% steps
					down: action('toggle'),
					up: [],
					rotate_left: action('decrease'),
					rotate_right: action('increase'),
				},
			],
		};
	},

	updateOpacityPresets() {
		let self = this;
		let presets = {};
		let timelines = self.opacityTimelineChoices();
		for (let i = 0; i < timelines.length; i++) {
			let timeline = timelines[i].id;
			presets['timeline_opacity_dial_' + timeline] = self.opacityDialPreset(
				timelines[i].label,
				self.timelineOpacityVariableId(timeline),
				'timeline_opacity_adjust',
				{ timeline: timeline }
			);
			let layers = self.TIMELINE_LAYERS[timeline] || [];
			for (let k = 0; k < layers.length; k++) {
				let target = { timeline: timeline };
				target['layer_' + timeline] = layers[k];
				presets['layer_opacity_dial_' + layers[k]] = self.opacityDialPreset(
					self.layerName(layers[k]),
					self.layerOpacityVariableId(layers[k]),
					'layer_opacity_adjust',
					target
				);
			}
		}
		self.setPresetDefinitions(presets);
	},
};
