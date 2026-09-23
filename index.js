import { InstanceBase, InstanceStatus } from '@companion-module/base'

import Pixera from './src/Pixera.js'
import config from './src/config.js'
import actions from './src/actions.js'
import feedbacks from './src/feedbacks.js'

class PixeraInstance extends InstanceBase {
		constructor(internal) {
			super(internal)
			let self = this

			Object.assign(self,{
				...config,
				...actions,
				...feedbacks,
			})
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
		self.CHOICES_TIMELINENAME = [{label: '',id:0}];
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

		await self.configUpdated(config);
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
		if(this.config.host && self.config.port){
			self.pixera = new Pixera(self,self.config);
			// Update the actions
			self.updateActions();
			self.updateStatus(InstanceStatus.Connecting);
		}
		else{
			self.updateStatus(InstanceStatus.BadConfig,'Missing required values.');
		}
	}

	async destroy() {
		let self = this;
		if (self.pixera) {
			self.pixera.destroy();
			delete self.pixera;
		}
	}
}
export default PixeraInstance
