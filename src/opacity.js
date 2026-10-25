const { combineRgb } = require('@companion-module/base');

// reply ids used by the opacity requests, handled through dials.handleDialReply
const ID_LAYER_GETOPACITY = 63;
const ID_TIMELINE_GETOPACITY = 64;

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

function newState() {
	return { opacity: null, pending: [], requested: false, localAt: 0, active: false };
}

module.exports = {
	resetOpacityState() {
		let self = this;
		//timeline handle -> {opacity, pending, requested, localAt}
		self.TIMELINE_OPACITY = {};
		//layer handle -> {opacity, pending, requested, localAt, active}
		self.LAYER_OPACITY = {};
	},

	getOpacityActions() {
		let self = this;
		let actions = {};
		let valueOption = {
			type: 'number',
			label: 'Opacity (%)',
			id: 'value',
			default: 100,
			min: 0,
			max: 100,
			step: 0.1,
			isVisible: (options) => options.mode == 'set',
		};

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
				valueOption,
				...self.stepOptions(' (%)', 1, 10),
			],
			subscribe: (action) => self.registerDial(action.options.dial),
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
				...self.timelineLayerOptions(),
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'mode',
					default: 'increase',
					choices: MODE_CHOICES,
				},
				valueOption,
				...self.stepOptions(' (%)', 1, 10),
			],
			subscribe: (action) => self.registerDial(action.options.dial),
			callback: async (event) => {
				let opt = event.options;
				let op = self.opacityOperation(opt);
				if (!self.forEachTargetLayer(opt, (layer) => self.adjustLayerOpacity(layer, op))) {
					self.log('warn', 'Layer Opacity: no layer selected');
				}
			},
		};

		return actions;
	},

	getOpacityFeedbacks() {
		let self = this;
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
					...self.timelineLayerOptions(
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
		let self = this;
		if (opt.mode == 'set') {
			return { mode: 'set', value: clamp01(parseFloat(opt.value) / 100) };
		}
		if (opt.mode == 'toggle') {
			return { mode: 'toggle' };
		}
		let step = self.currentStep(opt) / 100;
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
			self.TIMELINE_OPACITY[handle] = newState();
		}
		return self.TIMELINE_OPACITY[handle];
	},

	layerOpacityState(handle) {
		let self = this;
		if (!self.LAYER_OPACITY[handle]) {
			self.LAYER_OPACITY[handle] = newState();
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
		self.opacityChanged(self.layerOpacityVariableId(handle), self.layerName(handle) + ' Opacity', value);
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
		for (let i = 0; i < self.CHOICES_TIMELINEFEEDBACK.length; i++) {
			self.requestTimelineOpacity(self.CHOICES_TIMELINEFEEDBACK[i]['handle']);
		}
		for (let handle in self.LAYER_OPACITY) {
			if (self.LAYER_OPACITY[handle].active) {
				self.requestLayerOpacity(parseInt(handle));
			}
		}
	},

	// a get reply: either fills the cache or applies the steps that waited for it
	opacityReply(state, result, apply, changed) {
		let self = this;
		state.requested = false;
		if (result == null) {
			state.pending = [];
			return;
		}
		if (state.pending.length == 0 && Date.now() - state.localAt < self.LOCAL_CHANGE_HOLD) return;
		let value = clamp01(parseFloat(result));
		let pending = state.pending;
		state.pending = [];
		if (pending.length == 0) {
			if (value !== state.opacity) {
				state.opacity = value;
				changed(value);
			}
			return;
		}
		for (let i = 0; i < pending.length; i++) {
			value = self.applyOpacityOperation(value, pending[i]);
		}
		apply(value);
	},

	// returns true when the reply id belongs to the opacity requests
	handleOpacityReply(jsonData) {
		let self = this;
		let context = jsonData.context || {};
		let handle = context['handle'];
		switch (jsonData.id) {
			case ID_LAYER_GETOPACITY: //Pixera.Timelines.Layer.getOpacity
				if (self.LAYER_OPACITY[handle]) {
					self.opacityReply(
						self.LAYER_OPACITY[handle],
						jsonData.result,
						(value) => self.setLayerOpacity(handle, value),
						(value) =>
							self.opacityChanged(self.layerOpacityVariableId(handle), self.layerName(handle) + ' Opacity', value, true)
					);
				}
				return true;
			case ID_TIMELINE_GETOPACITY: //Pixera.Timelines.Timeline.getOpacity
				if (self.TIMELINE_OPACITY[handle]) {
					self.opacityReply(
						self.TIMELINE_OPACITY[handle],
						jsonData.result,
						(value) => self.setTimelineOpacity(handle, value),
						(value) =>
							self.opacityChanged(self.timelineOpacityVariableId(handle), self.timelineName(handle), value, true)
					);
				}
				return true;
		}
		return false;
	},

	opacityChanged(variableId, name, value, fromPoll) {
		let self = this;
		self.dialValueChanged(variableId, name, toPercent(value), fromPoll);
		self.checkFeedbacks('opacity_level');
	},

	timelineOpacityVariableId(handle) {
		let self = this;
		for (let i = 0; i < self.CHOICES_TIMELINEFEEDBACK.length; i++) {
			if (self.CHOICES_TIMELINEFEEDBACK[i]['handle'] == handle) {
				return 'timeline_opacity_' + self.safeId(self.CHOICES_TIMELINEFEEDBACK[i]['name']);
			}
		}
		return null;
	},

	layerOpacityVariableId(handle) {
		let self = this;
		let prefix = self.layerVariablePrefix(handle);
		return prefix ? prefix + '_opacity' : null;
	},

	// {variableId, name, value} for every timeline and layer
	opacityVariables() {
		let self = this;
		let list = [];
		let timelines = self.dialTimelineChoices();
		for (let i = 0; i < timelines.length; i++) {
			let state = self.TIMELINE_OPACITY[timelines[i].id];
			list.push({
				variableId: self.timelineOpacityVariableId(timelines[i].id),
				name: 'Timeline Opacity (%): ' + timelines[i].label,
				value: state && state.opacity != null ? toPercent(state.opacity) : null,
			});
			let layers = self.TIMELINE_LAYERS[timelines[i].id] || [];
			for (let k = 0; k < layers.length; k++) {
				let layerState = self.LAYER_OPACITY[layers[k]];
				list.push({
					variableId: self.layerOpacityVariableId(layers[k]),
					name: 'Layer Opacity (%): ' + self.layerName(layers[k]),
					value: layerState && layerState.opacity != null ? toPercent(layerState.opacity) : null,
				});
			}
		}
		return list;
	},

	opacityPresets(category, timeline) {
		let self = this;
		let presets = {};
		presets['timeline_opacity_dial_' + timeline] = self.dialPreset(
			category,
			self.timelineName(timeline) + ' Opacity',
			self.timelineOpacityVariableId(timeline),
			'%',
			'timeline_' + timeline + '_opacity',
			'timeline_opacity_adjust',
			{ timeline: timeline },
			1,
			10
		);
		let layers = self.TIMELINE_LAYERS[timeline] || [];
		for (let k = 0; k < layers.length; k++) {
			let options = { timeline: timeline };
			options['layer_' + timeline] = layers[k];
			presets['layer_opacity_dial_' + layers[k]] = self.dialPreset(
				category,
				self.LAYER_INFO[layers[k]].name + ' Opacity',
				self.layerOpacityVariableId(layers[k]),
				'%',
				'layer_' + layers[k] + '_opacity',
				'layer_opacity_adjust',
				options,
				1,
				10
			);
		}
		return presets;
	},
};
