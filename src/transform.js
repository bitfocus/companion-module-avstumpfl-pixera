// reply id used by the transform requests, handled through dials.handleDialReply
const ID_PARAM_GETVALUE = 67;

// layer parameter names appended to the layer's instance path,
// e.g. "Timeline 1.Layer 1" + ".Position.X"
const TRANSFORMS = {
	position: { label: 'Position', param: 'Position', fine: 0.01, coarse: 0.1 },
	scale: { label: 'Size (Scale)', param: 'Scale', fine: 0.01, coarse: 0.1 },
	rotation: { label: 'Rotation', param: 'Rotation', fine: 1, coarse: 10 },
};
const AXES = ['X', 'Y', 'Z'];

const MODE_CHOICES = [
	{ id: 'set', label: 'Set to value' },
	{ id: 'increase', label: 'Increase by step' },
	{ id: 'decrease', label: 'Decrease by step' },
];

function round(value) {
	return Math.round(value * 1000) / 1000;
}

module.exports = {
	resetTransformState() {
		let self = this;
		//"layer:kind:axis" -> {layer, kind, axis, value, pending, requested, localAt, active}
		self.TRANSFORM_VALUES = {};
	},

	getTransformActions() {
		let self = this;
		let actions = {};
		for (let kind in TRANSFORMS) {
			let transform = TRANSFORMS[kind];
			let axes = AXES.map((axis) => ({ id: axis, label: axis }));
			if (kind == 'scale') axes.push({ id: 'all', label: 'All axes (uniform)' });
			actions['layer_' + kind + '_adjust'] = {
				name: 'Layer ' + transform.label + ' Adjust (Set/Step)',
				description:
					'Use Increase on rotate right and Decrease on rotate left of a Stream Deck+ dial',
				options: [
					...self.timelineLayerOptions(),
					{
						type: 'dropdown',
						label: 'Axis',
						id: 'axis',
						default: kind == 'scale' ? 'all' : 'X',
						choices: axes,
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
						label: 'Value',
						id: 'value',
						default: kind == 'scale' ? 1 : 0,
						min: -100000,
						max: 100000,
						step: 0.001,
						isVisible: (options) => options.mode == 'set',
					},
					...self.stepOptions('', transform.fine, transform.coarse),
				],
				subscribe: (action) => {
					self.registerDial(action.options.dial);
					// show the current value as soon as the action is on a button
					let layer = self.selectedLayer(action.options);
					if (layer == null || !AXES.concat('all').includes(action.options.axis)) return;
					let axesInUse = action.options.axis == 'all' ? AXES : [action.options.axis];
					for (let i = 0; i < axesInUse.length; i++) {
						let state = self.transformState(layer, kind, axesInUse[i]);
						if (!state.active) {
							state.active = true;
							self.scheduleDialRefresh();
						}
						self.requestTransform(state);
					}
				},
				callback: async (event) => {
					let opt = event.options;
					let op;
					if (opt.mode == 'set') {
						op = { mode: 'set', value: parseFloat(opt.value) || 0 };
					} else {
						let step = self.currentStep(opt);
						op = { mode: 'step', value: opt.mode == 'decrease' ? -step : step };
					}
					let axesToChange = opt.axis == 'all' ? AXES : [opt.axis];
					let found = self.forEachTargetLayer(opt, (layer) => {
						for (let i = 0; i < axesToChange.length; i++) {
							self.adjustTransform(layer, kind, axesToChange[i], op);
						}
					});
					if (!found) {
						self.log('warn', 'Layer ' + transform.label + ': no layer selected');
					}
				},
			};
		}
		return actions;
	},

	transformState(layer, kind, axis) {
		let self = this;
		let key = layer + ':' + kind + ':' + axis;
		if (!self.TRANSFORM_VALUES[key]) {
			self.TRANSFORM_VALUES[key] = {
				layer: layer,
				kind: kind,
				axis: axis,
				value: null,
				pending: [],
				requested: false,
				localAt: 0,
				active: false,
			};
		}
		return self.TRANSFORM_VALUES[key];
	},

	transformPath(state) {
		let self = this;
		let info = self.LAYER_INFO[state.layer];
		if (!info || !info.path) return null;
		return info.path + '.' + TRANSFORMS[state.kind].param + '.' + state.axis;
	},

	adjustTransform(layer, kind, axis, op) {
		let self = this;
		let state = self.transformState(layer, kind, axis);
		// only parameters someone controls get polled
		let firstUse = !state.active;
		state.active = true;
		if (firstUse) self.scheduleDialRefresh(); //adds the variable
		// steps work from our own cache so fast turns don't wait for a round trip each time
		if (state.value == null || !self.transformPath(state)) {
			if (op.mode == 'set' && self.transformPath(state)) {
				self.setTransform(state, op.value);
				return;
			}
			state.pending.push(op);
			self.requestTransform(state);
			return;
		}
		self.setTransform(state, op.mode == 'set' ? op.value : state.value + op.value);
	},

	setTransform(state, value) {
		let self = this;
		state.value = round(value);
		state.localAt = Date.now();
		self.pixera.sendParams(0, 'Pixera.Compound.setParamValue', {
			path: self.transformPath(state),
			value: state.value,
		});
		self.transformChanged(state, false);
	},

	requestTransform(state) {
		let self = this;
		let path = self.transformPath(state);
		// without the instance path yet, layerPathChanged sends this once it arrives
		if (state.requested || !self.pixera || !path) return;
		state.requested = true;
		self.pixera.sendParams(ID_PARAM_GETVALUE, 'Pixera.Compound.getParamValue', {
			path: path,
		});
	},

	layerPathChanged(layer) {
		let self = this;
		for (let key in self.TRANSFORM_VALUES) {
			let state = self.TRANSFORM_VALUES[key];
			if (state.layer != layer) continue;
			state.requested = false;
			if (state.active || state.pending.length > 0) self.requestTransform(state);
		}
	},

	pollTransforms() {
		let self = this;
		for (let key in self.TRANSFORM_VALUES) {
			if (self.TRANSFORM_VALUES[key].active) {
				self.requestTransform(self.TRANSFORM_VALUES[key]);
			}
		}
	},

	// returns true when the reply id belongs to the transform requests
	handleTransformReply(jsonData) {
		let self = this;
		if (jsonData.id != ID_PARAM_GETVALUE) return false;
		let path = (jsonData.context || {})['path'];
		for (let key in self.TRANSFORM_VALUES) {
			let state = self.TRANSFORM_VALUES[key];
			if (self.transformPath(state) !== path) continue;
			state.requested = false;
			if (jsonData.result == null) {
				if (state.pending.length > 0) {
					self.log('warn', 'Layer parameter not found in Pixera: ' + path);
				}
				state.pending = [];
				continue;
			}
			if (state.pending.length == 0 && Date.now() - state.localAt < self.LOCAL_CHANGE_HOLD) continue;
			let value = parseFloat(jsonData.result);
			let pending = state.pending;
			state.pending = [];
			if (pending.length == 0) {
				if (round(value) !== state.value) {
					state.value = round(value);
					self.transformChanged(state, true);
				}
				continue;
			}
			for (let i = 0; i < pending.length; i++) {
				value = pending[i].mode == 'set' ? pending[i].value : value + pending[i].value;
			}
			self.setTransform(state, value);
		}
		return true;
	},

	transformVariableId(state) {
		let self = this;
		let prefix = self.layerVariablePrefix(state.layer);
		return prefix ? prefix + '_' + state.kind + '_' + state.axis.toLowerCase() : null;
	},

	transformChanged(state, fromPoll) {
		let self = this;
		self.dialValueChanged(
			self.transformVariableId(state),
			self.layerName(state.layer) + ' ' + TRANSFORMS[state.kind].label + ' ' + state.axis,
			state.value,
			fromPoll
		);
	},

	// {variableId, name, value} for the parameters in use; 9 per layer would flood the list
	transformVariables() {
		let self = this;
		let list = [];
		for (let key in self.TRANSFORM_VALUES) {
			let state = self.TRANSFORM_VALUES[key];
			if (!state.active || !self.LAYER_INFO[state.layer]) continue;
			list.push({
				variableId: self.transformVariableId(state),
				name: 'Layer ' + TRANSFORMS[state.kind].label + ' ' + state.axis + ': ' + self.layerName(state.layer),
				value: state.value,
			});
		}
		return list;
	},

	selectedTransformPresets(category) {
		let self = this;
		let presets = {};
		let dials = [
			{ kind: 'position', axis: 'X' },
			{ kind: 'position', axis: 'Y' },
			{ kind: 'scale', axis: 'all' },
			{ kind: 'rotation', axis: 'Z' },
		];
		for (let i = 0; i < dials.length; i++) {
			let dial = dials[i];
			let transform = TRANSFORMS[dial.kind];
			let options = { timeline: self.SELECTED, axis: dial.axis };
			options['layer_' + self.SELECTED] = self.SELECTED;
			let axisLabel = dial.axis == 'all' ? '' : ' ' + dial.axis;
			presets['selected_' + dial.kind + '_' + dial.axis.toLowerCase() + '_dial'] = self.dialPreset(
				category,
				'Selected ' + transform.label.replace(' (Scale)', '') + axisLabel,
				'dial_last_value',
				'',
				'selected_' + dial.kind + '_' + dial.axis.toLowerCase(),
				'layer_' + dial.kind + '_adjust',
				options,
				transform.fine,
				transform.coarse
			);
		}
		return presets;
	},

	transformPresets(category, timeline, layer) {
		let self = this;
		let presets = {};
		let name = self.LAYER_INFO[layer].name;
		let prefix = self.layerVariablePrefix(layer);
		let dials = [
			{ kind: 'position', axis: 'X' },
			{ kind: 'position', axis: 'Y' },
			{ kind: 'scale', axis: 'all', variableAxis: 'X' },
			{ kind: 'rotation', axis: 'Z' },
		];
		for (let i = 0; i < dials.length; i++) {
			let dial = dials[i];
			let transform = TRANSFORMS[dial.kind];
			let options = { timeline: timeline, axis: dial.axis };
			options['layer_' + timeline] = layer;
			let axisLabel = dial.axis == 'all' ? '' : ' ' + dial.axis;
			presets['layer_' + dial.kind + '_' + dial.axis.toLowerCase() + '_dial_' + layer] = self.dialPreset(
				category,
				name + ' ' + transform.label.replace(' (Scale)', '') + axisLabel,
				prefix + '_' + dial.kind + '_' + (dial.variableAxis || dial.axis).toLowerCase(),
				'',
				'layer_' + layer + '_' + dial.kind + '_' + dial.axis.toLowerCase(),
				'layer_' + dial.kind + '_adjust',
				options,
				transform.fine,
				transform.coarse
			);
		}
		return presets;
	},
};
