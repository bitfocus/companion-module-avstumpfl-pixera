const { combineRgb } = require('@companion-module/base');

// reply ids used by the dial requests, handled in Pixera.processReceivedData
const ID_TIMELINE_GETLAYERS = 62;
const ID_LAYER_GETNAME = 65;
const ID_TIMELINE_GETLAYERSSELECTED = 68;
// a selection request that got no reply by then is sent again
const SELECTION_RETRY = 1000;

// dropdown id for "whatever is selected in Pixera"
const SELECTED = -1;
// the selected timelines are polled every 100ms; their selected layers don't need to be asked that often
const SELECTION_POLL_INTERVAL = 250;
const COARSE_STYLE = { color: combineRgb(0, 0, 0), bgcolor: combineRgb(255, 140, 0) };

// a poll reply that left Pixera before our last set would snap the value back,
// so ignore replies for this long after we changed a value ourselves
const LOCAL_CHANGE_HOLD = 1000;
// polling can run every 50ms, dial values don't need to be asked that often
const POLL_MIN_INTERVAL = 250;

const SENSITIVITY_CHOICES = [
	{ id: 'toggle', label: 'Toggle fine/coarse' },
	{ id: 'fine', label: 'Fine' },
	{ id: 'coarse', label: 'Coarse' },
];

function safeId(name) {
	return (name + '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

// shared by the opacity and transform dials: discovery of timelines and layers,
// fine/coarse sensitivity, value caching, variables and Stream Deck+ presets
module.exports = {
	LOCAL_CHANGE_HOLD: LOCAL_CHANGE_HOLD,

	safeId: safeId,

	initDialSensitivity() {
		let self = this;
		//dial name -> 'fine' | 'coarse', kept across reconnects
		self.DIAL_SENSITIVITY = {};
	},

	resetDialState() {
		let self = this;
		//timeline handle -> layer handles, filled from Pixera.Timelines.Timeline.getLayers
		self.TIMELINE_LAYERS = {};
		//layer handle -> {name, timeline}
		self.LAYER_INFO = {};
		self.DIAL_LAST_POLL = 0;
		//timeline handle -> {waiting: [fn], sentAt}
		self.LAYER_SELECTION = {};
		//timeline handle -> layer handles last reported as selected, for the selection variables
		self.SELECTED_LAYERS_BY_TIMELINE = {};
		//first selected layer, its values are shown in the selected_* variables
		self.SELECTED_FIRST = null;
		self.SELECTION_LAST_POLL = 0;
		self.SELECTION_LAST_TIMELINES = null;
		clearTimeout(self.DIAL_REFRESH_TIMER);
		self.resetOpacityState();
		self.resetTransformState();
	},

	getDialActions() {
		let self = this;
		let actions = {};
		actions.dial_sensitivity = {
			name: 'Dial Sensitivity (Fine/Coarse)',
			description:
				'Put this on the press of a Stream Deck+ dial to switch its steps between fine and coarse',
			options: [
				{
					type: 'textinput',
					label: 'Dial Name (same as in the dial actions)',
					id: 'dial',
					default: 'dial1',
				},
				{
					type: 'dropdown',
					label: 'Sensitivity',
					id: 'sensitivity',
					default: 'toggle',
					choices: SENSITIVITY_CHOICES,
				},
			],
			subscribe: (action) => self.registerDial(action.options.dial),
			callback: async (event) => {
				let dial = (event.options.dial + '').trim();
				if (!dial) return;
				let current = self.DIAL_SENSITIVITY[dial] || 'fine';
				let next = event.options.sensitivity;
				if (next == 'toggle') next = current == 'fine' ? 'coarse' : 'fine';
				self.registerDial(dial);
				self.DIAL_SENSITIVITY[dial] = next;
				let values = {};
				values[self.dialVariableId(dial)] = next;
				self.setVariableValues(values);
				self.checkFeedbacks('dial_coarse');
			},
		};
		Object.assign(actions, self.getOpacityActions(), self.getTransformActions());
		return actions;
	},

	getDialFeedbacks() {
		let self = this;
		return Object.assign(
			{
				dial_coarse: {
					type: 'boolean',
					name: 'Dial Sensitivity is Coarse',
					description: 'Change the button style while a dial uses its coarse step',
					defaultStyle: COARSE_STYLE,
					options: [
						{
							type: 'textinput',
							label: 'Dial Name (same as in the dial actions)',
							id: 'dial',
							default: 'dial1',
						},
					],
					callback: (feedback) => self.DIAL_SENSITIVITY[(feedback.options.dial + '').trim()] == 'coarse',
				},
			},
			self.getOpacityFeedbacks()
		);
	},

	// options for increase/decrease: one step for fine, one for coarse, and the dial they follow
	stepOptions(unit, fineDefault, coarseDefault) {
		let isStep = (options) => options.mode == 'increase' || options.mode == 'decrease';
		return [
			{
				type: 'number',
				label: 'Fine Step' + unit,
				id: 'step_fine',
				default: fineDefault,
				min: 0,
				max: 100000,
				step: 0.001,
				isVisible: isStep,
			},
			{
				type: 'number',
				label: 'Coarse Step' + unit,
				id: 'step_coarse',
				default: coarseDefault,
				min: 0,
				max: 100000,
				step: 0.001,
				isVisible: isStep,
			},
			{
				type: 'textinput',
				label: 'Dial Name (for Fine/Coarse switching)',
				id: 'dial',
				default: 'dial1',
				isVisible: isStep,
			},
		];
	},

	// the step for the dial's current sensitivity, fine unless switched to coarse
	currentStep(opt) {
		let self = this;
		let dial = (opt.dial + '').trim();
		let coarse = dial && self.DIAL_SENSITIVITY[dial] == 'coarse';
		let step = parseFloat(coarse ? opt.step_coarse : opt.step_fine);
		if (isNaN(step)) step = parseFloat(opt.step); //actions saved before fine/coarse existed
		return Math.abs(step) || 0;
	},

	registerDial(dial) {
		let self = this;
		dial = (dial + '').trim();
		if (!dial || self.DIAL_SENSITIVITY[dial]) return;
		self.DIAL_SENSITIVITY[dial] = 'fine';
		self.scheduleDialRefresh();
	},

	dialVariableId(dial) {
		return 'dial_' + safeId(dial) + '_sensitivity';
	},

	// timelines without the "Selected Timeline" and empty placeholder entries
	dialTimelineChoices() {
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

	// a Timeline dropdown, then one Layer dropdown per timeline of which only the chosen one shows
	timelineLayerOptions(visibleWhen) {
		let self = this;
		let timelines = self.dialTimelineChoices();
		let options = [
			{
				type: 'dropdown',
				label: 'Timeline Name',
				id: 'timeline',
				default: timelines.length > 0 ? timelines[0].id : SELECTED,
				choices: timelines.concat([{ id: SELECTED, label: 'Selected Timeline(s)' }]),
			},
		];
		let selectedLayer = { id: SELECTED, label: 'Selected Layer(s)' };
		timelines = timelines.concat([{ id: SELECTED }]);
		for (let i = 0; i < timelines.length; i++) {
			let choices = [selectedLayer].concat(timelines[i].id == SELECTED ? [] : self.layerChoices(timelines[i].id));
			options.push({
				type: 'dropdown',
				label: 'Layer',
				id: 'layer_' + timelines[i].id,
				default: choices.length > 1 ? choices[1].id : SELECTED,
				choices: choices,
				// isVisible is sent to the UI as source, so the timeline comes in through isVisibleData
				isVisible: visibleWhen || ((options, data) => options.timeline == data.timeline),
				isVisibleData: { timeline: timelines[i].id },
			});
		}
		return options;
	},

	// the one layer picked in the dropdowns, null for none or for "selected"
	selectedLayer(opt) {
		let layer = parseInt(opt['layer_' + opt.timeline]);
		return isNaN(layer) || layer < 0 ? null : layer;
	},

	// runs fn for the picked layer, or for every layer selected in Pixera
	forEachTargetLayer(opt, fn) {
		let self = this;
		let timeline = parseInt(opt.timeline);
		let layer = parseInt(opt['layer_' + opt.timeline]);
		if (isNaN(timeline) || isNaN(layer)) return false;
		if (timeline != SELECTED && layer != SELECTED) {
			fn(layer);
			return true;
		}
		let timelines = timeline == SELECTED ? self.SELECTEDTIMELINES || [] : [timeline];
		for (let i = 0; i < timelines.length; i++) {
			self.withSelectedLayers(timelines[i], fn);
		}
		return true;
	},

	// the selection changes in Pixera at any time, so ask for it on every use; turns that come
	// in while the request is out are applied together, in order, when the reply arrives
	withSelectedLayers(timeline, fn) {
		let self = this;
		if (!self.pixera) return;
		let selection = self.LAYER_SELECTION[timeline];
		if (!selection) {
			selection = self.LAYER_SELECTION[timeline] = { waiting: [], sentAt: 0 };
		}
		selection.waiting.push(fn);
		if (selection.sentAt && Date.now() - selection.sentAt < SELECTION_RETRY) return;
		selection.sentAt = Date.now();
		self.pixera.sendParams(ID_TIMELINE_GETLAYERSSELECTED, 'Pixera.Timelines.Timeline.getLayersSelected', {
			handle: timeline,
		});
	},

	// keeps the selected_* variables following the selection in Pixera
	selectionPolled() {
		let self = this;
		let now = Date.now();
		if (!self.pixera || now - self.SELECTION_LAST_POLL < SELECTION_POLL_INTERVAL) return;
		self.SELECTION_LAST_POLL = now;
		let timelines = self.SELECTEDTIMELINES || [];
		for (let i = 0; i < timelines.length; i++) {
			let selection = self.LAYER_SELECTION[timelines[i]];
			if (!selection) {
				selection = self.LAYER_SELECTION[timelines[i]] = { waiting: [], sentAt: 0 };
			}
			if (selection.sentAt && now - selection.sentAt < SELECTION_RETRY) continue;
			selection.sentAt = now;
			self.pixera.sendParams(ID_TIMELINE_GETLAYERSSELECTED, 'Pixera.Timelines.Timeline.getLayersSelected', {
				handle: timelines[i],
			});
		}
		if (timelines.join(',') !== self.SELECTION_LAST_TIMELINES) {
			self.SELECTION_LAST_TIMELINES = timelines.join(',');
			self.updateSelectionVariables();
		}
	},

	selectedLayerList() {
		let self = this;
		let list = [];
		let timelines = self.SELECTEDTIMELINES || [];
		for (let i = 0; i < timelines.length; i++) {
			list = list.concat(self.SELECTED_LAYERS_BY_TIMELINE[timelines[i]] || []);
		}
		return list;
	},

	updateSelectionVariables() {
		let self = this;
		let timelines = self.SELECTEDTIMELINES || [];
		let layers = self.selectedLayerList();
		let first = layers.length > 0 ? layers[0] : null;
		let values = {
			selected_timeline: timelines.length > 0 ? timelines.map((t) => self.timelineName(t)).join(', ') : '-',
			selected_layer:
				layers.length > 0
					? layers.map((l) => (self.LAYER_INFO[l] ? self.LAYER_INFO[l].name : 'Layer ' + l)).join(', ')
					: '-',
			selected_layer_count: layers.length,
		};
		if (first !== self.SELECTED_FIRST) {
			self.SELECTED_FIRST = first;
			// read the new layer's values right away instead of waiting for the next poll
			if (first != null) self.requestSelectedValues();
		}
		Object.assign(values, self.selectedValueVariables());
		self.setVariableValues(values);
	},

	requestSelectedValues() {
		let self = this;
		if (self.SELECTED_FIRST == null) return;
		self.requestLayerOpacity(self.SELECTED_FIRST);
		self.requestSelectedTransforms(self.SELECTED_FIRST);
	},

	// called when a layer value changed, so the selected_* variables stay current
	selectedLayerValueChanged(layer) {
		let self = this;
		if (layer == null || layer !== self.SELECTED_FIRST) return;
		self.setVariableValues(self.selectedValueVariables());
	},

	selectedValueVariables() {
		let self = this;
		return Object.assign(
			self.selectedOpacityVariables(self.SELECTED_FIRST),
			self.selectedTransformVariables(self.SELECTED_FIRST)
		);
	},

	// a layer from the selection that discovery hasn't seen yet still needs its name
	ensureLayerInfo(layer, timeline) {
		let self = this;
		if (self.LAYER_INFO[layer]) return;
		self.LAYER_INFO[layer] = { name: 'Layer ' + layer, timeline: timeline };
		self.pixera.sendParams(ID_LAYER_GETNAME, 'Pixera.Timelines.Layer.getName', { handle: layer });
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

	// discovery replies arrive one by one, rebuild the definitions once they settle
	scheduleDialRefresh() {
		let self = this;
		clearTimeout(self.DIAL_REFRESH_TIMER);
		self.DIAL_REFRESH_TIMER = setTimeout(() => {
			self.updateActions();
			self.initFeedbacks();
			self.updateDialVariableDefinitions();
			self.updateDialPresets();
		}, 200);
	},

	pollDials() {
		let self = this;
		let now = Date.now();
		if (now - self.DIAL_LAST_POLL < POLL_MIN_INTERVAL) return;
		self.DIAL_LAST_POLL = now;
		self.pollOpacity();
		self.pollTransforms();
		// the selected layer is shown in the selected_* variables even when no button controls it
		self.requestSelectedValues();
	},

	// returns true when the reply id belongs to the dial requests
	handleDialReply(jsonData) {
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
						self.scheduleDialRefresh();
					}
				}
				return true;
			case ID_TIMELINE_GETLAYERSSELECTED: //Pixera.Timelines.Timeline.getLayersSelected
				{
					let timeline = context['handle'];
					let selection = self.LAYER_SELECTION[timeline];
					if (!selection) return true;
					let waiting = selection.waiting;
					selection.waiting = [];
					selection.sentAt = 0;
					if (!Array.isArray(result)) return true;
					for (let i = 0; i < result.length; i++) {
						self.ensureLayerInfo(result[i], timeline);
					}
					let previous = self.SELECTED_LAYERS_BY_TIMELINE[timeline] || [];
					self.SELECTED_LAYERS_BY_TIMELINE[timeline] = result;
					if (previous.join(',') !== result.join(',')) self.updateSelectionVariables();
					for (let k = 0; k < waiting.length; k++) {
						for (let i = 0; i < result.length; i++) {
							waiting[k](result[i]);
						}
					}
				}
				return true;
			case ID_LAYER_GETNAME: //Pixera.Timelines.Layer.getName
				{
					let info = self.LAYER_INFO[context['handle']];
					if (!info || result == null || info.name === result) return true;
					info.name = result;
					self.scheduleDialRefresh();
					self.updateSelectionVariables();
				}
				return true;
		}
		return self.handleOpacityReply(jsonData) || self.handleTransformReply(jsonData);
	},

	// what a dial last touched, so one encoder display can show any target
	dialValueChanged(variableId, name, value, fromPoll) {
		let self = this;
		let values = {};
		if (variableId) {
			values[variableId] = value;
		}
		if (!fromPoll) {
			values['dial_last_name'] = name;
			values['dial_last_value'] = value;
		}
		self.setVariableValues(values);
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

	layerName(handle) {
		let self = this;
		let info = self.LAYER_INFO[handle];
		if (!info) return 'Layer ' + handle;
		return self.timelineName(info.timeline) + ' / ' + info.name;
	},

	layerVariablePrefix(handle) {
		let self = this;
		let info = self.LAYER_INFO[handle];
		if (!info) return null;
		return 'layer_' + safeId(self.timelineName(info.timeline)) + '_' + safeId(info.name);
	},

	updateDialVariableDefinitions() {
		let self = this;
		let definitions = [
			{ variableId: 'dial_last_name', name: 'Dial: last changed timeline/layer parameter' },
			{ variableId: 'dial_last_value', name: 'Dial: last changed value' },
			{ variableId: 'selected_timeline', name: 'Selected timeline(s) in Pixera' },
			{ variableId: 'selected_layer', name: 'Selected layer(s) in Pixera' },
			{ variableId: 'selected_layer_count', name: 'Number of selected layers' },
			...self.selectedOpacityDefinitions(),
			...self.selectedTransformDefinitions(),
		];
		let values = {};
		for (let dial in self.DIAL_SENSITIVITY) {
			let id = self.dialVariableId(dial);
			definitions.push({ variableId: id, name: 'Dial Sensitivity: ' + dial });
			values[id] = self.DIAL_SENSITIVITY[dial];
		}
		let seen = {};
		let add = (list) => {
			for (let i = 0; i < list.length; i++) {
				let entry = list[i];
				if (!entry.variableId || seen[entry.variableId]) continue;
				seen[entry.variableId] = true;
				definitions.push({ variableId: entry.variableId, name: entry.name });
				if (entry.value != null) values[entry.variableId] = entry.value;
			}
		};
		add(self.opacityVariables());
		add(self.transformVariables());
		self.setVariableDefinitions(definitions);
		self.setVariableValues(values);
	},

	SELECTED: SELECTED,

	// title: first line on the display, defaults to the preset name
	dialPreset(category, name, variable, unit, dial, actionId, options, fine, coarse, title) {
		let self = this;
		let step = (mode) => [
			{
				actionId: actionId,
				options: Object.assign({ mode: mode, value: 0, step_fine: fine, step_coarse: coarse, dial: dial }, options),
			},
		];
		return {
			type: 'button',
			category: category,
			name: name,
			style: {
				text:
					(title || name) +
					'\n$(' + self.label + ':' + variable + ')' + unit +
					'\n$(' + self.label + ':' + self.dialVariableId(dial) + ')',
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			options: { rotaryActions: true },
			// the display turns orange while the dial is on its coarse step
			feedbacks: [{ feedbackId: 'dial_coarse', options: { dial: dial }, style: COARSE_STYLE }],
			steps: [
				{
					// press switches between fine and coarse steps, turning changes the value
					down: [{ actionId: 'dial_sensitivity', options: { dial: dial, sensitivity: 'toggle' } }],
					up: [],
					rotate_left: step('decrease'),
					rotate_right: step('increase'),
				},
			],
		};
	},

	selectedLayerPresets(category) {
		let self = this;
		let presets = {};
		let options = { timeline: SELECTED };
		options['layer_' + SELECTED] = SELECTED;
		presets['selected_opacity_dial'] = self.dialPreset(
			category,
			'Selected Opacity',
			'selected_opacity',
			'%',
			'selected_opacity',
			'layer_opacity_adjust',
			options,
			1,
			10,
			'$(' + self.label + ':selected_layer) Opacity'
		);
		return Object.assign(presets, self.selectedTransformPresets(category));
	},

	updateDialPresets() {
		let self = this;
		let presets = {};
		let timelines = self.dialTimelineChoices();
		for (let i = 0; i < timelines.length; i++) {
			let timeline = timelines[i].id;
			let category = 'Dials (Stream Deck+): ' + timelines[i].label;
			Object.assign(presets, self.opacityPresets(category, timeline));
			let layers = self.TIMELINE_LAYERS[timeline] || [];
			for (let k = 0; k < layers.length; k++) {
				Object.assign(presets, self.transformPresets(category, timeline, layers[k]));
			}
		}
		// whatever is selected in Pixera, shown through the "last changed" variables
		Object.assign(presets, self.selectedLayerPresets('Dials (Stream Deck+): Selected Layer'));
		self.setPresetDefinitions(presets);
	},
};
