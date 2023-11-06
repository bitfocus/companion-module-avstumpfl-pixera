const { InstanceStatus }  = require('@companion-module/base');
const { forEach } = require('lodash');
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
					label: 'Make Toggle',
					id: 'timeline_transport_toggle',
					default: false,
				},
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'timeline_transport_mode',
					isVisible: (options) => options.timeline_transport_toggle == 0,
					default: 1,
					choices:[
						{label: 'Play', id: 1},
						{label: 'Pause', id: 2},
						{label: 'Stop', id: 3}
					]
				},
				{
					type: 'dropdown',
					label: 'Type',
					id: 'timeline_transport_type',
					default: 1,
					choices:[
						{label: 'Single', id: 1},
						{label: 'Multiple', id: 2},
						{label: 'All', id: 3}
					]
				},
				{
					type: 'dropdown',
					label: 'Timeline Name',
					id: 'timeline_transport_name',
					isVisible: (options) => options.timeline_transport_type == 1,
					default: 0,
					choices: self.CHOICES_TIMELINENAME
				},
				{
					type: 'textinput',
					label: 'Timeline Names',
					id: 'timeline_transport_names',
					isVisible: (options) => options.timeline_transport_type == 2,
					default: 'Timeline 1,Timeline 2,Timeline 3',
				}
			],
			callback: async (event) => {
				let opt = event.options;

				if(opt.timeline_transport_toggle) {
					switch (opt.timeline_transport_type) {
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
					switch (opt.timeline_transport_type) {
						case 1:
							self.pixera.sendParams(0,'Pixera.Timelines.Timeline.setTransportMode',
								{'handle':parseInt(opt.timeline_transport_name), 'mode':parseInt(opt.timeline_transport_mode)});
							break;
						case 2:
							let timelines = opt.timeline_transport_names.split(',');
							for (let i = 0; i < timelines.length; i++) {
								for(var k = 0; k < self.CHOICES_TIMELINEFEEDBACK.length; k++){
									if(timelines[i] == self.CHOICES_TIMELINEFEEDBACK[k]['name']){
										self.pixera.sendParams(0,'Pixera.Timelines.Timeline.setTransportMode',
											{'handle':parseInt(self.CHOICES_TIMELINEFEEDBACK[k]['handle']),
												'mode':parseInt(opt.timeline_transport_mode)});
									}
								}
							}
							break;
						case 3:
							for (let i = 0; i < self.CHOICES_TIMELINEFEEDBACK.length; i++) {
								self.pixera.sendParams(0,'Pixera.Timelines.Timeline.setTransportMode',
									{'handle':parseInt(self.CHOICES_TIMELINEFEEDBACK[i]['handle']), 'mode':parseInt(opt.timeline_transport_mode)});
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

		//Created 11/3/2023 by Cody Luketic
		actions.screen_transform = {
			name: 'Screen Transform',
			options: [
				{
					type: 'dropdown',
					label: 'Screen Name',
					id: 'screen_transform_screenname',
					default: 0,
					choices: self.CHOICES_SCREENNAME
				},
				{
					type: 'dropdown',
					label: 'Type',
					id: 'screen_transform_type',
					default: 5,
					choices:[
						{label: 'Position', id: 1},
						{label: 'Rotation', id: 2},
						{label: 'Scale', id: 3},
						{label: 'Position and Rotation', id: 4},
						{label: 'Position and Rotation and Scale', id: 5}
					]
				},
				{
					type: 'textinput',
					label: 'Position X',
					id: 'screen_transform_position_x',
					isVisible: (options) => options.screen_transform_type == 1
						|| options.screen_transform_type == 4
						|| options.screen_transform_type == 5,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Position Y',
					id: 'screen_transform_position_y',
					isVisible: (options) => options.screen_transform_type == 1
						|| options.screen_transform_type == 4
						|| options.screen_transform_type == 5,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Position Z',
					id: 'screen_transform_position_z',
					isVisible: (options) => options.screen_transform_type == 1
						|| options.screen_transform_type == 4
						|| options.screen_transform_type == 5,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Rotation X',
					id: 'screen_transform_rotation_x',
					isVisible: (options) => options.screen_transform_type == 2
						|| options.screen_transform_type == 4
						|| options.screen_transform_type == 5,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Rotation Y',
					id: 'screen_transform_rotation_y',
					isVisible: (options) => options.screen_transform_type == 2
						|| options.screen_transform_type == 4
						|| options.screen_transform_type == 5,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Rotation Z',
					id: 'screen_transform_rotation_z',
					isVisible: (options) => options.screen_transform_type == 2
						|| options.screen_transform_type == 4
						|| options.screen_transform_type == 5,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Scale X',
					id: 'screen_transform_scale_x',
					isVisible: (options) => options.screen_transform_type == 3
						|| options.screen_transform_type == 5,
					default: '1.0',
				},
				{
					type: 'textinput',
					label: 'Scale Y',
					id: 'screen_transform_scale_y',
					isVisible: (options) => options.screen_transform_type == 3
						|| options.screen_transform_type == 5,
					default: '1.0',
				},
				{
					type: 'textinput',
					label: 'Scale Z',
					id: 'screen_transform_scale_z',
					isVisible: (options) => options.screen_transform_type == 3
						|| options.screen_transform_type == 5,
					default: '1.0',
				}
			],
			callback: async (event) => {
				let opt = event.options;

				switch(opt.screen_transform_type) {
					case 1:
						self.pixera.sendParams(0,'Pixera.Screens.Screen.setPosition',
							{'handle':parseInt(opt.screen_transform_screenname),
								'xPos':parseFloat(opt.screen_transform_position_x),
								'yPos':parseFloat(opt.screen_transform_position_y),
								'zPos':parseFloat(opt.screen_transform_position_z)});
						break;
					case 2:
						self.pixera.sendParams(0,'Pixera.Screens.Screen.setRotation',
							{'handle':parseInt(opt.screen_transform_screenname),
								'xRot':parseFloat(opt.screen_transform_rotation_x),
								'yRot':parseFloat(opt.screen_transform_rotation_y),
								'zRot':parseFloat(opt.screen_transform_rotation_z)});
						break;
					case 3:
						self.pixera.sendParams(0,'Pixera.Screens.Screen.setScale',
							{'handle':parseInt(opt.screen_transform_screenname),
								'xScale':parseFloat(opt.screen_transform_scale_x),
								'yScale':parseFloat(opt.screen_transform_scale_y),
								'zScale':parseFloat(opt.screen_transform_scale_z)});
						break;
					case 4:
						self.pixera.sendParams(0,'Pixera.Screens.Screen.setPosRot',
							{'handle':parseInt(opt.screen_transform_screenname),
								'xPos':parseFloat(opt.screen_transform_position_x),
								'yPos':parseFloat(opt.screen_transform_position_y),
								'zPos':parseFloat(opt.screen_transform_position_z),
								'xRot':parseFloat(opt.screen_transform_rotation_x),
								'yRot':parseFloat(opt.screen_transform_rotation_y),
								'zRot':parseFloat(opt.screen_transform_rotation_z)});
						break;
					case 5:
						self.pixera.sendParams(0,'Pixera.Screens.Screen.setPosRotScale',
							{'handle':parseInt(opt.screen_transform_screenname),
								'xPos':parseFloat(opt.screen_transform_position_x),
								'yPos':parseFloat(opt.screen_transform_position_y),
								'zPos':parseFloat(opt.screen_transform_position_z),
								'xRot':parseFloat(opt.screen_transform_rotation_x),
								'yRot':parseFloat(opt.screen_transform_rotation_y),
								'zRot':parseFloat(opt.screen_transform_rotation_z),
								'xScale':parseFloat(opt.screen_transform_scale_x),
								'yScale':parseFloat(opt.screen_transform_scale_y),
								'zScale':parseFloat(opt.screen_transform_scale_z)});
						break;
					default:
						break;
				}
			}
		}

		//Created 11/6/2023 by Cody Luketic
		actions.screen_perspective_transform = {
			name: 'Screen Perspective Transform',
			options: [
				{
					type: 'dropdown',
					label: 'Screen Name',
					id: 'screen_perspective_transform_screenname',
					default: 0,
					choices: self.CHOICES_SCREENNAME
				},
				{
					type: 'dropdown',
					label: 'Type',
					id: 'screen_perspective_transform_type',
					default: 1,
					choices:[
						{label: 'Position', id: 1},
						{label: 'Position with Look at', id: 2},
						{label: 'Rotation', id: 3},
						{label: 'Snap Corners to Screen', id: 4}
					]
				},
				{
					type: 'textinput',
					label: 'Position X',
					id: 'screen_perspective_transform_position_x',
					isVisible: (options) => options.screen_perspective_transform_type == 1,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Position Y',
					id: 'screen_perspective_transform_position_y',
					isVisible: (options) => options.screen_perspective_transform_type == 1,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Position Z',
					id: 'screen_perspective_transform_position_z',
					isVisible: (options) => options.screen_perspective_transform_type == 1,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Position Look at X',
					id: 'screen_perspective_transform_positionlookat_x',
					isVisible: (options) => options.screen_perspective_transform_type == 2,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Position Look at Y',
					id: 'screen_perspective_transform_positionlookat_y',
					isVisible: (options) => options.screen_perspective_transform_type == 2,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Position Look at Z',
					id: 'screen_perspective_transform_positionlookat_z',
					isVisible: (options) => options.screen_perspective_transform_type == 2,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Rotation X',
					id: 'screen_perspective_transform_rotation_x',
					isVisible: (options) => options.screen_perspective_transform_type == 3,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Rotation Y',
					id: 'screen_perspective_transform_rotation_y',
					isVisible: (options) => options.screen_perspective_transform_type == 3,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Rotation Z',
					id: 'screen_perspective_transform_rotation_z',
					isVisible: (options) => options.screen_perspective_transform_type == 3,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Mode',
					id: 'screen_perspective_transform_mode',
					isVisible: (options) => options.screen_perspective_transform_type == 4,
					default: '0.0',
				}
			],
			callback: async (event) => {
				let opt = event.options;

				switch(opt.screen_perspective_transform_type) {
					case 1:
						self.pixera.sendParams(0,'Pixera.Screens.Screen.setPerspectivePosition',
							{'handle':parseInt(opt.screen_perspective_transform_screenname),
								'xPos':parseFloat(opt.screen_perspective_transform_position_x),
								'yPos':parseFloat(opt.screen_perspective_transform_position_y),
								'zPos':parseFloat(opt.screen_perspective_transform_position_z)});
						break;
					case 2:
						self.pixera.sendParams(0,'Pixera.Screens.Screen.setPerspectivePositionWithLookAt',
							{'handle':parseInt(opt.screen_perspective_transform_screenname),
								'xPos':parseFloat(opt.screen_perspective_transform_positionlookat_x),
								'yPos':parseFloat(opt.screen_perspective_transform_positionlookat_y),
								'zPos':parseFloat(opt.screen_perspective_transform_positionlookat_z)});
						break;
					case 3:
						self.pixera.sendParams(0,'Pixera.Screens.Screen.setPerspectiveRotation',
							{'handle':parseInt(opt.screen_perspective_transform_screenname),
								'xRot':parseFloat(opt.screen_perspective_transform_rotation_x),
								'yRot':parseFloat(opt.screen_perspective_transform_rotation_y),
								'zRot':parseFloat(opt.screen_perspective_transform_rotation_z)});
						break;
					case 4:
						self.pixera.sendParams(0,'Pixera.Screens.Screen.snapPerspectiveCornersToScreen',
							{'handle':parseInt(opt.screen_perspective_transform_screenname),
								'mode':parseFloat(opt.screen_perspective_transform_mode)});
						break;
					default:
						break;
				}
			}
		}

		//Created 11/6/2023 by Cody Luketic
		actions.screen_camera_transform = {
			name: 'Screen Camera Transform',
			options: [
				{
					type: 'dropdown',
					label: 'Screen Name',
					id: 'screen_camera_transform_screenname',
					default: 0,
					choices: self.CHOICES_SCREENNAME
				},
				{
					type: 'dropdown',
					label: 'Type',
					id: 'screen_camera_transform_type',
					default: 1,
					choices:[
						{label: 'Position', id: 1},
						{label: 'Position with Look at', id: 2},
						{label: 'Rotation', id: 3},
					]
				},
				{
					type: 'textinput',
					label: 'Position X',
					id: 'screen_camera_transform_position_x',
					isVisible: (options) => options.screen_camera_transform_type == 1,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Position Y',
					id: 'screen_camera_transform_position_y',
					isVisible: (options) => options.screen_camera_transform_type == 1,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Position Z',
					id: 'screen_camera_transform_position_z',
					isVisible: (options) => options.screen_camera_transform_type == 1,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Position Look at X',
					id: 'screen_camera_transform_positionlookat_x',
					isVisible: (options) => options.screen_camera_transform_type == 2,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Position Look at Y',
					id: 'screen_camera_transform_positionlookat_y',
					isVisible: (options) => options.screen_camera_transform_type == 2,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Position Look at Z',
					id: 'screen_camera_transform_positionlookat_z',
					isVisible: (options) => options.screen_camera_transform_type == 2,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Rotation X',
					id: 'screen_camera_transform_rotation_x',
					isVisible: (options) => options.screen_camera_transform_type == 3,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Rotation Y',
					id: 'screen_camera_transform_rotation_y',
					isVisible: (options) => options.screen_camera_transform_type == 3,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Rotation Z',
					id: 'screen_camera_transform_rotation_z',
					isVisible: (options) => options.screen_camera_transform_type == 3,
					default: '0.0',
				}
			],
			callback: async (event) => {
				let opt = event.options;

				switch(opt.screen_camera_transform_type) {
					case 1:
						self.pixera.sendParams(0,'Pixera.Screens.Screen.setCameraPosition',
							{'handle':parseInt(opt.screen_camera_transform_screenname),
								'xPos':parseFloat(opt.screen_camera_transform_position_x),
								'yPos':parseFloat(opt.screen_camera_transform_position_y),
								'zPos':parseFloat(opt.screen_camera_transform_position_z)});
						break;
					case 2:
						self.pixera.sendParams(0,'Pixera.Screens.Screen.setCameraPositionWithLookAt',
							{'handle':parseInt(opt.screen_camera_transform_screenname),
								'xPos':parseFloat(opt.screen_camera_transform_positionlookat_x),
								'yPos':parseFloat(opt.screen_camera_transform_positionlookat_y),
								'zPos':parseFloat(opt.screen_camera_transform_positionlookat_z)});
						break;
					case 3:
						self.pixera.sendParams(0,'Pixera.Screens.Screen.setCameraRotation',
							{'handle':parseInt(opt.screen_camera_transform_screenname),
								'xRot':parseFloat(opt.screen_camera_transform_rotation_x),
								'yRot':parseFloat(opt.screen_camera_transform_rotation_y),
								'zRot':parseFloat(opt.screen_camera_transform_rotation_z)});
						break;
					default:
						break;
				}
			}
		}

		//Created 11/6/2023 by Cody Luketic
		actions.screen_studiocamera_transform = {
			name: 'Screen Studio Camera Transform',
			options: [
				{
					type: 'dropdown',
					label: 'Studio Camera Name',
					id: 'screen_studiocamera_transform_studiocameraname',
					default: 0,
					choices: self.CHOICES_STUDIOCAMERANAME
				},
				{
					type: 'dropdown',
					label: 'Type',
					id: 'screen_studiocamera_transform_type',
					default: 1,
					choices:[
						{label: 'Position', id: 1},
						{label: 'Rotation', id: 2},
						{label: 'Transformation', id: 3}/*,
						{label: 'Transformation and Lens Properties', id: 4},
						{label: 'Transformation and Lens Properties Extended', id: 5},*/
					]
				},
				{
					type: 'textinput',
					label: 'Position X',
					id: 'screen_studiocamera_transform_position_x',
					isVisible: (options) => options.screen_studiocamera_transform_type == 1
						|| options.screen_studiocamera_transform_type == 3
						|| options.screen_studiocamera_transform_type == 4
						|| options.screen_studiocamera_transform_type == 5,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Position Y',
					id: 'screen_studiocamera_transform_position_y',
					isVisible: (options) => options.screen_studiocamera_transform_type == 1
						|| options.screen_studiocamera_transform_type == 3
						|| options.screen_studiocamera_transform_type == 4
						|| options.screen_studiocamera_transform_type == 5,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Position Z',
					id: 'screen_studiocamera_transform_position_z',
					isVisible: (options) => options.screen_studiocamera_transform_type == 1
						|| options.screen_studiocamera_transform_type == 3
						|| options.screen_studiocamera_transform_type == 4
						|| options.screen_studiocamera_transform_type == 5,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Rotation X',
					id: 'screen_studiocamera_transform_rotation_x',
					isVisible: (options) => options.screen_studiocamera_transform_type == 2
						|| options.screen_studiocamera_transform_type == 3
						|| options.screen_studiocamera_transform_type == 4
						|| options.screen_studiocamera_transform_type == 5,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Rotation Y',
					id: 'screen_studiocamera_transform_rotation_y',
					isVisible: (options) => options.screen_studiocamera_transform_type == 2
						|| options.screen_studiocamera_transform_type == 3
						|| options.screen_studiocamera_transform_type == 4
						|| options.screen_studiocamera_transform_type == 5,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Rotation Z',
					id: 'screen_studiocamera_transform_rotation_z',
					isVisible: (options) => options.screen_studiocamera_transform_type == 2
						|| options.screen_studiocamera_transform_type == 3
						|| options.screen_studiocamera_transform_type == 4
						|| options.screen_studiocamera_transform_type == 5,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'FOV',
					id: 'screen_studiocamera_transform_fov',
					isVisible: (options) => options.screen_studiocamera_transform_type == 3
						|| options.screen_studiocamera_transform_type == 4
						|| options.screen_studiocamera_transform_type == 5,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Aspect Ratio',
					id: 'screen_studiocamera_transform_aspectratio',
					isVisible: (options) => options.screen_studiocamera_transform_type == 3
						|| options.screen_studiocamera_transform_type == 4
						|| options.screen_studiocamera_transform_type == 5,
					default: '0.0',
				}/*,
				{
					type: 'textinput',
					label: 'Near Clip',
					id: 'screen_studiocamera_transform_nearclip',
					isVisible: (options) => options.screen_studiocamera_transform_type == 4
						|| options.screen_studiocamera_transform_type == 5,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Far Clip',
					id: 'screen_studiocamera_transform_farclip',
					isVisible: (options) => options.screen_studiocamera_transform_type == 4
						|| options.screen_studiocamera_transform_type == 5,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Aperture',
					id: 'screen_studiocamera_transform_aperture',
					isVisible: (options) => options.screen_studiocamera_transform_type == 4
						|| options.screen_studiocamera_transform_type == 5,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Focus',
					id: 'screen_studiocamera_transform_focus',
					isVisible: (options) => options.screen_studiocamera_transform_type == 4
						|| options.screen_studiocamera_transform_type == 5,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Focal Distance',
					id: 'screen_studiocamera_transform_focaldistance',
					isVisible: (options) => options.screen_studiocamera_transform_type == 5,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Zoom',
					id: 'screen_studiocamera_transform_zoom',
					isVisible: (options) => options.screen_studiocamera_transform_type == 5,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Iris',
					id: 'screen_studiocamera_transform_iris',
					isVisible: (options) => options.screen_studiocamera_transform_type == 4
						|| options.screen_studiocamera_transform_type == 5,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'K1',
					id: 'screen_studiocamera_transform_k1',
					isVisible: (options) => options.screen_studiocamera_transform_type == 4
						|| options.screen_studiocamera_transform_type == 5,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'K2',
					id: 'screen_studiocamera_transform_k2',
					isVisible: (options) => options.screen_studiocamera_transform_type == 4
						|| options.screen_studiocamera_transform_type == 5,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'K3',
					id: 'screen_studiocamera_transform_k3',
					isVisible: (options) => options.screen_studiocamera_transform_type == 5,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'P1',
					id: 'screen_studiocamera_transform_p1',
					isVisible: (options) => options.screen_studiocamera_transform_type == 5,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'P2',
					id: 'screen_studiocamera_transform_p2',
					isVisible: (options) => options.screen_studiocamera_transform_type == 5,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Center X',
					id: 'screen_studiocamera_transform_centerx',
					isVisible: (options) => options.screen_studiocamera_transform_type == 4
						|| options.screen_studiocamera_transform_type == 5,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Center Y',
					id: 'screen_studiocamera_transform_centery',
					isVisible: (options) => options.screen_studiocamera_transform_type == 4
						|| options.screen_studiocamera_transform_type == 5,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Panel Width',
					id: 'screen_studiocamera_transform_panelwidth',
					isVisible: (options) => options.screen_studiocamera_transform_type == 4
						|| options.screen_studiocamera_transform_type == 5,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Overscan',
					id: 'screen_studiocamera_transform_overscan',
					isVisible: (options) => options.screen_studiocamera_transform_type == 5,
					default: '0.0',
				}
				*/
			],
			callback: async (event) => {
				let opt = event.options;

				switch(opt.screen_studiocamera_transform_type) {
					case 1:
						self.pixera.sendParams(0,'Pixera.Screens.StudioCamera.setPosition',
							{'handle':parseInt(opt.screen_studiocamera_transform_studiocameraname),
								'xPos':parseFloat(opt.screen_studiocamera_transform_position_x),
								'yPos':parseFloat(opt.screen_studiocamera_transform_position_y),
								'zPos':parseFloat(opt.screen_studiocamera_transform_position_z)});
						break;
					case 2:
						self.pixera.sendParams(0,'Pixera.Screens.StudioCamera.setRotation',
							{'handle':parseInt(opt.screen_studiocamera_transform_studiocameraname),
								'xRot':parseFloat(opt.screen_studiocamera_transform_rotation_x),
								'yRot':parseFloat(opt.screen_studiocamera_transform_rotation_y),
								'zRot':parseFloat(opt.screen_studiocamera_transform_rotation_z)});
						break;
					case 3:
						self.pixera.sendParams(0,'Pixera.Screens.StudioCamera.setTransformation',
							{'handle':parseInt(opt.screen_studiocamera_transform_studiocameraname),
								'xPos':parseFloat(opt.screen_studiocamera_transform_position_x),
								'yPos':parseFloat(opt.screen_studiocamera_transform_position_y),
								'zPos':parseFloat(opt.screen_studiocamera_transform_position_z),
								'xRot':parseFloat(opt.screen_studiocamera_transform_rotation_x),
								'yRot':parseFloat(opt.screen_studiocamera_transform_rotation_y),
								'zRot':parseFloat(opt.screen_studiocamera_transform_rotation_z),
								'fov':parseFloat(opt.screen_studiocamera_transform_fov),
								'aspectRatio':parseFloat(opt.screen_studiocamera_transform_aspectratio)});
						break;
					/*
					case 4:
						self.pixera.sendParams(0,'Pixera.Screens.StudioCamera.setTransformationAndLensProps',
							{'handle':parseInt(opt.screen_studiocamera_transform_studiocameraname),
								'xPos':parseFloat(opt.screen_studiocamera_transform_position_x),
								'yPos':parseFloat(opt.screen_studiocamera_transform_position_y),
								'zPos':parseFloat(opt.screen_studiocamera_transform_position_z),
								'xRot':parseFloat(opt.screen_studiocamera_transform_rotation_x),
								'yRot':parseFloat(opt.screen_studiocamera_transform_rotation_y),
								'zRot':parseFloat(opt.screen_studiocamera_transform_rotation_z),
								'fov':parseFloat(opt.screen_studiocamera_transform_fov),
								'aspectRatio':parseFloat(opt.screen_studiocamera_transform_aspectratio),
								'nearClip':parseFloat(opt.screen_studiocamera_transform_nearclip),
								'farClip':parseFloat(opt.screen_studiocamera_transform_farclip),
								'aperture':parseFloat(opt.screen_studiocamera_transform_aperture),
								'focus':parseFloat(opt.screen_studiocamera_transform_focus),
								'iris':parseFloat(opt.screen_studiocamera_transform_iris),
								'k1':parseFloat(opt.screen_studiocamera_transform_k1),
								'k2':parseFloat(opt.screen_studiocamera_transform_k2),
								'centerX':parseFloat(opt.screen_studiocamera_transform_centerx),
								'centerY':parseFloat(opt.screen_studiocamera_transform_centery),
								'panelWidth':parseFloat(opt.screen_studiocamera_transform_panelwidth)});
						break;
					case 5:
						self.pixera.sendParams(0,'Pixera.Screens.StudioCamera.setTransformationAndLensPropsExt',
							{'handle':parseInt(opt.screen_studiocamera_transform_studiocameraname),
								'xPos':parseFloat(opt.screen_studiocamera_transform_position_x),
								'yPos':parseFloat(opt.screen_studiocamera_transform_position_y),
								'zPos':parseFloat(opt.screen_studiocamera_transform_position_z),
								'xRot':parseFloat(opt.screen_studiocamera_transform_rotation_x),
								'yRot':parseFloat(opt.screen_studiocamera_transform_rotation_y),
								'zRot':parseFloat(opt.screen_studiocamera_transform_rotation_z),
								'fov':parseFloat(opt.screen_studiocamera_transform_fov),
								'aspectRatio':parseFloat(opt.screen_studiocamera_transform_aspectratio),
								'nearClip':parseFloat(opt.screen_studiocamera_transform_nearclip),
								'farClip':parseFloat(opt.screen_studiocamera_transform_farclip),
								'aperture':parseFloat(opt.screen_studiocamera_transform_aperture),
								'focus':parseFloat(opt.screen_studiocamera_transform_focus),
								'focalDistance':parseFloat(opt.screen_studiocamera_transform_focaldistance),
								'zoom':parseFloat(opt.screen_studiocamera_transform_zoom),
								'iris':parseFloat(opt.screen_studiocamera_transform_iris),
								'k1':parseFloat(opt.screen_studiocamera_transform_k1),
								'k2':parseFloat(opt.screen_studiocamera_transform_k2),
								'k3':parseFloat(opt.screen_studiocamera_transform_k3),
								'p1':parseFloat(opt.screen_studiocamera_transform_p1),
								'p2':parseFloat(opt.screen_studiocamera_transform_p2),
								'centerX':parseFloat(opt.screen_studiocamera_transform_centerx),
								'centerY':parseFloat(opt.screen_studiocamera_transform_centery),
								'panelWidth':parseFloat(opt.screen_studiocamera_transform_panelwidth),
								'overscan':parseFloat(opt.screen_studiocamera_transform_overscan)});
						break;
					*/
					default:
						break;
				}
			}
		}

		//Created 11/6/2023 by Cody Luketic
		actions.screen_studiocamera_tracking = {
			name: 'Screen Studio Camera Tracking',
			options: [
				{
					type: 'dropdown',
					label: 'Studio Camera Name',
					id: 'screen_studiocamera_tracking_studiocameraname',
					default: 0,
					choices: self.CHOICES_STUDIOCAMERANAME
				},
				{
					type: 'checkbox',
					label: 'Pause Tracking Input: Make Toggle',
					id: 'screen_studiocamera_tracking_trackinginputpause_toggle',
					default: true,
				},
				{
					type: 'checkbox',
					label: 'Pause Tracking Input',
					id: 'screen_studiocamera_tracking_trackinginputpause',
					isVisible: (options) => options.screen_studiocamera_tracking_trackinginputpause_toggle == 0,
					default: false,
				},
				{
					type: 'checkbox',
					label: 'Use Position Properties From Tracking: Make Toggle',
					id: 'screen_studiocamera_tracking_positionfromtracking_toggle',
					default: true,
				},
				{
					type: 'checkbox',
					label: 'Use Position Properties From Tracking',
					id: 'screen_studiocamera_tracking_positionfromtracking',
					isVisible: (options) => options.screen_studiocamera_tracking_positionfromtracking_toggle == 0,
					default: false,
				},
				{
					type: 'checkbox',
					label: 'Use Rotation Properties From Tracking: Make Toggle',
					id: 'screen_studiocamera_tracking_rotationfromtracking_toggle',
					default: true,
				},
				{
					type: 'checkbox',
					label: 'Use Rotation Properties From Tracking',
					id: 'screen_studiocamera_tracking_rotationfromtracking',
					isVisible: (options) => options.screen_studiocamera_tracking_rotationfromtracking_toggle == 0,
					default: false,
				}
			],
			callback: async (event) => {
				let opt = event.options;
				
				if(opt.screen_studiocamera_trackinginputpause_toggle) {
					self.SCREEN_STUDIOCAMERA_TRACKING_STUDIOCAMERANAME = opt.screen_studiocamera_tracking_studiocameraname;
					self.pixera.sendParams(19,'Pixera.Screens.StudioCamera.getTrackingInputPause',
						{'handle':parseInt(opt.screen_studiocamera_tracking_studiocameraname)});
				}
				else {
					self.pixera.sendParams(0,'Pixera.Screens.StudioCamera.setTrackingInputPause',
						{'handle':parseInt(opt.screen_studiocamera_tracking_studiocameraname),
							'pause':opt.screen_studiocamera_tracking_trackinginputpause});
				}

				if(opt.screen_studiocamera_tracking_positionfromtracking_toggle) {
					self.SCREEN_STUDIOCAMERA_TRACKING_STUDIOCAMERANAME = opt.screen_studiocamera_tracking_studiocameraname;
					self.pixera.sendParams(20,'Pixera.Screens.StudioCamera.getUsePositionPropertiesFromTracking',
						{'handle':parseInt(opt.screen_studiocamera_tracking_studiocameraname)});
				}
				else {
					self.pixera.sendParams(0,'Pixera.Screens.StudioCamera.setUsePositionPropertiesFromTracking',
						{'handle':parseInt(opt.screen_studiocamera_tracking_studiocameraname),
							'pause':opt.screen_studiocamera_tracking_positionfromtracking});
				}

				if(opt.screen_studiocamera_tracking_rotationfromtracking_toggle) {
					self.SCREEN_STUDIOCAMERA_TRACKING_STUDIOCAMERANAME = opt.screen_studiocamera_tracking_studiocameraname;
					self.pixera.sendParams(21,'Pixera.Screens.StudioCamera.getUseRotationPropertiesFromTracking',
						{'handle':parseInt(opt.screen_studiocamera_tracking_studiocameraname)});
				}
				else {
					self.pixera.sendParams(0,'Pixera.Screens.StudioCamera.setUseRotationPropertiesFromTracking',
						{'handle':parseInt(opt.screen_studiocamera_tracking_studiocameraname),
							'pause':opt.screen_studiocamera_tracking_rotationfromtracking});
				}
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

		//Created 11/6/2023 by Cody Luketic
		actions.projector_transform = {
			name: 'Projector Transform',
			options: [
				{
					type: 'dropdown',
					label: 'Projector Name',
					id: 'projector_transform_projectorname',
					default: 0,
					choices: self.CHOICES_PROJECTORNAME
				},
				{
					type: 'dropdown',
					label: 'Type',
					id: 'projector_transform_type',
					default: 3,
					choices:[
						{label: 'Position', id: 1},
						{label: 'Rotation', id: 2},
						{label: 'Position and Rotation', id: 3}
					]
				},
				{
					type: 'textinput',
					label: 'Position X',
					id: 'projector_transform_position_x',
					isVisible: (options) => options.projector_transform_type == 1
						|| options.projector_transform_type == 3,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Position Y',
					id: 'projector_transform_position_y',
					isVisible: (options) => options.projector_transform_type == 1
						|| options.projector_transform_type == 3,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Position Z',
					id: 'projector_transform_position_z',
					isVisible: (options) => options.projector_transform_type == 1
						|| options.projector_transform_type == 3,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Rotation X',
					id: 'projector_transform_rotation_x',
					isVisible: (options) => options.projector_transform_type == 2
						|| options.projector_transform_type == 3,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Rotation Y',
					id: 'projector_transform_rotation_y',
					isVisible: (options) => options.projector_transform_type == 2
						|| options.projector_transform_type == 3,
					default: '0.0',
				},
				{
					type: 'textinput',
					label: 'Rotation Z',
					id: 'projector_transform_rotation_z',
					isVisible: (options) => options.projector_transform_type == 2
						|| options.projector_transform_type == 3,
					default: '0.0',
				}
			],
			callback: async (event) => {
				let opt = event.options;

				switch(opt.projector_transform_type) {
					case 1:
						self.pixera.sendParams(0,'Pixera.Projectors.Projector.setPosition',
							{'handle':parseInt(opt.projector_transform_projectorname),
								'xPos':parseFloat(opt.projector_transform_position_x),
								'yPos':parseFloat(opt.projector_transform_position_y),
								'zPos':parseFloat(opt.projector_transform_position_z)});
						break;
					case 2:
						self.pixera.sendParams(0,'Pixera.Projectors.Projector.setRotation',
							{'handle':parseInt(opt.projector_transform_projectorname),
								'xRot':parseFloat(opt.projector_transform_rotation_x),
								'yRot':parseFloat(opt.projector_transform_rotation_y),
								'zRot':parseFloat(opt.projector_transform_rotation_z)});
						break;
					case 3:
						self.pixera.sendParams(0,'Pixera.Projectors.Projector.setPosition',
							{'handle':parseInt(opt.projector_transform_projectorname),
								'xPos':parseFloat(opt.projector_transform_position_x),
								'yPos':parseFloat(opt.projector_transform_position_y),
								'zPos':parseFloat(opt.projector_transform_position_z)});

						self.pixera.sendParams(0,'Pixera.Projectors.Projector.setRotation',
							{'handle':parseInt(opt.projector_transform_projectorname),
								'xRot':parseFloat(opt.projector_transform_rotation_x),
								'yRot':parseFloat(opt.projector_transform_rotation_y),
								'zRot':parseFloat(opt.projector_transform_rotation_z)});
						break;
					default:
						break;
				}
			}
		}

		//Created 11/6/2023 by Cody Luketic
		actions.projector_blackout = {
			name: 'Projector Blackout Toggle',
			options: [
				{
					type: 'dropdown',
					label: 'Projector Name',
					id: 'projector_blackout_projectorname',
					default: 0,
					choices: self.CHOICES_PROJECTORNAME
				}/*,
				{
					type: 'checkbox',
					label: 'Make Toggle',
					id: 'projector_blackout_toggle',
					default: true,
				},
				{
					type: 'checkbox',
					label: 'Blackout',
					id: 'projector_blackout_state',
					isVisible: (options) => options.projector_blackout_toggle == 0,
					default: false,
				}
				*/
			],
			callback: async (event) => {
				let opt = event.options;

				self.PROJECTOR_BLACKOUT_PROJECTORNAME = opt.projector_blackout_projectorname;
				self.pixera.sendParams(22,'Pixera.Projectors.Projector.getBlackout',
					{'handle':parseInt(opt.projector_blackout_projectorname)});
				
				/*
				if(opt.projector_blackout_toggle) {
					self.PROJECTOR_BLACKOUT_PROJECTORNAME = opt.projector_blackout_projectorname;
					self.pixera.sendParams(22,'Pixera.Projectors.Projector.getBlackout',
						{'handle':parseInt(opt.projector_blackout_projectorname)});
				}
				else {
					self.pixera.sendParams(0,'Pixera.Projectors.Projector.setBlackout',
						{'handle':parseInt(opt.projector_blackout_projectorname),
							'isActive':projector_blackout_state});
				}
				*/
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
					{'handle':parseInt(opt.timeline_scrubcurrenttime_timelinename),
						'frames':parseInt(opt.timeline_scrubcurrenttime_frames)});
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
					choices:[
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
					for(let i = 0; i <self.CHOICES_TIMELINEFEEDBACK.length; i++) {
						if(self.CHOICES_TIMELINEFEEDBACK[i]['handle'] == opt.timeline_create_cue_timelinename){
							fps = self.CHOICES_TIMELINEFEEDBACK[i]['fps'];
							break;
						}
					}

					let time = (((hour * 60) * 60) * parseInt(fps)) + ((min * 60) * parseInt(fps)) + (sec * parseInt(fps)) + frame;
					self.pixera.sendParams(0,'Pixera.Timelines.Timeline.createCue',
						{'handle':parseInt(opt.timeline_create_cue_timelinename),
							'name':opt.timeline_create_cue_cuename,
							'timeInFrames':time,
							'operation':parseInt(opt.timeline_create_cue_cueoperation)});
				}
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
					type: 'textinput',
					label: 'Layer Path',
					id: 'layer_mute_extended_path',
					default: 'Timeline 1.Layer 1',
				},
				{
					type: 'dropdown',
					label: 'Parameter',
					id: 'layer_mute_extended_parameter',
					default: 1,
					choices:[
						{label: 'Mute Layer', id: 1},
						{label: 'Mute Volume', id: 2},
					]
				},
				{
					type: 'checkbox',
					label: 'Make Toggle',
					id: 'layer_mute_extended_toggle',
					default: true,
				},
				{
					type: 'checkbox',
					label: 'Mute',
					id: 'layer_mute_extended_state',
					isVisible: (options) => options.layer_mute_extended_toggle == 0,
					default: true,
				}
			],
			callback: async (event) => {
				let opt = event.options;

				if(opt.layer_mute_extended_toggle) {
					if(opt.layer_mute_extended_parameter == 1) {
						self.pixera.sendParams(44,'Pixera.Timelines.Layer.getInst',
							{'instancePath': opt.layer_mute_extended_path});
					}
					else if(opt.layer_mute_extended_parameter == 'muteVolume') {
						self.pixera.sendParams(45,'Pixera.Timelines.Layer.getInst',
							{'instancePath': opt.layer_mute_extended_path});
					}	
				}
				else {
					if(opt.layer_mute_extended_parameter === 1) {
						if(opt.layer_mute_extended_state === true) {
							self.pixera.sendParams(39,'Pixera.Timelines.Layer.getInst',
								{'instancePath': opt.layer_mute_extended_path});
						}
						else {
							self.pixera.sendParams(40,'Pixera.Timelines.Layer.getInst',
								{'instancePath': opt.layer_mute_extended_path});
						}
					}
					else
					{
						if(opt.layer_mute_extended_state === true) {
							self.pixera.sendParams(41,'Pixera.Timelines.Layer.getInst',
								{'instancePath': opt.layer_mute_extended_path});
						}
						else {
							self.pixera.sendParams(42,'Pixera.Timelines.Layer.getInst',
								{'instancePath': opt.layer_mute_extended_path});
						}
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

		//Updated 10/30/2023 by Cody Luketic
		actions.session_project = {
			name: 'Session Project',
			options: [
				{
					type: 'dropdown',
					label: 'Action',
					id: 'session_project_action',
					default: 1,
					choices:[
						{label: 'Save', id: 1},
						{label: 'Save As', id: 2},
						{label: 'Load', id: 3},
						{label: 'Close', id: 4}
					]
				},
				{
					type: 'textinput',
					label: 'Project Path',
					id: 'session_project_projectpath',
					isVisible: (options) => options.session_project_action == 2 || options.session_project_action == 3,
					default: 'C:\\Dump',
				},
				{
					type: 'checkbox',
					label: 'Save Project',
					id: 'session_project_saveproject',
					isVisible: (options) => options.session_project_action == 4,
					default: true,
				}
			],
			callback: async (event) => {
				let opt = event.options;

				switch (opt.session_project_action) {
					case 1:
						self.pixera.send(0,'Pixera.Session.saveProject');
						break;
					case 2:
						self.pixera.sendParams(0,'Pixera.Session.saveProjectAs',
							{'path':opt.session_project_projectpath});
						break;
					case 3:
						self.pixera.sendParams(0,'Pixera.Session.loadProject',
							{'path':opt.session_project_projectpath});
						break;
					case 4:
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
					type: 'checkbox',
					label: 'All Live Systems',
					id: 'session_livesystem_all',
					default: false,
				},
				{
					type: 'textinput',
					label: 'IP',
					id: 'session_livesystem_ip',
					isVisible: (options) => options.session_livesystem_all == 0,
					default: '127.0.0.1',
				},
				{
					type: 'dropdown',
					label: 'Action',
					id: 'session_livesystem_action',
					default: 0,
					choices:[
						{label: 'Start', id: 1},
						{label: 'Stop', id: 2},
						{label: 'Restart', id: 3}
					]
				}
			],
			callback: async (event) => {
				let opt = event.options;

				if(opt.session_livesystem_all) {
					switch (opt.session_livesystem_action) {
						case 1:
							self.pixera.send(0,'Pixera.Session.startLiveSystems');
							break;
						case 2:
							self.pixera.send(0,'Pixera.Session.stopLiveSystems');
							break;
						case 3:
							self.pixera.send(0,'Pixera.Session.restartLiveSystems');
							break;
						default:
							break;
					}
				}
				else {
					switch (opt.session_livesystem_action) {
						case 1:
							self.pixera.sendParams(0,'Pixera.Session.startLiveSystem',
								{'ip':opt.session_livesystem_ip});
							break;
						case 2:
							self.pixera.sendParams(0,'Pixera.Session.stopLiveSystem',
								{'ip':opt.session_livesystem_ip});
							break;
						case 3:
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

		//Created 10/27/2023 by Cody Luketic
		actions.livesystems_engine = {
			name: 'Live Systems Engine',
			options: [
				{
					type: 'checkbox',
					label: 'All Live Systems',
					id: 'livesystems_engine_all',
					default: false,
				},
				{
					type: 'dropdown',
					label: 'Live System',
					id: 'livesystems_engine_livesystem',
					default: 0,
					isVisible: (options) => options.livesystems_engine_all == 0,
					choices: self.CHOICES_LIVESYSTEMNAME
				},
				{
					type: 'checkbox',
					label: 'Exclude Local',
					id: 'livesystems_engine_local',
					isVisible: (options) => options.livesystems_engine_all == 1,
					default: true,
				},
				{
					type: 'dropdown',
					label: 'Action',
					id: 'livesystems_engine_action',
					default: 0,
					choices:[
						{label: 'Start', id: 1},
						{label: 'Close', id: 2},
						{label: 'Restart', id: 3},
						{label: 'Reset', id: 4},
						{label: 'Wake Up', id: 5}
					]
				}
			],
			callback: async (event) => {
				let opt = event.options;
				let id = opt.livesystems_engine_action;

				if(opt.livesystems_engine_all) {
					for (let i = 0; i < self.CHOICES_LIVESYSTEMNAME.length; i++) {
						let handle = self.CHOICES_LIVESYSTEMNAME[i].id;
						if(!opt.livesystems_engine_local) {
							switch (id) {
								case 1:
									self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.startEngine',
										{'handle':parseInt(handle)});
									break;
								case 2:
									self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.closeEngine',
										{'handle':parseInt(handle)});
									break;
								case 3:
									self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.restartEngine',
										{'handle':parseInt(handle)});
									break;
								case 4:
									self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.resetEngine',
										{'handle':parseInt(handle)});
									break;
								case 5:
									self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.wakeUp',
										{'handle':parseInt(handle)});
									break;
								default:
									break;
							}
						}
						else if(self.CHOICES_LIVESYSTEMNAME[i].label != 'Local') {
							switch (id) {
								case 1:
									self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.startEngine',
										{'handle':parseInt(handle)});
									break;
								case 2:
									self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.closeEngine',
										{'handle':parseInt(handle)});
									break;
								case 3:
									self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.restartEngine',
										{'handle':parseInt(handle)});
									break;
								case 4:
									self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.resetEngine',
										{'handle':parseInt(handle)});
									break;
								case 5:
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
						case 1:
							self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.startEngine',
								{'handle':parseInt(opt.livesystems_engine_livesystem)});
							break;
						case 2:
							self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.closeEngine',
								{'handle':parseInt(opt.livesystems_engine_livesystem)});
							break;
						case 3:
							self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.restartEngine',
								{'handle':parseInt(opt.livesystems_engine_livesystem)});
							break;
						case 4:
							self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.resetEngine',
								{'handle':parseInt(opt.livesystems_engine_livesystem)});
							break;
						case 5:
							self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.wakeUp',
								{'handle':parseInt(opt.livesystems_engine_livesystem)});
							break;
						default:
							break;
					}
				}
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
					default: 'C:\\Dump',
				}
			],
			callback: async (event) => {
				let opt = event.options;

				self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.exportMappings',
					{'handle':parseInt(opt.livesystems_exportMappings_livesystem),'path':opt.livesystems_exportMappings_exportpath});
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
					label: 'Channels',
					id: 'livesystems_setaudiomaster_volume_channels',
					default: '1,2',
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

				let channels = opt.livesystems_setaudiomaster_volume_channels.split(',')
				for (let i = 0; i < channels.length; i++) {
					self.pixera.sendParams(0,'Pixera.LiveSystems.LiveSystem.setAudioMasterVolume',
					{'handle':parseInt(opt.livesystems_setaudiomaster_volume_livesystem),
						'channel':parseInt(channels[i]),
						'volume':parseFloat(opt.livesystems_setaudiomaster_volume_value)});
					
				}
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
					label: 'Make Toggle',
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