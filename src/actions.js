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

		// Created 10/27/2023 by Cody Luketic
		actions.timeline_transport_sync = {
			name: 'Timeline Transport Sync',
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
				}
			],
			callback: async (event) => {
				for (let index = 1; index < self.CHOICES_TIMELINENAME.length; index++) {
					self.pixera.sendParams(0,'Pixera.Timelines.Timeline.setTransportMode',
								{'handle':parseInt(self.CHOICES_TIMELINENAME[index].id), 'mode':parseInt(event.options.mode)});
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

		// Created 10/27/2023 by Cody Luketic
		actions.move_nowpointer = {
			name: 'Move Nowpointer',
			options: [
				{
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'move_nowpointer_timelinename',
					default: 0,
					choices: self.CHOICES_TIMELINENAME
				},
				{
					type: 'textinput',
					label: 'Frames',
					id: 'move_nowpointer_frames',
					default: '0',
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.CHOICES_MOVE_NOWPOINTER_TIMELINEHANDLE = parseInt(opt.move_nowpointer_timelinename);
				self.CHOICES_MOVE_NOWPOINTER_FRAMES = parseInt(opt.move_nowpointer_frames);

				self.pixera.sendParams(10,'Pixera.Timelines.Timeline.getCurrentTime',{'handle':parseInt(opt.move_nowpointer_timelinename)});
			}
		}

		/*
		// Created 10/27/2023 by Cody Luketic
		actions.timeline_scrubcurrenttime = {
			name: 'Timeline Scrub',
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
					default: '0',
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.Timelines.Timeline.scrubCurrentTime',{'handle':parseInt(opt.timeline_scrubcurrenttime__timelinename), 'frames':parseInt(opt.timeline_scrubcurrenttime_frames)});
			}
		}
		*/

		// Created 10/27/2023 by Cody Luketic
		let cueChoices = [{label: '', id: 0}];
		cueChoices.push({label: 'Play', id: 1});
		cueChoices.push({label: 'Pause', id: 2});
		cueChoices.push({label: 'Stop', id: 3});
		cueChoices.push({label: 'Jump', id: 4});

		actions.create_cue_atnowpointer = {
			name: 'Create Cue at Nowpointer',
			options: [
				{
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'create_cue_atnowpointer_timelinename',
					default: 0,
					choices: self.CHOICES_TIMELINENAME
				},
				{
					type: 'textinput',
					label: 'Name',
					id: 'create_cue_atnowpointer_cuename',
					default: '',
				},
				{
					type: 'dropdown',
					label: 'Operation',
					id: 'create_cue_atnowpointer_cueoperation',
					default: 0,
					choices: cueChoices
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.CHOICES_CREATE_CUE_ATNOWPOINTER_TIMELINEHANDLE = parseInt(opt.create_cue_atnowpointer_timelinename);
				self.CHOICES_CREATE_CUE_ATNOWPOINTER_CUEOPERATION = parseInt(opt.create_cue_atnowpointer_cueoperation);
				self.CHOICES_CREATE_CUE_ATNOWPOINTER_CUENAME = opt.create_cue_atnowpointer_cuename;

				self.pixera.sendParams(9,'Pixera.Timelines.Timeline.getCurrentTime',{'handle':parseInt(opt.create_cue_atnowpointer_timelinename)});
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

		// Created 10/27/2023 by Cody Luketic
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
					id: 'timeline_zoomfactor_zoomfactor',
					default: '1.0',
					regex:   self.REGEX_FLOAT
				}
			],
			callback: async (event) => {
				let opt = event.options;

				let val = parseFloat(await self.parseVariablesInString(opt.timeline_zoomfactor_zoomfactor));
				self.pixera.sendParams(0,'Pixera.Timelines.Timeline.setZoomFactor',{'handle':parseInt(opt.timeline_zoomfactor_timelinename),'zoomFactor':val});
			}
		}

		// Created 10/27/2023 by Cody Luketic
		let transportToggle = true
		actions.timeline_toggletransport = {
			name: 'Timeline Toggle Transport',
			options: [
				{
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'timeline_toggletransport_timelinename',
					default: 0,
					choices: self.CHOICES_TIMELINENAME
				}
			],
			callback: async (event) => {
				let opt = event.options;

				if(transportToggle) {
					transportToggle = false
					self.pixera.sendParams(0,'Pixera.Timelines.Timeline.play',{'handle':parseInt(opt.timeline_toggletransport_timelinename)});
				}
				else {
					transportToggle = true
					self.pixera.sendParams(0,'Pixera.Timelines.Timeline.pause',{'handle':parseInt(opt.timeline_toggletransport_timelinename)});
				}
			}
		}

		// Created 10/27/2023 by Cody Luketic
		let transportToggleSync = true
		actions.timeline_toggletransport_sync = {
			name: 'Timeline Toggle Transport Sync',
			options: [],
			callback: async (event) => {
				let opt = event.options;

				if(transportToggleSync) {
					transportToggleSync = false
					for (let index = 1; index < self.CHOICES_TIMELINENAME.length; index++) {
						self.pixera.sendParams(0,'Pixera.Timelines.Timeline.play',{'handle':parseInt(self.CHOICES_TIMELINENAME[index].id)});
					}
				}
				else {
					transportToggleSync = true
					for (let index = 1; index < self.CHOICES_TIMELINENAME.length; index++) {
						self.pixera.sendParams(0,'Pixera.Timelines.Timeline.pause',{'handle':parseInt(self.CHOICES_TIMELINENAME[index].id)});
					}
				}
			}
		}

		// Created 10/27/2023 by Cody Luketic
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

				self.pixera.sendParams(0,'Pixera.Timelines.Timeline.selectThis',{'handle':parseInt(opt.timeline_select_timelinename)});
			}
		}

		// Created 10/27/2023 by Cody Luketic
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
					default: true
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.Timelines.Timeline.moveInRenderOrder',{'handle':parseInt(opt.timeline_select_timelinename), 'moveDown':opt.timeline_moverenderorder});
			}
		}

		// Created 10/27/2023 by Cody Luketic
		actions.timeline_createlayer = {
			name: 'Timeline Create Layer',
			options: [
				{
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'timeline_createlayer_timelinename',
					default: 0,
					choices: self.CHOICES_TIMELINENAME
				},
				{
					type: 'textinput',
					label: 'Layer Name',
					id: 'timeline_createlayer_layername',
					default: 'Layer 1',
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.CHOICES_CREATELAYER_LAYERNAME = opt.timeline_createlayer_layername;

				self.pixera.sendParams(8,'Pixera.Timelines.Timeline.createLayer',{'handle':parseInt(opt.timeline_createlayer_timelinename)});
			}
		}

		// Created 10/27/2023 by Cody Luketic
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

				self.pixera.sendParams(0,'Pixera.Timelines.Timeline.removeCues',{'handle':parseInt(opt.timeline_removecues_timelinename)});
			}
		}

		// Created 10/27/2023 by Cody Luketic
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

				self.pixera.sendParams(0,'Pixera.Timelines.Timeline.reset',{'handle':parseInt(opt.timeline_reset_timelinename)});
			}
		}

		// Created 10/27/2023 by Cody Luketic
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
					id: 'timeline_speedfactor_speedfactor',
					default: 0,
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.Timelines.Timeline.setSpeedFactor',{'handle':parseInt(opt.timeline_speedfactor_timelinename), 'factor':parseFloat(opt.timeline_speedfactor_speedfactor)});
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

		// Created 10/27/2023 by Cody Luketic
		let muteToggled = false;
		actions.layer_mute_toggle = {
			name: 'Layer Mute Toggle',
			options: [
				{
					type: 'textinput',
					label: 'Layer Path',
					id: 'layer_mute_toggle_layerpath',
					default: 'Timeline 1.Layer 1',
				},
				{
					type: 'dropdown',
					label: 'Parameter',
					id: 'layer_mute_toggle_layerparametermute',
					default: 'muteLayer',
					choices:[
						{id: 'muteLayer', label: 'Mute Layer'},
						{id: 'muteVolume', label: 'Mute Volume'},
					]
				}
			],
			callback: async (event) => {
				let opt = event.options;
				if(opt.layer_mute_toggle_layerparametermute === 'muteLayer')
				{
					if(muteToggled === true){
						muteToggled = false;
						self.pixera.sendParams(39,'Pixera.Timelines.Layer.getInst',{'instancePath': opt.layer_mute_toggle_layerpath});
					}
					else{
						muteToggled = true;
						self.pixera.sendParams(40,'Pixera.Timelines.Layer.getInst',{'instancePath': opt.layer_mute_toggle_layerpath});
					}
				}
				else if(opt.layer_mute_toggle_layerparametermute == 'muteVolume')
				{
					if(opt.layerState === true){
						self.pixera.sendParams(41,'Pixera.Timelines.Layer.getInst',{'instancePath': opt.layer_mute_toggle_layerpath});
					}
					else{
						self.pixera.sendParams(42,'Pixera.Timelines.Layer.getInst',{'instancePath': opt.layer_mute_toggle_layerpath});
					}
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

		// Created 10/27/2023 by Cody Luketic
		actions.session_closeapp = {
			name: 'Session Close App',
			options: [
				{
					type: 'checkbox',
					label: 'Save Project',
					id: 'session_closeapp_saveproject',
					default: 0,
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.Session.closeApp',{'saveProject':opt.session_closeapp_saveproject});
			}
		}

		// Created 10/27/2023 by Cody Luketic
		actions.session_loadproject = {
			name: 'Session Load Project',
			options: [
				{
					type: 'textinput',
					label: 'Project Path',
					id: 'session_loadproject_projectpath',
					default: 'C:\\',
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.Session.loadProject',{'path':opt.session_loadproject_projectpath});
			}
		}

		// Created 10/27/2023 by Cody Luketic
		actions.session_saveproject = {
			name: 'Session Save Project',
			options: [],
			callback: async (event) => {
				self.pixera.send(0,'Pixera.Session.saveProject');
			}
		}

		// Created 10/27/2023 by Cody Luketic
		actions.session_saveprojectas = {
			name: 'Session Save Project As',
			options: [
				{
					type: 'textinput',
					label: 'Project Path',
					id: 'session_saveprojectas_projectpath',
					default: 'C:\\',
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.Session.saveProjectAs',{'path':opt.session_saveprojectas_projectpath});
			}
		}

		// Created 10/27/2023 by Cody Luketic
		actions.session_startlivesystem = {
			name: 'Session Start Livesystem',
			options: [
				{
					type: 'dropdown',
					label: 'System Ip',
					id: 'session_startlivesystem_ip',
					default: 0,
					choices: self.CHOICES_LIVESYSTEMIPNAME
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.Session.startLiveSystem',{'ip':opt.session_startlivesystem_ip});
			}
		}

		// Created 10/30/2023 by Cody Luketic
		actions.session_startlivesystem = {
			name: 'Session Start Livesystem',
			options: [],
			callback: async (event) => {
				self.pixera.send(0,'Pixera.Session.startLiveSystems');
			}
		}

		// Created 10/27/2023 by Cody Luketic
		actions.session_stoplivesystem = {
			name: 'Session Stop Livesystem',
			options: [
				{
					type: 'dropdown',
					label: 'System Ip',
					id: 'session_stoplivesystem_ip',
					default: '',
					choices: self.CHOICES_LIVESYSTEMIPNAME
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.Session.stopLiveSystem',{'ip':opt.session_stoplivesystem_ip});
			}
		}

		// Created 10/30/2023 by Cody Luketic
		actions.session_stoplivesystem = {
			name: 'Session Stop Livesystem',
			options: [],
			callback: async (event) => {
				self.pixera.send(0,'Pixera.Session.stopLiveSystems');
			}
		}

		// Created 10/30/2023 by Cody Luketic
		actions.session_restartlivesystem = {
			name: 'Session Restart Livesystem',
			options: [
				{
					type: 'dropdown',
					label: 'System Ip',
					id: 'session_restartlivesystem_ip',
					default: '',
					choices: self.CHOICES_LIVESYSTEMIPNAME
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.Session.restartLiveSystem',{'ip':opt.session_restartlivesystem_ip});
			}
		}

		// Created 10/30/2023 by Cody Luketic
		actions.session_restartlivesystems = {
			name: 'Session Restart Livesystems',
			options: [],
			callback: async (event) => {
				self.pixera.send(0,'Pixera.Session.restartLiveSystems');
			}
		}

		// Created 10/30/2023 by Cody Luketic
		actions.session_remotesystemstatechange = {
			name: 'Session Remote System State Change',
			options: [
				{
					type: 'dropdown',
					label: 'System Ip',
					id: 'session_remotesystemstatechange_ip',
					default: '',
					choices: self.CHOICES_LIVESYSTEMIPNAME
				},
				{
					type: 'textinput',
					label: 'State',
					id: 'session_remotesystemstatechange_state',
					default: '',
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.Session.remoteSystemStateChange',{'ip':opt.session_remotesystemstatechange_ip, 'state':opt.session_remotesystemstatechange_state});
			}
		}

		// Created 10/30/2023 by Cody Luketic
		actions.session_setvideostreamactivestate = {
			name: 'Session Set Video Stream Active State',
			options: [
				{
					type: 'dropdown',
					label: 'System IP',
					id: 'session_setvideostreamactivestate_ip',
					default: '',
					choices: self.CHOICES_REMOTESYSTEMIPNAME
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
					default: '',
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.Session.setVideoStreamActiveState',{'ip':opt.session_setvideostreamactivestate_ip, 'device':opt.session_setvideostreamactivestate_device, 'isActive':opt.session_setvideostreamactivestate_isactive});
			}
		}

		// Created 10/30/2023 by Cody Luketic
		actions.livesystems_setbackuprole = {
			name: 'Live Systems Set Backup Role',
			options: [
				{
					type: 'dropdown',
					label: 'Live System',
					id: 'livesystems_setbackuprole_livesystem',
					default: '',
					choices: self.CHOICES_LIVESYSTEMNAME
				},
				{
					type: 'textinput',
					label: 'Role',
					id: 'livesystems_setbackuprole_role',
					default: '',
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.setBackupRole',{'handle':parseInt(opt.livesystems_setbackuprole_livesystem), 'role':opt.session_restartlivesystem_role});
			}
		}

		/*
		// Created 10/30/2023 by Cody Luketic
		actions.livesystems_exportMappings = {
			name: 'Live Systems Export Mappings',
			options: [
				{
					type: 'dropdown',
					label: 'Live System',
					id: 'livesystems_setbackuprole_livesystem',
					default: '',
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

				self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.exportMappings',{'handle':parseInt(opt.livesystems_exportMappings_livesystem),'path':opt.livesystems_exportMappings_exportpath});
			}
		}
		*/

		// Created 10/27/2023 by Cody Luketic
		actions.livesystems_startengine = {
			name: 'Live Systems Start Engine',
			options: [
				{
					type: 'dropdown',
					label: 'Live System',
					id: 'livesystems_startengine_livesystem',
					default: 0,
					choices: self.CHOICES_LIVESYSTEMNAME
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.startEngine',{'handle':parseInt(opt.livesystems_startengine_livesystem)});
			}
		}

		// Created 10/27/2023 by Cody Luketic
		actions.livesystems_closeengine = {
			name: 'Live Systems Close Engine',
			options: [
				{
					type: 'dropdown',
					label: 'Live System',
					id: 'livesystems_closeengine_livesystem',
					default: '',
					choices: self.CHOICES_LIVESYSTEMNAME
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.closeEngine',{'handle':parseInt(opt.livesystems_closeengine_livesystem)});
			}
		}

		// Created 10/30/2023 by Cody Luketic
		actions.livesystems_restartEngine = {
			name: 'Live Systems Restart Engine',
			options: [
				{
					type: 'dropdown',
					label: 'Live System',
					id: 'livesystems_restartengine_livesystem',
					default: '',
					choices: self.CHOICES_LIVESYSTEMNAME
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.restartEngine',{'handle':parseInt(opt.livesystems_restartengine_livesystem)});
			}
		}

		// Created 10/30/2023 by Cody Luketic
		actions.livesystems_resetEngine = {
			name: 'Live Systems Reset Engine',
			options: [
				{
					type: 'dropdown',
					label: 'Live System',
					id: 'livesystems_resetengine_livesystem',
					default: '',
					choices: self.CHOICES_LIVESYSTEMNAME
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.resetEngine',{'handle':parseInt(opt.livesystems_resetengine_livesystem)});
			}
		}

		// Created 10/30/2023 by Cody Luketic
		actions.livesystems_wakeup = {
			name: 'Live Systems Wake Up',
			options: [
				{
					type: 'dropdown',
					label: 'Live System',
					id: 'livesystems_wakeup_livesystem',
					default: '',
					choices: self.CHOICES_LIVESYSTEMNAME
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.wakeUp',{'handle':parseInt(opt.livesystems_wakeup_livesystem)});
			}
		}

		/*
		// Created 10/30/2023 by Cody Luketic
		actions.livesystems_setaudiomaster_volume = {
			name: 'Live Systems Set Audio Master Volume',
			options: [
				{
					type: 'dropdown',
					label: 'Live System',
					id: 'livesystems_setaudiomaster_volume_livesystem',
					default: '',
					choices: self.CHOICES_LIVESYSTEMNAME
				},
				{
					type: 'textinput',
					label: 'Channel',
					id: 'livesystems_setaudiomaster_volume_channel',
					default: 0,
				},
				{
					type: 'textinput',
					label: 'Volume',
					id: 'livesystems_setaudiomaster_volume_volume',
					default: 1,
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.setAudioMasterVolume',{'handle':parseInt(opt.livesystems_setaudiomaster_volume_livesystem), 'channel':opt.livesystems_setaudiomaster_volume_channel, 'volume':opt.livesystems_setaudiomaster_volume_volume});
			}
		}
		*/

		/*
		// Created 10/30/2023 by Cody Luketic
		actions.livesystems_setaudiomaster_mute = {
			name: 'Live Systems Set Audio Master Mute',
			options: [
				{
					type: 'dropdown',
					label: 'Live System',
					id: 'livesystems_setaudiomaster_mute_livesystem',
					default: '',
					choices: self.CHOICES_LIVESYSTEMNAME
				},
				{
					type: 'textinput',
					label: 'Channel',
					id: 'livesystems_setaudiomaster_mute_channel',
					default: 0,
				},
				{
					type: 'checkbox',
					label: 'Mute',
					id: 'livesystems_setaudiomaster_mute_state',
					default: 1,
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.setAudioMasterVolume',{'handle':parseInt(opt.livesystems_setaudiomaster_mute_livesystem), 'channel':opt.livesystems_setaudiomaster_mute_channel, 'state':opt.livesystems_setaudiomaster_mute_state});
			}
		}
		*/

		/*
		// Created 10/30/2023 by Cody Luketic
		actions.livesystems_setaudiotimecodeinput = {
			name: 'Live Systems Set Audio Timecode Input',
			options: [
				{
					type: 'dropdown',
					label: 'Live System',
					id: 'livesystems_setaudiotimecodeinput_livesystem',
					default: '',
					choices: self.CHOICES_LIVESYSTEMNAME
				},
				{
					type: 'textinput',
					label: 'Channel',
					id: 'livesystems_setaudiotimecodeinput_channel',
					default: 0,
				},
				{
					type: 'checkbox',
					label: 'State',
					id: 'livesystems_setaudiotimecodeinput_state',
					default: 1,
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.setAudioMasterVolume',{'handle':parseInt(opt.livesystems_setaudiotimecodeinput_livesystem), 'channel':opt.livesystems_setaudiotimecodeinput_channel, 'state':opt.livesystems_setaudiotimecodeinput_state});
			}
		}
		*/

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