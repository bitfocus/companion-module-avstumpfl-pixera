const { InstanceStatus }  = require('@companion-module/base');
module.exports  = {
	updateActions(){
		let self  = this;
		let actions  = {};

		actions.timeline_transport = {
			name: 'Timeline Transport',
			options: [
				{
					type: 'dropdown',
					label: 'Transport',
					id: 'mode',
					default: '1',
					choices: [
						{id: 1, label: 'Play'},
						{id: 2, label: 'Pause'},
						{id: 3, label: 'Stop'}
					]
				},
				{
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'timelinename_state',
					default: 0,
					choices: self.CHOICES_TIMELINENAME
				}
			],
			callback: async (event) => {
				self.pixera.sendParams(0,'Pixera.Timelines.Timeline.setTransportMode',
								{'handle':parseInt(event.options.timelinename_state), 'mode':parseInt(event.options.mode)});
			}
		}
		
		//Created 10/31/2023 by Cody Luketic
		actions.timeline_transport_extended = {
			name: 'Timeline Transport Extended',
			options: [
				{
					type: 'checkbox',
					label: 'Toggle',
					id: 'timeline_transport_toggle',
					default: false,
				},
				{
					type: 'dropdown',
					label: 'Transport',
					id: 'mode',
					isVisible: (options) => options.timeline_transport_toggle == 0,
					default: 1,
					choices: [
						{id: 1, label: 'Play'},
						{id: 2, label: 'Pause'},
						{id: 3, label: 'Stop'}
					]
				},
				{
					type: 'dropdown',
					label: 'Selection Type',
					id: 'timeline_transport_selection',
					default: 1,
					choices: [
						{label: 'Single', id: 1},
						{label: 'Multiple', id: 2},
						{label: 'All', id: 3}
					]
				},
				{
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'timeline_transport_name',
					isVisible: (options) => options.timeline_transport_selection == 1,
					default: 0,
					choices: self.CHOICES_TIMELINENAME
				},
				{
					type: 'textinput',
					label: 'Timeline Names',
					id: 'timeline_transport_names',
					isVisible: (options) => options.timeline_transport_selection == 2,
					default: 'Timeline 1,Timeline 2,Timeline 3',
				}
			],
			callback: async (event) => {
				let opt = event.options;

				if(opt.timeline_transport_toggle) {
					switch (opt.timeline_transport_selection) {
						case 1:
							self.pixera.sendParams(0,'Pixera.Timelines.Timeline.toggleTransport',
								{'handle':parseInt(opt.timeline_transport_name)});
							break;
						case 2:
							let timelines = opt.timeline_transport_names.split(',');
							for (let i = 0; i < timelines.length; i++) {
								for(var k = 0; k < self.CHOICES_TIMELINEFEEDBACK.length; k++){
									if(timelines[i] == self.CHOICES_TIMELINEFEEDBACK[k]['name']){
										self.pixera.sendParams(0,'Pixera.Timelines.Timeline.toggleTransport',
											{'handle':parseInt(self.CHOICES_TIMELINEFEEDBACK[k]['handle'])});
									}
								}
							}
							break;
						case 3:
							for (let i = 0; i < self.CHOICES_TIMELINEFEEDBACK.length; i++) {
								self.pixera.sendParams(0,'Pixera.Timelines.Timeline.toggleTransport',
									{'handle':parseInt(self.CHOICES_TIMELINEFEEDBACK[i]['handle'])});
							}
							break;
						default:
							break;
					}
				}
				else {
					switch (opt.timeline_transport_selection) {
						case 1:
							self.pixera.sendParams(0,'Pixera.Timelines.Timeline.setTransportMode',
								{'handle':parseInt(opt.timeline_transport_name), 'mode':parseInt(opt.mode)});
							break;
						case 2:
							let timelines = opt.timeline_transport_names.split(',');
							for (let i = 0; i < timelines.length; i++) {
								for(var k = 0; k < self.CHOICES_TIMELINEFEEDBACK.length; k++){
									if(timelines[i] == self.CHOICES_TIMELINEFEEDBACK[k]['name']){
										self.pixera.sendParams(0,'Pixera.Timelines.Timeline.setTransportMode',
											{'handle':parseInt(self.CHOICES_TIMELINEFEEDBACK[k]['handle']), 'mode':parseInt(opt.mode)});
									}
								}
							}
							break;
						case 3:
							for (let i = 0; i < self.CHOICES_TIMELINEFEEDBACK.length; i++) {
								self.pixera.sendParams(0,'Pixera.Timelines.Timeline.setTransportMode',
									{'handle':parseInt(self.CHOICES_TIMELINEFEEDBACK[i]['handle']), 'mode':parseInt(opt.mode)});
							}
							break;
						default:
							break;
					}
				}
			}
		}

		actions.timeline_next_cue = {
			name: 'Next Cue',
			options: [
				{
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'timelinename_next',
					default: 0,
					choices: self.CHOICES_TIMELINENAME
				},
				{
					type: 'checkbox',
					label: 'Ignore Properties',
					id: 'timelinename_next_ignore',
					default: false
				}
			],
			callback: async (event) => {
				let method = 'Pixera.Timelines.Timeline.moveToNextCue';
				if(event.options.timelinename_next_ignore){
					method = 'Pixera.Timelines.Timeline.moveToNextCueIgnoreProperties';
				}
				self.pixera.sendParams(0,method,{'handle':parseInt(event.options.timelinename_next)});
			}
		}

		actions.timeline_prev_cue = {
			name: 'Previous Cue',
			options: [
				{
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'timelinename_prev',
					default: 0,
					choices: self.CHOICES_TIMELINENAME
				},
				{
					type: 'checkbox',
					label: 'Ignore Properties',
					id: 'timelinename_prev_ignore',
					default: false,
				}
			],
			callback: async (event) => {
				let method = 'Pixera.Timelines.Timeline.moveToPreviousCue';
				if(event.options.timelinename_prev_ignore){
					method = 'Pixera.Timelines.Timeline.moveToPreviousCueIgnoreProperties';
				}
				self.pixera.sendParams(0,method,{'handle':parseInt(event.options.timelinename_prev)});
			}
		}

		actions.timeline_ignore_next_cue = {
			name: 'Ignore Next Cue',
			options: [
				{
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'timelinename_ignore',
					default: 0,
					choices: self.CHOICES_TIMELINENAME
				},
			],
			callback: async (event) => {
				self.pixera.sendParams(0,'Pixera.Timelines.Timeline.ignoreNextCue',{'handle':parseInt(event.options.timelinename_ignore)});
			}
		}

		actions.timeline_store = {
			name: 'Timeline Store',
			options: [
				{
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'timelinename_store',
					default: 0,
					choices: self.CHOICES_TIMELINENAME
				}
			],
			callback: async (event) => {
				self.pixera.sendParams(0,'Pixera.Timelines.Timeline.store',{'handle':parseInt(event.options.timelinename_store)});
			}
		}

		actions.screen_visible = {
			name: 'Visible Screen',
			options: [
				{
					type: 'dropdown',
					label: 'Screen Name',
					id: 'visible_screen_name',
					default: 0,
					choices: self.CHOICES_SCREENNAME
				},
				{
					type: 'checkbox',
					label: 'Screen Visible',
					id: 'visible_screen_state',
					default: true
				}
			],
			callback: async (event) => {
				self.pixera.sendParams(0,'Pixera.Screens.Screen.setIsVisible',{'handle':parseInt(event.options.visible_screen_name),'isVisible':JSON.parse(event.options.visible_screen_state)});
			}
		}

		actions.screen_refresh_mapping = {
			name: 'Screen Refresh Mapping',
			options: [
				{
					type: 'dropdown',
					label: 'Screen Name',
					id: 'refresh_screen_name',
					default: 0,
					choices: self.CHOICES_SCREENNAME
				}
			],
			callback: async (event) => {
				let opt = event.options;
				self.pixera.sendParams(0,'Pixera.Screens.Screen.triggerRefreshMapping',{'handle':parseInt(opt.refresh_screen_name)});
			}
		}

		actions.screen_projectable = {
			name: 'Screen is Projectable',
			options: [
				{
					type: 'dropdown',
					label: 'Screen Name',
					id: 'visible_projectable_name',
					default: 0,
					choices: self.CHOICES_SCREENNAME
				},
				{
					type: 'checkbox',
					label: 'Screen Is Projectable',
					id: 'visible_projectable_state',
					default: true
				}
			],
			callback: async (event) => {
				let opt = event.options;
				self.pixera.sendParams(0,'Pixera.Screens.Screen.setIsProjectable',{'handle':parseInt(opt.visible_projectable_name),'isProjectable':JSON.parse(opt.visible_projectable_state)});
			}
		}

		actions.goto_time = {
			name: 'Goto Timecode',
			options: [
				{
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'goto_time_timelinename',
					default: 0,
					choices: self.CHOICES_TIMELINENAME
				},
				{
					type: 'textinput',
					label: 'Hour',
					id: 'goto_time_h',
					default: '0',
				},
				{
					type: 'textinput',
					label: 'Minute',
					id: 'goto_time_m',
					default: '0',
				},
				{
					type: 'textinput',
					label: 'Second',
					id: 'goto_time_s',
					default: '0',
				},
				{
					type: 'textinput',
					label: 'Frame',
					id: 'goto_time_f',
					default: '0',
				}
			],
			callback: async (event) => {
				let opt = event.options;

				let hour = parseInt(await self.parseVariablesInString(opt.goto_time_h));
				let min = parseInt(await self.parseVariablesInString(opt.goto_time_m));
				let sec = parseInt(await self.parseVariablesInString(opt.goto_time_s));
				let frame = parseInt(await self.parseVariablesInString(opt.goto_time_f));

				let fps = 60;
				for(let k = 0; k<self.CHOICES_TIMELINEFEEDBACK.length;k++){
					if(self.CHOICES_TIMELINEFEEDBACK[k]['handle'] == opt.goto_time_timelinename){
						fps = self.CHOICES_TIMELINEFEEDBACK[k]['fps'];
						break;
					}
				}
				let time = (((hour * 60)*60)*parseInt(fps))+((min*60)*parseInt(fps))+(sec*parseInt(fps))+frame;
				self.pixera.sendParams(0,'Pixera.Timelines.Timeline.setCurrentTime',{'handle':opt.goto_time_timelinename,'time':time});
			}
		}

		//Updated 10/31/2023 by Cody Luketic
		actions.timeline_scrubcurrenttime = {
			name: 'Timeline Scrub Current Time',
			options: [
				{
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'timeline_scrubcurrenttime_timelinename',
					default: 0,
					choices: self.CHOICES_TIMELINENAME
				},
				{
					type: 'textinput',
					label: 'Frames',
					id: 'timeline_scrubcurrenttime_frames',
					default: 0,
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.Timelines.Timeline.scrubCurrentTime',
					{'handle':parseInt(opt.timeline_scrubcurrenttime_timelinename), 'frames':parseInt(opt.timeline_scrubcurrenttime_frames)});
			}
		}

		//Updated 10/31/2023 by Cody Luketic
		actions.timeline_create_cue = {
			name: 'Timeline Create Cue',
			options: [
				{
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'timeline_create_cue_timelinename',
					default: 0,
					choices: self.CHOICES_TIMELINENAME
				},
				{
					type: 'textinput',
					label: 'Name',
					id: 'timeline_create_cue_cuename',
					default: 'Cue 1',
				},
				{
					type: 'dropdown',
					label: 'Operation',
					id: 'timeline_create_cue_cueoperation',
					default: 1,
					choices: [
						{label: 'Play', id: 1},
						{label: 'Pause', id: 2},
						{label: 'Stop', id: 3},
						{label: 'Jump', id: 4}
					]
				},
				{
					type: 'checkbox',
					label: 'At Current Time',
					id: 'timeline_create_cue_atcurrenttime',
					default: true,
				},
				{
					type: 'textinput',
					label: 'Hour',
					id: 'timeline_create_cue_h',
					isVisible: (options) => options.timeline_create_cue_atcurrenttime == 0,
					default: '0',
				},
				{
					type: 'textinput',
					label: 'Minute',
					id: 'timeline_create_cue_m',
					isVisible: (options) => options.timeline_create_cue_atcurrenttime == 0,
					default: '0',
				},
				{
					type: 'textinput',
					label: 'Second',
					id: 'timeline_create_cue_s',
					isVisible: (options) => options.timeline_create_cue_atcurrenttime == 0,
					default: '0',
				},
				{
					type: 'textinput',
					label: 'Frame',
					id: 'timeline_create_cue_f',
					isVisible: (options) => options.timeline_create_cue_atcurrenttime == 0,
					default: '0',
				}
			],
			callback: async (event) => {
				let opt = event.options;

				if(opt.timeline_create_cue_atcurrenttime) {
					self.TIMELINE_CREATE_CUE_TIMELINEHANDLE = parseInt(opt.timeline_create_cue_timelinename);
					self.TIMELINE_CREATE_CUE_CUENAME = opt.timeline_create_cue_cuename;
					self.TIMELINE_CREATE_CUE_CUEOPERATION = parseInt(opt.timeline_create_cue_cueoperation);

					self.pixera.sendParams(9,'Pixera.Timelines.Timeline.getCurrentTime',
						{'handle':parseInt(opt.timeline_create_cue_timelinename)});
				}
				else {
					let hour = parseInt(await self.parseVariablesInString(opt.timeline_create_cue_h));
					let min = parseInt(await self.parseVariablesInString(opt.timeline_create_cue_m));
					let sec = parseInt(await self.parseVariablesInString(opt.timeline_create_cue_s));
					let frame = parseInt(await self.parseVariablesInString(opt.timeline_create_cue_f));

					let fps = 60;
					for(let i = 0; i <self.CHOICES_TIMELINEFEEDBACK.length; i++){
						if(self.CHOICES_TIMELINEFEEDBACK[i]['handle'] == opt.timeline_create_cue_timelinename){
							fps = self.CHOICES_TIMELINEFEEDBACK[i]['fps'];
							break;
						}
					}

					let time = (((hour * 60)*60)*parseInt(fps))+((min*60)*parseInt(fps))+(sec*parseInt(fps))+frame;
					let handle = parseInt(opt.timeline_create_cue_timelinename);
					let name = opt.timeline_create_cue_cuename;
					let operation = parseInt(opt.timeline_create_cue_cueoperation);

					self.pixera.sendParams(0,'Pixera.Timelines.Timeline.createCue',
						{'handle':handle, 'name':name, 'timeInFrames':time, 'operation':operation});
				}
			}
		}

		actions.goto_cue_name = {
			name: 'Goto Cue',
			options: [
				{
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'timelinename_cuename',
					default: 0,
					choices: self.CHOICES_TIMELINENAME
				},
				{
					type: 'textinput',
					label: 'Cue Name',
					id: 'cue_name',
					default: '',
				}
			],
			callback: async (event) => {
				let opt = event.options;
				let timelineName = '';
				for(let k = 0; k<self.CHOICES_TIMELINEFEEDBACK.length;k++){
					if(self.CHOICES_TIMELINEFEEDBACK[k]['handle'] == opt.timelinename_cuename){
						timelineName = self.CHOICES_TIMELINEFEEDBACK[k]['name'];
						break;
					}
				}
				self.pixera.sendParams(0,'Pixera.Compound.applyCueOnTimeline',{'timelineName':timelineName,'cueName':await self.parseVariablesInString(opt.cue_name)});
			}
		}

		actions.goto_cue_index = {
			name: 'Goto Cue Index',
			options: [
				{
					type: 'textinput',
					label: 'Timeline Index',
					id: 'timelinecue_index',
					default: '0',
					tooltip: 'index starts at 0',
					useVariables: true,
					regex:   self.REGEX_NUMBER
				},
				{
					type: 'textinput',
					label: 'Cue Index',
					id: 'cue_index',
					default: '0',
					tooltip: 'index starts at 0',
					useVariables: true,
					regex:   self.REGEX_NUMBER
				}
			],
			callback: async (event) => {
				let opt = event.options;
				let indexTl = parseInt(await self.parseVariablesInString(opt.timelinecue_index));
				let indexCue = parseInt(await self.parseVariablesInString(opt.cue_index));
				self.pixera.sendParams(0,'Pixera.Compound.applyCueAtIndexOnTimelineAtIndex',{'cueIndex':indexCue,'timelineIndex':indexTl});
			}
		}

		actions.blend_to_time = {
			name: 'Blend To Timecode',
			options: [
			{
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'blend_time_timelinename',
					default: 0,
					choices: self.CHOICES_TIMELINENAME
				},
				{
					type: 'textinput',
					label: 'Hour',
					id: 'blend_time_h',
					default: '0',
				},
				{
					type: 'textinput',
					label: 'Minute',
					id: 'blend_time_m',
					default: '0',
				},
				{
					type: 'textinput',
					label: 'Second',
					id: 'blend_time_s',
					default: '0',
				},
				{
					type: 'textinput',
					label: 'Frame',
					id: 'blend_time_f',
					default: '0',
				},
				{
					type: 'textinput',
					label: 'Blendtime in Frames',
					id: 'blend_time_frames',
					default: '0',
				}
			],
			callback: async (event) => {
				let opt = event.options;

				let hour = parseInt(await self.parseVariablesInString(opt.blend_time_h));
				let min = parseInt(await self.parseVariablesInString(opt.blend_time_m));
				let sec = parseInt(await self.parseVariablesInString(opt.blend_time_s));
				let frame = parseInt(await self.parseVariablesInString(opt.blend_time_f));
				
				let fps = 60;
				for(let k = 0; k<self.CHOICES_TIMELINEFEEDBACK.length;k++){
					if(self.CHOICES_TIMELINEFEEDBACK[k]['handle'] == opt.blend_time_timelinename){
						fps = self.CHOICES_TIMELINEFEEDBACK[k]['fps'];
						break;
					}
				}
				let blendDuration = parseInt(await self.parseVariablesInString(opt.blend_time_frames));
				let time = (((hour * 60)*60)*parseInt(fps))+((min*60)*parseInt(fps))+(sec*parseInt(fps))+frame;
				self.pixera.sendParams(0,'Pixera.Timelines.Timeline.blendToTime',{'handle':opt.blend_time_timelinename,'goalTime':time,'blendDuration':blendDuration});
			}
		}

		actions.blend_cue_name = {
			name: 'Blend to Cue',
			options: [
				{
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'timelinename_blendcuename',
					default: 0,
					choices: self.CHOICES_TIMELINENAME
				},
				{
					type: 'textinput',
					label: 'Cue Name',
					id: 'blend_cue_name',
					default: ''
				},
				{
					type: 'textinput',
					label: 'Blendtime in Frames',
					id: 'blend_name_frames',
					default: 0,
				}
			],
			callback: async (event) => {
				let opt = event.options;
				self.CHOICES_BLENDNAME_TIMELINE = parseInt(opt.timelinename_blendcuename);
				let cueName = await self.parseVariablesInString(opt.blend_cue_name);
				let blendDuration = parseInt(await self.parseVariablesInString(opt.blend_name_frames));
				self.CHOICES_BLENDNAME_FRAMES = blendDuration;
				self.pixera.sendParams(33,'Pixera.Timelines.Timeline.getCueFromName',{'handle':parseInt(opt.timelinename_blendcuename),'name':cueName});
			}
		}
		
		actions.blendNextCue = {
			name: 'Blend to Next Cue',
			options: [
				{
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'timelinename_blendcuename',
					default: 0,
					choices: self.CHOICES_TIMELINENAME
				},
				{
					type: 'textinput',
					label: 'Blendtime in Frames',
					id: 'blend_name_frames',
					default: 1.0,
					regex:   self.REGEX_FLOAT
				}
			],
			callback: async (event) => {
				let opt = event.options;
				let blendDuration = parseInt(await self.parseVariablesInString(opt.blend_name_frames));
				self.CHOICES_BLENDNAME_FRAMES = blendDuration;
				self.pixera.sendParams(33,'Pixera.Timelines.Timeline.getCueNext',{'handle':parseInt(opt.timelinename_blendcuename)});
			}
		}

		actions.blendPrevCue = {
			name: 'Blend to Prev Cue',
			options: [
				{
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'timelinename_blendcuename',
					default: 0,
					choices: self.CHOICES_TIMELINENAME
				},
				{
					type: 'textinput',
					label: 'Blendtime in Frames',
					id: 'blend_name_frames',
					default: 1.0,
					regex:   self.REGEX_FLOAT
				}
			],
			callback: async (event) => {
				let opt = event.options;
				let blendDuration = parseInt(await self.parseVariablesInString(opt.blend_name_frames));
				self.CHOICES_BLENDNAME_FRAMES = blendDuration;
				self.pixera.sendParams(33,'Pixera.Timelines.Timeline.getCuePrevious',{'handle':parseInt(opt.timelinename_blendcuename)});
			}
		}

		actions.timeline_opacity = {
			name: 'Timeline Opacity',
			options: [
				{
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'timelinename_timelineopacity',
					default: 0,
					choices: self.CHOICES_TIMELINENAME
				},
				{
					type: 'textinput',
					label: 'Opacity',
					id: 'timeline_opacity',
					default: '1.0',
					regex:   self.REGEX_FLOAT
				}
			],
			callback: async (event) => {
				let opt = event.options;
				let val = parseFloat(await self.parseVariablesInString(opt.timeline_opacity));
				self.pixera.sendParams(0,'Pixera.Timelines.Timeline.setOpacity',{'handle':parseInt(opt.timelinename_timelineopacity),'value':val});
			}
		}

		//Created 10/27/2023 by Cody Luketic
		actions.timeline_zoomfactor = {
			name: 'Timeline Zoom Factor',
			options: [
				{
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'timeline_zoomfactor_timelinename',
					default: 0,
					choices: self.CHOICES_TIMELINENAME
				},
				{
					type: 'textinput',
					label: 'Zoom Factor',
					id: 'timeline_zoomfactor_factor',
					default: 1.0,
					regex: self.REGEX_FLOAT
				}
			],
			callback: async (event) => {
				let opt = event.options;

				let val = parseFloat(await self.parseVariablesInString(opt.timeline_zoomfactor_zoomfactor));
				self.pixera.sendParams(0,'Pixera.Timelines.Timeline.setZoomFactor',
					{'handle':parseInt(opt.timeline_zoomfactor_timelinename),
						'zoomFactor':parseFloat(opt.timeline_zoomfactor_factor)});
			}
		}

		//Created 10/27/2023 by Cody Luketic
		actions.timeline_select = {
			name: 'Timeline Select',
			options: [
				{
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'timeline_select_timelinename',
					default: 0,
					choices: self.CHOICES_TIMELINENAME
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.Timelines.Timeline.selectThis',
					{'handle':parseInt(opt.timeline_select_timelinename)});
			}
		}

		//Created 10/27/2023 by Cody Luketic
		actions.timeline_moverenderorder = {
			name: 'Timeline Move Render Order',
			options: [
				{
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'timeline_select_timelinename',
					default: 0,
					choices: self.CHOICES_TIMELINENAME
				},
				{
					type: 'checkbox',
					label: 'Move (On = Down, Off = Up)',
					id: 'timeline_moverenderorder',
					default: true,
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.Timelines.Timeline.moveInRenderOrder',
					{'handle':parseInt(opt.timeline_select_timelinename), 'moveDown':opt.timeline_moverenderorder});
			}
		}

		//Created 10/27/2023 by Cody Luketic
		actions.timeline_create_layer = {
			name: 'Timeline Create Layer',
			options: [
				{
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'timeline_create_layer_timelinename',
					default: 0,
					choices: self.CHOICES_TIMELINENAME
				},
				{
					type: 'textinput',
					label: 'Layer Name',
					id: 'timeline_create_layer_layername',
					default: 'Layer 1',
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.CREATE_LAYER_LAYERNAME = opt.timeline_create_layer_layername;

				self.pixera.sendParams(8,'Pixera.Timelines.Timeline.createLayer',
					{'handle':parseInt(opt.timeline_create_layer_timelinename)});
			}
		}

		//Created 10/27/2023 by Cody Luketic
		actions.timeline_removecues = {
			name: 'Timeline Remove Cues',
			options: [
				{
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'timeline_removecues_timelinename',
					default: 0,
					choices: self.CHOICES_TIMELINENAME
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.Timelines.Timeline.removeCues',
					{'handle':parseInt(opt.timeline_removecues_timelinename)});
			}
		}

		//Created 10/27/2023 by Cody Luketic
		actions.timeline_reset = {
			name: 'Timeline Reset',
			options: [
				{
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'timeline_reset_timelinename',
					default: 0,
					choices: self.CHOICES_TIMELINENAME
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.Timelines.Timeline.reset',
					{'handle':parseInt(opt.timeline_reset_timelinename)});
			}
		}

		//Created 10/27/2023 by Cody Luketic
		actions.timeline_speedfactor = {
			name: 'Timeline Speed Factor',
			options: [
				{
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'timeline_speedfactor_timelinename',
					default: 0,
					choices: self.CHOICES_TIMELINENAME
				},
				{
					type: 'textinput',
					label: 'Speed Factor',
					id: 'timeline_speedfactor_factor',
					default: 1.0,
					regex: self.REGEX_FLOAT
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.Timelines.Timeline.setSpeedFactor',
					{'handle':parseInt(opt.timeline_speedfactor_timelinename),
						'factor':parseFloat(opt.timeline_speedfactor_factor)});
			}
		}
		
		actions.timeline_setsmpte = {
			name: 'Timeline Set SMPTE',
			options: [
				{
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'timelinename_timelineopacity',
					default: 0,
					choices: self.CHOICES_TIMELINENAME
				},
				{
					type: 'dropdown',
					label: 'State',
					id: 'timeline_smpte_state',
					default: 0,
					choices:[
						{id: 0, label: 'none'},
						{id: 1, label: 'receive'},
						{id: 2, label: 'send'},
					]
				}
			],
			callback: async (event) => {
				let opt = event.options;
				self.pixera.sendParams(0,'Pixera.Timelines.Timeline.setSmpteMode',{'handle':parseInt(opt.timelinename_timelineopacity),'mode':parseInt(opt.timeline_smpte_state)});
			}
		}

		actions.timeline_fadeopacity = {
			name: 'Timeline Fade Opacity',
			options: [
				{
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'timelinename_timelineopacity',
					default: 0,
					choices: self.CHOICES_TIMELINENAME
				},
				{
					type: 'checkbox',
					label: 'FadeIn',
					id: 'timeline_fadeIn',
					default: true
				},
				{
					type: 'textinput',
					label: 'Time in Frames',
					id: 'timeline_fadeopacity_time',
					default: '60',
					regex:   self.REGEX_INT
				}
			],
			callback: async (event) => {
				let opt = event.options;
				self.pixera.sendParams(36,'Pixera.Timelines.Timeline.startOpacityAnimation',{'handle':parseInt(opt.timelinename_timelineopacity),'fadeIn': opt.timeline_fadeIn, 'fullFadeDuration': parseFloat(opt.timeline_fadeopacity_time)});
			}
		}

		actions.layerReset = {
			name: 'Layer Reset',
			options: [
				{
					type: 'textinput',
					label: 'Layer Path',
					id: 'layerPath',
					default: 'Timeline 1.Layer 1',
				}
			],
			callback: async (event) => {
				let opt = event.options;
				self.pixera.sendParams(43,'Pixera.Timelines.Layer.getInst',{'instancePath': opt.layerPath});
			}
		}

		actions.layerMute = {
			name: 'Layer Mute',
			options: [
				{
					type: 'textinput',
					label: 'Layer Path',
					id: 'layerPath',
					default: 'Timeline 1.Layer 1',
				},
				{
					type: 'dropdown',
					label: 'Parameter',
					id: 'layerParameterMute',
					default: 'muteLayer',
					choices:[
						{id: 'muteLayer', label: 'Mute Layer'},
						{id: 'muteVolume', label: 'Mute Volume'},
					]
				},
				{
					type: 'checkbox',
					label: 'Mute',
					id: 'layerState',
					default: true,
				}
			],
			callback: async (event) => {
				let opt = event.options;
				if(opt.layerParameterMute === 'muteLayer')
				{
					if(opt.layerState === true){
						self.pixera.sendParams(39,'Pixera.Timelines.Layer.getInst',{'instancePath': opt.layerPath});
					}
					else{
						self.pixera.sendParams(40,'Pixera.Timelines.Layer.getInst',{'instancePath': opt.layerPath});
					}
				}
				else if(opt.layerParameterMute == 'muteVolume')
				{
					if(opt.layerState === true){
						self.pixera.sendParams(41,'Pixera.Timelines.Layer.getInst',{'instancePath': opt.layerPath});
					}
					else{
						self.pixera.sendParams(42,'Pixera.Timelines.Layer.getInst',{'instancePath': opt.layerPath});
					}
				}	
			}
		}
		
		//Updated 10/31/2023 by Cody Luketic
		actions.layer_mute_extended = {
			name: 'Layer Mute Extended',
			options: [
				{
					type: 'checkbox',
					label: 'Toggle',
					id: 'layer_mute_extended_state',
					default: true,
				},
				{
					type: 'textinput',
					label: 'Layer Path',
					id: 'layer_mute_extended_path',
					default: 'Timeline 1.Layer 1',
				},
				{
					type: 'dropdown',
					label: 'Parameter',
					id: 'layer_mute_extended_parameter',
					default: 0,
					choices:[
						{label: 'Mute Layer', id: 0},
						{label: 'Mute Volume', id: 1},
					]
				}
			],
			callback: async (event) => {
				let opt = event.options;
				if(opt.layer_mute_extended_parameter == 0)
				{
					self.pixera.sendParams(44,'Pixera.Timelines.Layer.getInst',
						{'instancePath': opt.layer_mute_extended_path});
				}
				else if(opt.layer_mute_extended_parameter == 'muteVolume')
				{
					self.pixera.sendParams(45,'Pixera.Timelines.Layer.getInst',
						{'instancePath': opt.layer_mute_extended_path});
				}	
			}
		}

		actions.layerParameter = {
			name: 'Layer Parameter',
			options: [
				{
					type: 'textinput',
					label: 'Parameter Path',
					id: 'layerPath',
					default: 'Timeline 1.Layer 1.Opacity',
				},
				{
					type: 'textinput',
					label: 'Value',
					id: 'layerValue',
					default: 1.0,
					regex:   self.REGEX_FLOAT
				}
			],
			callback: async (event) => {
				let opt = event.options;
				self.pixera.sendParams(0,'Pixera.Compound.setParamValue',{'path': opt.layerPath ,'value': parseFloat(opt.layerValue)});
			}
		}

		//Updated 10/30/2023 by Cody Luketic
		actions.session_project = {
			name: 'Session Project',
			options: [
				{
					type: 'dropdown',
					label: 'Action',
					id: 'session_project_action',
					default: 1,
					choices: [
						{label: 'Save', id: 0},
						{label: 'Save As', id: 1},
						{label: 'Load', id: 2},
						{label: 'Close', id: 3}
					]
				},
				{
					type: 'checkbox',
					label: 'Save Project',
					id: 'session_project_saveproject',
					isVisible: (options) => options.session_project_action == 3,
					default: true,
				},
				{
					type: 'textinput',
					label: 'Project Path',
					id: 'session_project_projectpath',
					isVisible: (options) => options.session_project_action == 1 || options.session_project_action == 2,
					default: 'C:\\',
				}
			],
			callback: async (event) => {
				let opt = event.options;

				switch (opt.session_project_action) {
					case 0:
						self.pixera.send(0,'Pixera.Session.saveProject');
						break;
					case 1:
						self.pixera.sendParams(0,'Pixera.Session.saveProjectAs',
							{'path':opt.session_project_projectpath});
						break;
					case 2:
						self.pixera.sendParams(0,'Pixera.Session.loadProject',
							{'path':opt.session_project_projectpath});
						break;
					case 3:
						self.pixera.sendParams(0,'Pixera.Session.closeApp',
							{'saveProject':opt.session_project_saveproject});
						break;
					default:
						break;
				}
			}
		}

		//Created 10/31/2023 by Cody Luketic
		actions.session_livesystem = {
			name: 'Session Livesystem',
			options: [
				{
					type: 'textinput',
					label: 'IP',
					id: 'session_livesystem_ip',
					default: '127.0.0.1',
				},
				{
					type: 'dropdown',
					label: 'Action',
					id: 'session_livesystem_action',
					default: 0,
					choices: [
						{label: 'Start', id: 0},
						{label: 'Stop', id: 1},
						{label: 'Restart', id: 2}
					]
				},
				{
					type: 'checkbox',
					label: 'All Live Systems',
					id: 'session_livesystem_all',
					default: false,
				}
			],
			callback: async (event) => {
				let opt = event.options;

				if(opt.session_livesystem_all) {
					switch (opt.session_livesystem_action) {
						case 0:
							self.pixera.send(0,'Pixera.Session.startLiveSystems');
							break;
						case 1:
							self.pixera.send(0,'Pixera.Session.stopLiveSystems');
							break;
						case 2:
							self.pixera.send(0,'Pixera.Session.restartLiveSystems');
							break;
						default:
							break;
					}
				}
				else {
					switch (opt.session_livesystem_action) {
						case 0:
							self.pixera.sendParams(0,'Pixera.Session.startLiveSystem',
								{'ip':opt.session_livesystem_ip});
							break;
						case 1:
							self.pixera.sendParams(0,'Pixera.Session.stopLiveSystem',
								{'ip':opt.session_livesystem_ip});
							break;
						case 2:
							self.pixera.sendParams(0,'Pixera.Session.restartLiveSystem',
								{'ip':opt.session_livesystem_ip});
							break;
						default:
							break;
					}
				}
			}
		}

		//Created 10/30/2023 by Cody Luketic
		actions.session_setvideostreamactivestate = {
			name: 'Session Set Video Stream Active State',
			options: [
				{
					type: 'textinput',
					label: 'IP',
					id: 'session_setvideostreamactivestate_ip',
					default: '127.0.0.1',
				},
				{
					type: 'textinput',
					label: 'Device',
					id: 'session_setvideostreamactivestate_device',
					default: '',
				},
				{
					type: 'checkbox',
					label: 'Is Active',
					id: 'session_setvideostreamactivestate_isactive',
					default: false,
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.Session.setVideoStreamActiveState',
					{'ip':opt.session_setvideostreamactivestate_ip,
						'device':opt.session_setvideostreamactivestate_device,
						'isActive':opt.session_setvideostreamactivestate_isactive});
			}
		}
		
		//Created 10/30/2023 by Cody Luketic
		actions.livesystems_exportMappings = {
			name: 'Live Systems Export Mappings',
			options: [
				{
					type: 'dropdown',
					label: 'Live System',
					id: 'livesystems_exportMappings_livesystem',
					default: 0,
					choices: self.CHOICES_LIVESYSTEMNAME
				},
				{
					type: 'textinput',
					label: 'Export Path',
					id: 'livesystems_exportMappings_exportpath',
					default: 'C:\\',
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.exportMappings',
					{'handle':parseInt(opt.livesystems_exportMappings_livesystem),'path':opt.livesystems_exportMappings_exportpath});
			}
		}

		//Created 10/27/2023 by Cody Luketic
		actions.livesystems_engine = {
			name: 'Live Systems Engine',
			options: [
				{
					type: 'dropdown',
					label: 'Live System',
					id: 'livesystems_engine_livesystem',
					default: 0,
					choices: self.CHOICES_LIVESYSTEMNAME
				},
				{
					type: 'dropdown',
					label: 'Action',
					id: 'livesystems_engine_action',
					default: 0,
					choices: [
						{label: 'Start', id: 0},
						{label: 'Close', id: 1},
						{label: 'Restart', id: 2},
						{label: 'Reset', id: 3},
						{label: 'Wake Up', id: 4}
					]
				},
				{
					type: 'checkbox',
					label: 'All Live Systems',
					id: 'livesystems_engine_all',
					default: false,
				},
				{
					type: 'checkbox',
					label: 'Exclude Local',
					id: 'livesystems_engine_local',
					default: true,
				}
			],
			callback: async (event) => {
				let opt = event.options;
				let id = opt.livesystems_engine_action;

				if(opt.livesystems_engine_all) {
					for (let i = 0; i < self.CHOICES_LIVESYSTEMNAME.length; i++) {
						let handle = self.CHOICES_LIVESYSTEMNAME[i].id;
						if(!opt.livesystems_engine_local){
							switch (id) {
								case 0:
									self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.startEngine',
										{'handle':parseInt(handle)});
									break;
								case 1:
									self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.closeEngine',
										{'handle':parseInt(handle)});
									break;
								case 2:
									self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.restartEngine',
										{'handle':parseInt(handle)});
									break;
								case 3:
									self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.resetEngine',
										{'handle':parseInt(handle)});
									break;
								case 4:
									self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.wakeUp',
										{'handle':parseInt(handle)});
									break;
								default:
									break;
							}
						}
						else if(self.CHOICES_LIVESYSTEMNAME[i].label != 'Local'){
							switch (id) {
								case 0:
									self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.startEngine',
										{'handle':parseInt(handle)});
									break;
								case 1:
									self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.closeEngine',
										{'handle':parseInt(handle)});
									break;
								case 2:
									self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.restartEngine',
										{'handle':parseInt(handle)});
									break;
								case 3:
									self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.resetEngine',
										{'handle':parseInt(handle)});
									break;
								case 4:
									self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.wakeUp',
										{'handle':parseInt(handle)});
									break;
								default:
									break;
							}
						}
					}
				}
				else {
					switch (id) {
						case 0:
							self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.startEngine',
								{'handle':parseInt(opt.livesystems_engine_livesystem)});
							break;
						case 1:
							self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.closeEngine',
								{'handle':parseInt(opt.livesystems_engine_livesystem)});
							break;
						case 2:
							self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.restartEngine',
								{'handle':parseInt(opt.livesystems_engine_livesystem)});
							break;
						case 3:
							self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.resetEngine',
								{'handle':parseInt(opt.livesystems_engine_livesystem)});
							break;
						case 4:
							self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.wakeUp',
								{'handle':parseInt(opt.livesystems_engine_livesystem)});
							break;
						default:
							break;
					}
				}
			}
		}

		//Updated 10/31/2023 by Cody Luketic
		actions.livesystems_setaudiomaster_volume = {
			name: 'Live Systems Set Audio Master Volume',
			options: [
				{
					type: 'dropdown',
					label: 'Live System',
					id: 'livesystems_setaudiomaster_volume_livesystem',
					default: 0,
					choices: self.CHOICES_LIVESYSTEMNAME
				},
				{
					type: 'textinput',
					label: 'Channel',
					id: 'livesystems_setaudiomaster_volume_channel',
					default: '1',
				},
				{
					type: 'textinput',
					label: 'Volume',
					id: 'livesystems_setaudiomaster_volume_value',
					default: 1.0,
					regex: self.REGEX_FLOAT
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.setAudioMasterVolume',
					{'handle':parseInt(opt.livesystems_setaudiomaster_volume_livesystem),
						'channel':parseInt(opt.livesystems_setaudiomaster_volume_channel),
						'volume':parseFloat(opt.livesystems_setaudiomaster_volume_value)});
			}
		}

		//Updated 10/31/2023 by Cody Luketic
		actions.livesystems_setaudiomaster_mute = {
			name: 'Live Systems Set Audio Master Mute',
			options: [
				{
					type: 'dropdown',
					label: 'Live System',
					id: 'livesystems_setaudiomaster_mute_livesystem',
					default: 0,
					choices: self.CHOICES_LIVESYSTEMNAME
				},
				{
					type: 'textinput',
					label: 'Channel',
					id: 'livesystems_setaudiomaster_mute_channel',
					default: '1',
				},
				{
					type: 'checkbox',
					label: 'Toggle Mute',
					id: 'livesystems_setaudiomaster_mute_toggle',
					default: false,
				},
				{
					type: 'checkbox',
					label: 'Mute',
					id: 'livesystems_setaudiomaster_mute_state',
					isVisible: (options) => options.livesystems_setaudiomaster_mute_toggle == 0,
					default: false,
				}
			],
			callback: async (event) => {
				let opt = event.options;

				if(opt.livesystems_setaudiomaster_mute_toggle) {
					self.LIVESYSTEMS_SETAUDIOMASTER_MUTE_LIVESYSTEM = parseInt(opt.livesystems_setaudiomaster_mute_livesystem);
					self.LIVESYSTEMS_SETAUDIOMASTER_MUTE_CHANNEL = parseInt(opt.livesystems_setaudiomaster_mute_channel);

					self.pixera.sendParams(7,'Pixera.LiveSystems.LiveSystem.getAudioMasterMute',
						{'handle':parseInt(opt.livesystems_setaudiomaster_mute_livesystem),
							'channel':parseInt(opt.livesystems_setaudiomaster_mute_channel)});
				}
				else {
					self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.setAudioMasterMute',
						{'handle':parseInt(opt.livesystems_setaudiomaster_mute_livesystem),
							'channel':parseInt(opt.livesystems_setaudiomaster_mute_channel),
							'state':opt.livesystems_setaudiomaster_mute_state});
				}
			}
		}
		
		//Updated 10/31/2023 by Cody Luketic
		actions.livesystems_setaudiotimecodeinput = {
			name: 'Live Systems Set Audio Timecode Input',
			options: [
				{
					type: 'dropdown',
					label: 'Live System',
					id: 'livesystems_setaudiotimecodeinput_livesystem',
					default: 0,
					choices: self.CHOICES_LIVESYSTEMNAME
				},
				{
					type: 'textinput',
					label: 'Channel',
					id: 'livesystems_setaudiotimecodeinput_channel',
					default: '1',
				},
				{
					type: 'checkbox',
					label: 'State',
					id: 'livesystems_setaudiotimecodeinput_state',
					default: true,
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.setAudioTimecodeInput',
					{'handle':parseInt(opt.livesystems_setaudiotimecodeinput_livesystem),
						'channel':parseInt(opt.livesystems_setaudiotimecodeinput_channel),
						'state':opt.livesystems_setaudiotimecodeinput_state});
			}
		}

		actions.controlAction = {
			name: 'Control Call Action',
			options: [
				{
					type: 'textinput',
					label: 'Control Path',
					id: 'controlPath',
					default: 'Logger.info'
				},
				{
					type: 'textinput',
					label: 'arguments',
					id: 'controlArguments',
					default: '"Hello World" 1 12.7 false'
				}
			],
			callback: async (event) => {
				let opt = event.options;
				let args = [];
				let argString = await self.parseVariablesInString(opt.controlArguments)

				const tempArgs = (argString + '').replace(/“/g, '"').replace(/”/g, '"').split(' ')

				if (tempArgs.length) {
					args = [];
				}

				for (let i = 0; i < tempArgs.length; i++) {
					if (tempArgs[i].length == 0)
						continue;
					if(tempArgs[i] === "true" || tempArgs[i] === "True")
						args.push(true);
					else if(tempArgs[i] === "false" || tempArgs[i] === "False")
						args.push(false);
					else if (isNaN(tempArgs[i])) {
						var str = tempArgs[i];
						if (str.startsWith("\""))
						{  //a quoted string..
								while (!tempArgs[i].endsWith("\""))
								{
									i++;
									str += " "+tempArgs[i];
								}

						}
						args.push(str.replace(/"/g, '').replace(/'/g, ''));
					}
					else if (tempArgs[i].indexOf('.') > -1) {
						args.push(parseFloat(tempArgs[i]));
					}
					else {
						args.push(parseInt(tempArgs[i]));
					}
				}

				self.pixera.sendParams(0,opt.controlPath,args);
			}
		}

		actions.api = {
			name: 'API',
			options: [
				{
					type: 'textinput',
					label: 'API',
					id: 'api_methode',
					default: ''
				}
			],
			callback: async (event) => {
				let opt = event.options;
				try{
					let apiCmd = JSON.parse(opt.api_methode);
					self.pixera.sendParams(9999,apiCmd['method'],apiCmd['params']);
				}
				catch{
					self.log('error', 'Can not parse json in API call.');
					return;
				}
			}
		}
		//set the actions
		//self.log('debug', 'set actions')
		self.setActionDefinitions(actions);
  },
}