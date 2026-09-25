const { combineRgb } = require('@companion-module/base')
module.exports = {
	initFeedbacks() { 
 
		let self = this; 
		const formatTwoDigits = (value) => (value < 10 ? '0' : '') + value.toString();
		// empty name means the timeline selected in Pixera
		const findTimeline = (name) => {
			if (!name) {
				let picked = self.SELECTEDTIMELINES || [];
				for (let i = 0; i < self.CHOICES_TIMELINEFEEDBACK.length; i++) {
					for (let s = 0; s < picked.length; s++) {
						if (self.CHOICES_TIMELINEFEEDBACK[i]['handle'] == picked[s]) {
							return self.CHOICES_TIMELINEFEEDBACK[i];
						}
					}
				}
				return null;
			}
			for (let i = 0; i < self.CHOICES_TIMELINEFEEDBACK.length; i++) {
				if (self.CHOICES_TIMELINEFEEDBACK[i]['name'] == name) {
					return self.CHOICES_TIMELINEFEEDBACK[i];
				}
			}
			return null;
		};
		//self.log('debug', 'init feedbacks');
		let feedbacks = {
			timeline_state:{
				type: 'advanced',
				name: 'Change color from Timeline State',
				options: [
				{
					type: 'textinput',
					label: 'Timeline Name',
					id: 'timelinename_feedback',
					default: 0,
				},
				{
					type: 'colorpicker',
					label: 'Play: Foreground color',
					id: 'run_fg',
					default: combineRgb(255,255,255)
				},
				{
					type: 'colorpicker',
					label: 'Play: Background color',
					id: 'run_bg',
					default: combineRgb(0,255,0)
				},
				{
					type: 'colorpicker',
					label: 'Pause: Foreground color',
					id: 'pause_fg',
					default: combineRgb(255,255,255)
				},
				{
					type: 'colorpicker',
					label: 'Pause: Background color',
					id: 'pause_bg',
					default: combineRgb(255,255,0)
				},
				{
					type: 'colorpicker',
					label: 'Stop: Foreground color',
					id: 'stop_fg',
					default: combineRgb(255,255,255)
				},
				{
					type: 'colorpicker',
					label: 'Stop: Background color',
					id: 'stop_bg',
					default: combineRgb(255,0,0)
				}
				],
				callback: function(feedback, bank) {
					self.log('debug','checkForFeedbacks: ' + feedback.options.run_fg);
					for(let i = 0; i<self.CHOICES_TIMELINEFEEDBACK.length;i++){
						if(self.CHOICES_TIMELINEFEEDBACK[i]['name']==feedback.options.timelinename_feedback){
							if (self.CHOICES_TIMELINEFEEDBACK[i]['timelineTransport'] == 1) {//Play
								return {
									color: feedback.options.run_fg,
									bgcolor: feedback.options.run_bg
								}
							}
							else if (self.CHOICES_TIMELINEFEEDBACK[i]['timelineTransport'] == 2) {//Pause
								return {
									color: feedback.options.pause_fg,
									bgcolor: feedback.options.pause_bg
								}
							}
							else if (self.CHOICES_TIMELINEFEEDBACK[i]['timelineTransport'] == 3) {//Stop
								return {
									color: feedback.options.stop_fg,
									bgcolor: feedback.options.stop_bg
								}
							}
						}
					}
				}//close callback
			},//close timeline state
			timeline_positions:{
				type: 'advanced',
				name: 'Change Text from Timeline Timecode',
				options: [
				{
					type: 'textinput',
					label: 'Timeline Name',
					id: 'timelinename_feedback',
					default: 0,
				},
				{
					type: 'dropdown',
					label: 'Show Label',
					id: 'show_label',
					default: '1',
					choices:[
					{id:'1', label: 'Hour'},
					{id:'2', label: 'Minute'},
					{id:'3', label: 'Second'},
					{id:'4', label: 'Frame'},
					]
				}
				],
				callback: function(feedback, bank) {
					for(let i = 0; i<self.CHOICES_TIMELINEFEEDBACK.length;i++){
						if(self.CHOICES_TIMELINEFEEDBACK[i]['name']==feedback.options.timelinename_feedback){
							//self.log('debug', 'positions:',self.CHOICES_TIMELINEFEEDBACK[i]['timelinePositions']);
							let time = self.CHOICES_TIMELINEFEEDBACK[i]['timelinePositions'];
							let fps = self.CHOICES_TIMELINEFEEDBACK[i]['fps'];
							let hours = Math.floor(time / (60 * (60 * fps)));
							let minutes = Math.floor(time / (60 * fps)-(hours * 60));
							let seconds = Math.floor(((time / (60 * fps))*60)-(((hours * 60) * 60) + (minutes * 60)));
							let frames = Math.floor(time - ((((hours * 60) * 60) * fps) + ((minutes * 60) * fps) + (seconds * fps)));
							if(feedback.options.show_label == 1){
								return {
									text: formatTwoDigits(hours)
								}
							}
							else if(feedback.options.show_label == 2){
								return {
									text: formatTwoDigits(minutes)
								}
							}
							else if(feedback.options.show_label == 3){
								return {
									text: formatTwoDigits(seconds)
								}
							}
							else if(feedback.options.show_label == 4){
								return {
									text: formatTwoDigits(frames)
								}
							}
						}
					}
				}//close callback
			},//close timeline positions
			timeline_countdowns:{
				type: 'advanced',
				name: 'Change Text from Timeline Countdown',
				options: [
				{
					type: 'textinput',
					label: 'Timeline Name',
					id: 'timelinename_feedback',
					default: 0,
				},
				{
					type: 'dropdown',
					label: 'Show Label',
					id: 'show_label',
					default: '1',
					choices:[
					{id:'1', label: 'Hour'},
					{id:'2', label: 'Minute'},
					{id:'3', label: 'Second'},
					{id:'4', label: 'Frame'},
					]
				}
				],
				callback: function(feedback, bank) {
					for(let i = 0; i<self.CHOICES_TIMELINEFEEDBACK.length;i++){
						if(self.CHOICES_TIMELINEFEEDBACK[i]['name']==feedback.options.timelinename_feedback){
							//self.log('debug', 'countdown:',self.CHOICES_TIMELINEFEEDBACK[i]['timelinePositions']);
							let time = self.CHOICES_TIMELINEFEEDBACK[i]['timelineCountdowns'];
							let fps = self.CHOICES_TIMELINEFEEDBACK[i]['fps'];
							let hours = Math.floor(time / (60 * (60 * fps)));
							let minutes = Math.floor(time / (60 * fps)-(hours * 60));
							let seconds = Math.floor(((time / (60 * fps))*60)-(((hours * 60) * 60) + (minutes * 60)));
							let frames = Math.floor(time - ((((hours * 60) * 60) * fps) + ((minutes * 60) * fps) + (seconds * fps)));
							
							
							
							if(feedback.options.show_label == 1){
								return {
									text: formatTwoDigits(hours)
								}
							}
							else if(feedback.options.show_label == 2){
								return {
									text: formatTwoDigits(minutes)
								}
							}
							else if(feedback.options.show_label == 3){
								return {
									text: formatTwoDigits(seconds)
								}
							}
							else if(feedback.options.show_label == 4){
								return {
									text: formatTwoDigits(frames)
								}
							}
						}
					}
				}//close callback
		},//close timeline positions
		livesystem_state:{
			type: 'advanced',
			name: 'Change color from Live System State',
			options: [
			{
				type: 'dropdown',
				label: 'Live System',
				id: 'livesystem_state_name',
				default: 0,
				choices: self.CHOICES_LIVESYSTEMNAME
			},
			{
				type: 'colorpicker',
				label: 'Connected: Foreground color',
				id: 'connected_fg',
				default: combineRgb(255,255,255)
			},
			{
				type: 'colorpicker',
				label: 'Connected: Background color',
				id: 'connected_bg',
				default: combineRgb(0,200,0)
			},
			{
				type: 'colorpicker',
				label: 'Not Connected: Foreground color',
				id: 'disconnected_fg',
				default: combineRgb(255,255,255)
			},
			{
				type: 'colorpicker',
				label: 'Not Connected: Background color',
				id: 'disconnected_bg',
				default: combineRgb(200,0,0)
			}
			],
			callback: function(feedback, bank) {
				// a dead socket means we have no idea what the engine is doing, so never report connected
				if (self.PIXERA_LINK_UP !== true) {
					return {
						color: feedback.options.disconnected_fg,
						bgcolor: feedback.options.disconnected_bg
					}
				}
				let state = self.LIVESYSTEM_STATE[feedback.options.livesystem_state_name];
				// normalize: lowercase, strip non-letters ("Engine Closed" -> "engineclosed")
				let normalized = typeof state === 'string' ? state.toLowerCase().replace(/[^a-z]/g, '') : '';
				// api rev 481 reports "Engine Opened"/"Engine Closed"; other revisions use Connected/NotConnected
				let offline = ['engineclosed','notconnected','disconnected','notavailable','offline','closed'];
				let online = ['engineopened','connected','opened','online','running'];
				let connected =
					!offline.some((m) => normalized.indexOf(m) !== -1) &&
					online.some((m) => normalized.indexOf(m) !== -1);
				if (connected) {
					return {
						color: feedback.options.connected_fg,
						bgcolor: feedback.options.connected_bg
					}
				}
				else {
					return {
						color: feedback.options.disconnected_fg,
						bgcolor: feedback.options.disconnected_bg
					}
				}
			}//close callback
		},//close livesystem state
		running_time: {
			type: 'advanced',
			name: 'Running time',
			options: [
				{
					type: 'textinput',
					label: 'Timeline name',
					id: 'timeline',
					default: '',
					tooltip: 'Leave empty for the timeline selected in Pixera.',
				},
			],
			callback: function (feedback) {
				let tl = findTimeline(feedback.options.timeline);
				if (!tl) return { text: '--:--:--:--' };
				return { text: self.framesToHmsf(tl.timelinePositions, tl.fps) };
			},
		},
		time_to_next_cue: {
			type: 'advanced',
			name: 'Time to next cue',
			options: [
				{
					type: 'textinput',
					label: 'Timeline name',
					id: 'timeline',
					default: '',
					tooltip: 'Leave empty for the timeline selected in Pixera.',
				},
			],
			callback: function (feedback) {
				let tl = findTimeline(feedback.options.timeline);
				if (!tl) return { text: '--:--:--:--' };
				return { text: self.framesToHmsf(tl.timelineCountdowns, tl.fps) };
			},
		},
		active_timeline: {
			type: 'advanced',
			name: 'Active timeline',
			options: [],
			callback: function () {
				let names = [];
				let picked = self.SELECTEDTIMELINES || [];
				for (let i = 0; i < self.CHOICES_TIMELINEFEEDBACK.length; i++) {
					for (let s = 0; s < picked.length; s++) {
						if (self.CHOICES_TIMELINEFEEDBACK[i]['handle'] == picked[s]) {
							names.push(self.CHOICES_TIMELINEFEEDBACK[i]['name']);
						}
					}
				}
				if (!names.length) return { text: '-' };
				return { text: names.join(', ') };
			},
		},
		workspace_mode: {
			type: 'advanced',
			name: 'Workspace',
			options: [
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'mode',
					default: 3,
					choices: [
						{ id: 3, label: 'Outer compositing' },
						{ id: 4, label: 'Inner compositing' },
						{ id: 1, label: 'Screens (projectors)' },
						{ id: 2, label: 'Mapping' },
					],
				},
				{
					type: 'colorpicker',
					label: 'Foreground color',
					id: 'fg',
					default: combineRgb(255, 255, 255),
				},
				{
					type: 'colorpicker',
					label: 'Background color',
					id: 'bg',
					default: combineRgb(0, 80, 140),
				},
			],
			callback: function (feedback) {
				if (self.APP_MODE == feedback.options.mode) {
					return {
						color: feedback.options.fg,
						bgcolor: feedback.options.bg,
					};
				}
			},
		},
		transport_play: {
			type: 'advanced',
			name: 'Playing',
			options: [
				{
					type: 'textinput',
					label: 'Timeline name',
					id: 'timeline',
					default: '',
					tooltip: 'Leave empty for the timeline selected in Pixera.',
				},
				{
					type: 'colorpicker',
					label: 'Foreground color',
					id: 'fg',
					default: combineRgb(255, 255, 255),
				},
				{
					type: 'colorpicker',
					label: 'Background color',
					id: 'bg',
					default: combineRgb(0, 140, 0),
				},
			],
			callback: function (feedback) {
				let tl = findTimeline(feedback.options.timeline);
				if (tl && tl.timelineTransport == 1) {
					return { color: feedback.options.fg, bgcolor: feedback.options.bg };
				}
			},
		},
		transport_pause: {
			type: 'advanced',
			name: 'Paused',
			options: [
				{
					type: 'textinput',
					label: 'Timeline name',
					id: 'timeline',
					default: '',
					tooltip: 'Leave empty for the timeline selected in Pixera.',
				},
				{
					type: 'colorpicker',
					label: 'Foreground color',
					id: 'fg',
					default: combineRgb(0, 0, 0),
				},
				{
					type: 'colorpicker',
					label: 'Background color',
					id: 'bg',
					default: combineRgb(255, 200, 0),
				},
			],
			callback: function (feedback) {
				let tl = findTimeline(feedback.options.timeline);
				if (tl && tl.timelineTransport == 2) {
					return { color: feedback.options.fg, bgcolor: feedback.options.bg };
				}
			},
		},
		transport_stop: {
			type: 'advanced',
			name: 'Stopped',
			options: [
				{
					type: 'textinput',
					label: 'Timeline name',
					id: 'timeline',
					default: '',
					tooltip: 'Leave empty for the timeline selected in Pixera.',
				},
				{
					type: 'colorpicker',
					label: 'Foreground color',
					id: 'fg',
					default: combineRgb(255, 255, 255),
				},
				{
					type: 'colorpicker',
					label: 'Background color',
					id: 'bg',
					default: combineRgb(160, 0, 0),
				},
			],
			callback: function (feedback) {
				let tl = findTimeline(feedback.options.timeline);
				if (tl && tl.timelineTransport == 3) {
					return { color: feedback.options.fg, bgcolor: feedback.options.bg };
				}
			},
		},
		countdown_under: {
			type: 'advanced',
			name: 'Countdown under N seconds',
			options: [
				{
					type: 'textinput',
					label: 'Timeline name',
					id: 'timeline',
					default: '',
					tooltip: 'Leave empty for the timeline selected in Pixera.',
				},
				{
					type: 'textinput',
					label: 'Seconds',
					id: 'seconds',
					default: '5',
				},
				{
					type: 'colorpicker',
					label: 'Foreground color',
					id: 'fg',
					default: combineRgb(0, 0, 0),
				},
				{
					type: 'colorpicker',
					label: 'Background color',
					id: 'bg',
					default: combineRgb(255, 140, 0),
				},
			],
			callback: function (feedback) {
				let tl = findTimeline(feedback.options.timeline);
				if (!tl) return;
				if (tl.countdownFlag != 1 && tl.countdownFlag != 2) return;
				let fps = parseFloat(tl.fps);
				let frames = parseFloat(tl.timelineCountdowns);
				let limit = parseFloat(feedback.options.seconds);
				if (!fps || isNaN(frames) || isNaN(limit)) return;
				if (frames / fps < limit) {
					return { color: feedback.options.fg, bgcolor: feedback.options.bg };
				}
			},
		},
		next_cue: {
			type: 'advanced',
			name: 'Next cue name',
			options: [
				{
					type: 'textinput',
					label: 'Timeline name',
					id: 'timeline',
					default: '',
					tooltip: 'Leave empty for the timeline selected in Pixera.',
				},
			],
			callback: function (feedback) {
				let tl = findTimeline(feedback.options.timeline);
				if (!tl || !tl.nextCueName) return { text: '-' };
				return { text: tl.nextCueName };
			},
		},
		prev_cue: {
			type: 'advanced',
			name: 'Previous cue name',
			options: [
				{
					type: 'textinput',
					label: 'Timeline name',
					id: 'timeline',
					default: '',
					tooltip: 'Leave empty for the timeline selected in Pixera.',
				},
			],
			callback: function (feedback) {
				let tl = findTimeline(feedback.options.timeline);
				if (!tl || !tl.prevCueName) return { text: '-' };
				return { text: tl.prevCueName };
			},
		},
		preview_edit: {
			type: 'advanced',
			name: 'Edit mode',
			options: [
				{
					type: 'colorpicker',
					label: 'Foreground color',
					id: 'fg',
					default: combineRgb(0, 0, 0),
				},
				{
					type: 'colorpicker',
					label: 'Background color',
					id: 'bg',
					default: combineRgb(255, 180, 0),
				},
			],
			callback: function (feedback) {
				let mode = self.PREVIEW_EDIT;
				if (mode == 1 || mode == 2 || mode == 3) {
					return {
						color: feedback.options.fg,
						bgcolor: feedback.options.bg,
					};
				}
			},
		},
	};//close feedbacks
		self.setFeedbackDefinitions(feedbacks);
	}
}
