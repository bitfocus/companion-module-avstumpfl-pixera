const { InstanceBase, InstanceStatus, runEntrypoint, TCPHelper } = require('@companion-module/base')

const Pixera = require('./src/Pixera')
const config = require('./src/config')
const actions = require('./src/actions')
const feedbacks = require('./src/feedbacks')
const presets = require('./src/presets')

class PixeraInstance extends InstanceBase {
		constructor(internal) {
			super(internal)
			let self = this

			Object.assign(self,{
				...config,
				...actions,
				...feedbacks,
				...presets,
			})
		}

	framesToHmsf(time, fps) {
		fps = parseFloat(fps);
		time = parseFloat(time);
		if (!fps || isNaN(time)) {
			return '--:--:--:--';
		}
		let hours = Math.floor(time / (60 * (60 * fps)));
		let minutes = Math.floor(time / (60 * fps) - hours * 60);
		let seconds = Math.floor(((time / (60 * fps)) * 60) - (((hours * 60) * 60) + (minutes * 60)));
		let frames = Math.floor(time - ((((hours * 60) * 60) * fps) + ((minutes * 60) * fps) + (seconds * fps)));
		let pad = function (value) {
			return (value < 10 ? '0' : '') + value;
		};
		return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds) + ':' + pad(frames);
	}

	workspaceLabel(mode) {
		if (mode == 1) return 'Screens';
		if (mode == 2) return 'Mapping';
		if (mode == 3) return 'Outer compositing';
		if (mode == 4) return 'Inner compositing';
		if (mode == 5) return 'Settings';
		if (mode == 6) return 'Mapping feed';
		if (mode == 7) return 'Control';
		return '';
	}

	countdownKind(flag) {
		if (flag == 1) return 'to cue';
		if (flag == 2) return 'cue wait';
		return '';
	}

	// rebuild variable list when timelines appear, without doing it on every poll
	syncTimelineVariables() {
		let self = this;
		let defs = [
			{ variableId: 'active_timeline', name: 'Active timeline' },
			{ variableId: 'running_time', name: 'Running time' },
			{ variableId: 'time_to_next_cue', name: 'Time to next cue' },
			{ variableId: 'transport', name: 'Transport' },
			{ variableId: 'fps', name: 'FPS' },
			{ variableId: 'countdown_kind', name: 'Countdown' },
			{ variableId: 'next_cue', name: 'Next cue' },
			{ variableId: 'prev_cue', name: 'Previous cue' },
			{ variableId: 'workspace', name: 'Workspace' },
			{ variableId: 'preview_edit', name: 'Edit mode' },
		];
		let used = {};
		let timelines = self.CHOICES_TIMELINEFEEDBACK || [];
		for (let i = 0; i < timelines.length; i++) {
			let tl = timelines[i];
			if (!tl.name || tl.name == '0') continue;
			let key = String(tl.name)
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '_')
				.replace(/^_|_$/g, '');
			if (!key) key = 'timeline';
			if (used[key]) key = key + '_' + String(tl.handle).slice(-4);
			used[key] = true;
			tl.varKey = key;
			defs.push({ variableId: 'tl_' + key + '_time', name: tl.name + ' running time' });
			defs.push({ variableId: 'tl_' + key + '_countdown', name: tl.name + ' time to next cue' });
			defs.push({ variableId: 'tl_' + key + '_transport', name: tl.name + ' transport' });
			defs.push({ variableId: 'tl_' + key + '_fps', name: tl.name + ' fps' });
			defs.push({ variableId: 'tl_' + key + '_countdown_kind', name: tl.name + ' countdown' });
			defs.push({ variableId: 'tl_' + key + '_next_cue', name: tl.name + ' next cue' });
			defs.push({ variableId: 'tl_' + key + '_prev_cue', name: tl.name + ' previous cue' });
		}
		let sig = defs
			.map(function (d) {
				return d.variableId;
			})
			.join('|');
		if (sig == self._varSig) return;
		self._varSig = sig;
		self.setVariableDefinitions(defs);
	}

	async init(config) {
		let self = this;
		//action variables
		self.CHOICES_LIVESYSTEMNAME = [{label: '',id:0}]
		self.CHOICES_LIVESYSTEMHANDLE = '';
		self.LIVESYSTEM_STATE = {};
		self.PIXERA_LINK_UP = false;
		self.CHOICES_OUTPUTNAME = [{label: '',id:0}]
		self.CHOICES_OUTPUTHANDLE = [];
		self.CHOICES_STUDIOCAMERANAME = [{label: '',id:0}];
		self.CHOICES_STUDIOCAMERAHANDLE = [];
		self.CHOICES_PROJECTORNAME = [{label: '',id:0}];
		self.CHOICES_PROJECTORHANDLE = [];
		self.CHOICES_RESOURCENAME = [{label: '',id:0}]
		self.CHOICES_RESOURCEHANDLE = [];
		self.CHOICES_RESOURCEFOLDERNAME = [{label: '',id:0}]
		self.CHOICES_RESOURCEFOLDERHANDLE = [];
		/*
		self.CHOICES_TRANSCODEFOLDERNAME = [{label: '',id:0}]
		*/
		self.CHOICES_TIMELINENAME = [{ label: 'Selected timeline', id: -1 }];
		self.CHOICES_TIMELINEHANDLE = [];
		self.CHOICES_TIMELINEFEEDBACK = [];
		self.CHOICES_SCREENNAME = [{label: '',id:0}];
		self.CHOICES_SCREENHANDLE = [];
		self.CHOICES_CUENAME = [];
		self.CHOICES_CUEHANDLE = [];
		self.CHOICES_FADELIST = [];

		self.INDEX_LIVESYSTEM = 0;
		self.INDEX_STUDIOCAMERA = 0;
		self.INDEX_OUTPUT = 0;
		self.INDEX_RESOURCE = 0;
		self.INDEX_RESOURCEFOLDER = 0;
		self.APP_MODE = 0;
		self.PREVIEW_EDIT = 0;
		self.SELECTEDTIMELINES = [];

		self.setVariableDefinitions([
			{ variableId: 'active_timeline', name: 'Active timeline' },
			{ variableId: 'running_time', name: 'Running time' },
			{ variableId: 'time_to_next_cue', name: 'Time to next cue' },
			{ variableId: 'transport', name: 'Transport' },
			{ variableId: 'fps', name: 'FPS' },
			{ variableId: 'countdown_kind', name: 'Countdown' },
			{ variableId: 'next_cue', name: 'Next cue' },
			{ variableId: 'prev_cue', name: 'Previous cue' },
			{ variableId: 'workspace', name: 'Workspace' },
			{ variableId: 'preview_edit', name: 'Edit mode' },
		]);

		await self.configUpdated(config);
	}

	// actions, feedbacks and presets do not need a live Pixera
	publishDefinitions() {
		let self = this;
		self.updateActions();
		self.initFeedbacks();
		self.initPresets();
	}

	async configUpdated(config) {
		let self = this;
		//self.log('debug', 'update config');
		if(self.pixera){
			self.pixera.destroy();
		}

		self.PIXERA_LINK_UP = false;
		self.LIVESYSTEM_STATE = {};

		if(config){
			self.config = config;
		}
		if(this.config && this.config.host && this.config.port){
			self.pixera = new Pixera(self,self.config);
			self.updateStatus(InstanceStatus.Connecting);
		}
		else{
			self.pixera = {
				send() {},
				sendParams() {
					self.log('warn', 'Pixera is not connected');
				},
				destroy() {},
			};
			self.updateStatus(InstanceStatus.BadConfig,'Missing required values.');
		}
		self.publishDefinitions();
	}
}
runEntrypoint(PixeraInstance, [])
