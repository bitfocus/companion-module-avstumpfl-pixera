// reply ids used by the transform requests, handled through dials.handleDialReply
const ID_PARAM_GETVALUE = 67;
const ID_LAYER_GETNODES = 69;
const ID_NODE_GETNAME = 70;
const ID_NODE_GETPARAMETERS = 71;
const ID_PARAM_GETNAME = 72;
const ID_NODE_GETVALUES = 73;

// the layer's nodes as named in the timeline UI, each with x/y/z parameters below it
// (Pixera shows "Size" instead of "Scale" when that is set in the general settings)
const TRANSFORMS = {
	position: { label: 'Position', nodes: ['position'], fine: 1, coarse: 10 }, //pixels with "show dims in pixels"
	scale: { label: 'Size (Scale)', nodes: ['scale', 'size'], fine: 1, coarse: 10 }, //absolute pixels in the Pixera UI
	rotation: { label: 'Rotation', nodes: ['rotation'], fine: 1, coarse: 10 },
};
const AXES = ['X', 'Y', 'Z'];
// parameter names as Pixera may show them below a node
const AXIS_NAMES = { X: 'X', Y: 'Y', Z: 'Z', W: 'X', H: 'Y', D: 'Z', WIDTH: 'X', HEIGHT: 'Y', DEPTH: 'Z' };
const UNIFORM_AXES = ['X', 'Y'];

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
		//layer handle -> {requested, params: {"kind:axis": param handle}, index: {"kind:axis": position below the node},
		//                 nodes: {kind: node handle}, scaleValues: last Node.getValues of the size node}
		self.LAYER_PARAMS = {};
		//node handle -> {layer, kind}, param handle -> {layer, kind}
		self.TRANSFORM_NODES = {};
		self.TRANSFORM_PARAMS = {};
		//layer handle -> uniform scale operations waiting for the x/y values
		self.UNIFORM_PENDING = {};
	},

	getTransformActions() {
		let self = this;
		let actions = {};
		for (let kind in TRANSFORMS) {
			let transform = TRANSFORMS[kind];
			let axes = AXES.map((axis) => ({ id: axis, label: axis }));
			if (kind == 'scale') axes.push({ id: 'all', label: 'X and Y (keep aspect ratio)' });
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
						default: kind == 'scale' ? 100 : 0,
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
					let axesInUse = action.options.axis == 'all' ? UNIFORM_AXES : [action.options.axis];
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
					let found = self.forEachTargetLayer(opt, (layer) => {
						if (opt.axis == 'all') {
							self.adjustUniformScale(layer, op);
						} else {
							self.adjustTransform(layer, kind, opt.axis, op);
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

	transformParam(state) {
		let self = this;
		let layerParams = self.LAYER_PARAMS[state.layer];
		if (!layerParams) return null;
		return layerParams.params[state.kind + ':' + state.axis] || null;
	},

	// finds the x/y/z parameters of the Position, Scale/Size and Rotation nodes of a layer:
	// Layer.getNodes -> Node.getName -> Node.getParameters -> Param.getName
	resolveLayerParams(layer) {
		let self = this;
		if (!self.pixera) return;
		let layerParams = self.LAYER_PARAMS[layer];
		if (!layerParams) {
			layerParams = self.LAYER_PARAMS[layer] = { requested: 0, params: {}, index: {}, nodes: {}, scaleValues: null };
		}
		// ask again after a while in case a reply got lost or the layer changed
		if (Date.now() - layerParams.requested < 5000) return;
		layerParams.requested = Date.now();
		self.pixera.sendParams(ID_LAYER_GETNODES, 'Pixera.Timelines.Layer.getNodes', { handle: layer });
	},

	adjustTransform(layer, kind, axis, op) {
		let self = this;
		let state = self.transformState(layer, kind, axis);
		// only parameters someone controls get polled
		let firstUse = !state.active;
		state.active = true;
		if (firstUse) self.scheduleDialRefresh(); //adds the variable
		// steps work from our own cache so fast turns don't wait for a round trip each time
		if (!self.transformParam(state) || (op.mode != 'set' && state.value == null)) {
			state.pending.push(op);
			self.requestTransform(state);
			return;
		}
		self.setTransform(state, op.mode == 'set' ? op.value : state.value + op.value);
	},

	// size is in absolute pixels, so the step goes on x and y follows by the same factor;
	// z (depth) is left alone
	adjustUniformScale(layer, op) {
		let self = this;
		let states = UNIFORM_AXES.map((axis) => self.transformState(layer, 'scale', axis));
		let firstUse = false;
		for (let i = 0; i < states.length; i++) {
			if (!states[i].active) firstUse = true;
			states[i].active = true;
		}
		if (firstUse) self.scheduleDialRefresh(); //adds the variables
		if (!self.UNIFORM_PENDING[layer]) self.UNIFORM_PENDING[layer] = [];
		self.UNIFORM_PENDING[layer].push(op);
		if (!self.flushUniformScale(layer)) {
			for (let i = 0; i < states.length; i++) self.requestTransform(states[i]);
		}
	},

	// applies the waiting uniform operations once x and y are known
	flushUniformScale(layer) {
		let self = this;
		let pending = self.UNIFORM_PENDING[layer];
		if (!pending || pending.length == 0) return true;
		let states = UNIFORM_AXES.map((axis) => self.transformState(layer, 'scale', axis));
		for (let i = 0; i < states.length; i++) {
			if (!self.transformParam(states[i]) || states[i].value == null) return false;
		}
		self.UNIFORM_PENDING[layer] = [];
		let values = states.map((state) => state.value);
		for (let k = 0; k < pending.length; k++) {
			let op = pending[k];
			let x = values[0];
			let target = op.mode == 'set' ? op.value : x + op.value;
			let factor = x != 0 ? target / x : null;
			values = values.map((value) =>
				factor != null ? value * factor : op.mode == 'set' ? op.value : value + op.value
			);
		}
		for (let i = 0; i < states.length; i++) {
			if (round(values[i]) !== states[i].value) self.setTransform(states[i], values[i]);
		}
		return true;
	},

	setTransform(state, value) {
		let self = this;
		state.value = round(value);
		state.localAt = Date.now();
		let node = self.sizeNode(state);
		if (node) {
			// Param.setValue takes the size as a scale factor; Node.setValues takes the pixels the UI shows
			let layerParams = self.LAYER_PARAMS[state.layer];
			layerParams.scaleValues[layerParams.index[state.kind + ':' + state.axis]] = state.value;
			self.pixera.sendParams(0, 'Pixera.Timelines.Node.setValues', {
				handle: node,
				values: layerParams.scaleValues.slice(),
			});
		} else {
			self.pixera.sendParams(0, 'Pixera.Timelines.Param.setValue', {
				handle: self.transformParam(state),
				value: state.value,
			});
		}
		self.transformChanged(state, false);
	},

	// the Size/Scale node handle once its values have been read, null for everything else
	sizeNode(state) {
		let self = this;
		if (state.kind != 'scale') return null;
		let layerParams = self.LAYER_PARAMS[state.layer];
		if (!layerParams || !layerParams.nodes.scale || !Array.isArray(layerParams.scaleValues)) return null;
		let index = layerParams.index[state.kind + ':' + state.axis];
		return index != null && index < layerParams.scaleValues.length ? layerParams.nodes.scale : null;
	},

	requestTransform(state) {
		let self = this;
		if (!self.pixera) return;
		let param = self.transformParam(state);
		// without the parameter handle yet, the discovery replies send this once it is known
		if (!param) {
			self.resolveLayerParams(state.layer);
			return;
		}
		if (state.requested) return;
		state.requested = true;
		let layerParams = self.LAYER_PARAMS[state.layer];
		if (state.kind == 'scale' && layerParams.nodes.scale) {
			// one read gives x, y and z of the size in pixels
			for (let i = 0; i < AXES.length; i++) {
				let other = self.TRANSFORM_VALUES[state.layer + ':scale:' + AXES[i]];
				if (other) other.requested = true;
			}
			self.pixera.sendParams(ID_NODE_GETVALUES, 'Pixera.Timelines.Node.getValues', {
				handle: layerParams.nodes.scale,
			});
			return;
		}
		self.pixera.sendParams(ID_PARAM_GETVALUE, 'Pixera.Timelines.Param.getValue', { handle: param });
	},

	transformParamFound(layer, kind, axis) {
		let self = this;
		let state = self.TRANSFORM_VALUES[layer + ':' + kind + ':' + axis];
		if (state && (state.active || state.pending.length > 0 || layer === self.SELECTED_FIRST)) {
			state.requested = false;
			self.requestTransform(state);
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
		let handle = (jsonData.context || {})['handle'];
		let result = jsonData.result;
		switch (jsonData.id) {
			case ID_LAYER_GETNODES: //Pixera.Timelines.Layer.getNodes
				if (Array.isArray(result)) {
					for (let i = 0; i < result.length; i++) {
						self.TRANSFORM_NODES[result[i]] = { layer: handle, kind: null };
						self.pixera.sendParams(ID_NODE_GETNAME, 'Pixera.Timelines.Node.getName', { handle: result[i] });
					}
				}
				return true;
			case ID_NODE_GETNAME: //Pixera.Timelines.Node.getName
				{
					let node = self.TRANSFORM_NODES[handle];
					if (!node || result == null) return true;
					let name = (result + '').trim().toLowerCase();
					node.name = result + '';
					for (let kind in TRANSFORMS) {
						if (TRANSFORMS[kind].nodes.some((entry) => name == entry || name.includes(entry))) node.kind = kind;
					}
					let layerParams = self.LAYER_PARAMS[node.layer];
					if (node.kind && layerParams) {
						// the first matching node wins, e.g. "Size" before a later "Size Offset"
						if (layerParams.nodes[node.kind] && layerParams.nodes[node.kind] !== handle) return true;
						layerParams.nodes[node.kind] = handle;
						self.pixera.sendParams(ID_NODE_GETPARAMETERS, 'Pixera.Timelines.Node.getParameters', {
							handle: handle,
						});
					}
				}
				return true;
			case ID_NODE_GETPARAMETERS: //Pixera.Timelines.Node.getParameters
				{
					let node = self.TRANSFORM_NODES[handle];
					if (!node || !Array.isArray(result)) return true;
					for (let i = 0; i < result.length; i++) {
						self.TRANSFORM_PARAMS[result[i]] = { layer: node.layer, kind: node.kind, index: i, node: node.name };
						self.pixera.sendParams(ID_PARAM_GETNAME, 'Pixera.Timelines.Param.getName', { handle: result[i] });
					}
				}
				return true;
			case ID_PARAM_GETNAME: //Pixera.Timelines.Param.getName
				{
					let param = self.TRANSFORM_PARAMS[handle];
					if (!param || result == null) return true;
					let axis = AXIS_NAMES[(result + '').trim().toUpperCase()];
					let layerParams = self.LAYER_PARAMS[param.layer];
					if (!layerParams) return true;
					if (!axis) {
						if (param.kind == 'scale') {
							self.log('info', self.layerName(param.layer) + ': ignoring ' + param.node + ' parameter "' + result + '"');
						}
						return true;
					}
					let key = param.kind + ':' + axis;
					// the size is the one that differs between Pixera setups, so it is logged for support
					if (param.kind == 'scale' && layerParams.params[key] !== handle) {
						self.log(
							'info',
							self.layerName(param.layer) + ': ' + TRANSFORMS[param.kind].label + ' ' + axis +
								' is ' + param.node + ' / ' + result
						);
					}
					layerParams.params[key] = handle;
					layerParams.index[key] = param.index;
					self.transformParamFound(param.layer, param.kind, axis);
				}
				return true;
			case ID_NODE_GETVALUES: //Pixera.Timelines.Node.getValues of the size node
				{
					let node = self.TRANSFORM_NODES[handle];
					let layerParams = node ? self.LAYER_PARAMS[node.layer] : null;
					if (!layerParams) return true;
					if (!Array.isArray(result)) {
						// no node values: fall back to reading the parameters one by one
						self.log('info', self.layerName(node.layer) + ': no values from ' + node.name + ', using its parameters');
						layerParams.nodes.scale = null;
						for (let i = 0; i < AXES.length; i++) {
							let state = self.TRANSFORM_VALUES[node.layer + ':scale:' + AXES[i]];
							if (state) {
								state.requested = false;
								if (state.active || state.pending.length > 0) self.requestTransform(state);
							}
						}
						return true;
					}
					if (!layerParams.scaleValues) {
						self.log('info', self.layerName(node.layer) + ': ' + node.name + ' values ' + JSON.stringify(result));
					}
					layerParams.scaleValues = result.map((value) => parseFloat(value));
					for (let i = 0; i < AXES.length; i++) {
						let state = self.TRANSFORM_VALUES[node.layer + ':scale:' + AXES[i]];
						let index = layerParams.index['scale:' + AXES[i]];
						if (!state) continue;
						// an axis whose parameter name isn't known yet is read again once it is
						if (index == null) state.requested = false;
						else self.transformValueReply(state, result[index]);
					}
				}
				return true;
			case ID_PARAM_GETVALUE: //Pixera.Timelines.Param.getValue
				for (let key in self.TRANSFORM_VALUES) {
					let state = self.TRANSFORM_VALUES[key];
					if (self.transformParam(state) === handle) self.transformValueReply(state, result);
				}
				return true;
			default:
				return false;
		}
	},

	// a read value: fills the cache, or applies the steps that waited for it
	transformValueReply(state, result) {
		let self = this;
		state.requested = false;
		if (result == null || isNaN(parseFloat(result))) {
			state.pending = [];
			return;
		}
		if (state.pending.length == 0 && Date.now() - state.localAt < self.LOCAL_CHANGE_HOLD) return;
		let value = parseFloat(result);
		let pending = state.pending;
		state.pending = [];
		if (pending.length == 0) {
			if (round(value) !== state.value) {
				state.value = round(value);
				self.transformChanged(state, true);
			}
			if (state.kind == 'scale') self.flushUniformScale(state.layer);
			return;
		}
		for (let i = 0; i < pending.length; i++) {
			value = pending[i].mode == 'set' ? pending[i].value : value + pending[i].value;
		}
		self.setTransform(state, value);
	},

	// value text for the dial_value feedback, "x x y" for the size of both axes
	transformText(layer, kind, axis, keep) {
		let self = this;
		let axes = axis == 'all' ? UNIFORM_AXES : AXES.includes(axis) ? [axis] : ['X'];
		return axes
			.map((entry) => {
				let state = self.transformState(layer, kind, entry);
				if (keep) state.active = true;
				if (state.value == null) {
					self.requestTransform(state);
					return '-';
				}
				return state.value;
			})
			.join(' x ');
	},

	transformVariableId(state) {
		let self = this;
		let prefix = self.layerVariablePrefix(state.layer);
		return prefix ? prefix + '_' + state.kind + '_' + state.axis.toLowerCase() : null;
	},

	transformChanged(state, fromPoll) {
		let self = this;
		self.selectedLayerValueChanged(state.layer);
		self.dialValueChanged(
			self.transformVariableId(state),
			self.layerName(state.layer) + ' ' + TRANSFORMS[state.kind].label + ' ' + state.axis,
			state.value,
			fromPoll
		);
	},

	requestSelectedTransforms(layer) {
		let self = this;
		for (let kind in TRANSFORMS) {
			for (let i = 0; i < AXES.length; i++) {
				self.requestTransform(self.transformState(layer, kind, AXES[i]));
			}
		}
	},

	selectedTransformDefinitions() {
		let list = [];
		for (let kind in TRANSFORMS) {
			for (let i = 0; i < AXES.length; i++) {
				list.push({
					variableId: 'selected_' + kind + '_' + AXES[i].toLowerCase(),
					name: 'Selected layer ' + TRANSFORMS[kind].label + ' ' + AXES[i],
				});
			}
		}
		return list;
	},

	selectedTransformVariables(layer) {
		let self = this;
		let values = {};
		for (let kind in TRANSFORMS) {
			for (let i = 0; i < AXES.length; i++) {
				let state = layer != null ? self.TRANSFORM_VALUES[layer + ':' + kind + ':' + AXES[i]] : null;
				values['selected_' + kind + '_' + AXES[i].toLowerCase()] = state && state.value != null ? state.value : '-';
			}
		}
		return values;
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
				'selected_' + dial.kind + '_' + (dial.axis == 'all' ? 'x' : dial.axis.toLowerCase()),
				'',
				'selected_' + dial.kind + '_' + dial.axis.toLowerCase(),
				'layer_' + dial.kind + '_adjust',
				options,
				transform.fine,
				transform.coarse,
				'$(' + self.label + ':selected_layer) ' + transform.label.replace(' (Scale)', '') + axisLabel
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
