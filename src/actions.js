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

		actions.test = {
			name: 'test action',
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
						default: false
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
					choices: self.CHOICES_TIMELINENAME,
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

		actions.layerParameter = {
			name: 'Layer Paramter',
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