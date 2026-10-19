const { InstanceStatus, TCPHelper } = require('@companion-module/base');
const { debug } = require('console');
const { forEach } = require('lodash');
const { isIP } = require('net');

// how often the watchdog checks the link, and how long without any reply before
// we treat the socket as dead (a killed Pixera can leave the TCP session half-open)
const WATCHDOG_INTERVAL = 2000;
const RX_TIMEOUT = 8000;
// a restarting engine accepts TCP well before it answers, so a socket that has
// never received anything gets a longer grace period than one that went quiet
const CONNECT_GRACE = 30000;
const REBUILD_BACKOFF_MAX = 60000;
const DISCOVERY_RETRY = 15000;

class Pixera {
	constructor(instance, config) {
		this.instance = instance;
		let self = instance;
		//buffer for receive stream
		if (isIP(config.host) !== 4) {
			self.log('error', config.host + ' is not a valid IP');
			return;
		}
		this.config = config;
		this.rebuildCount = 0;
		this.nextRebuildAt = 0;
		this.discoveryPending = true;
		this.lastDiscovery = 0;
		this.createSocket();
		this.watchdog = setInterval(this.checkLink.bind(this), WATCHDOG_INTERVAL);
	}
	createSocket() {
		let self = this.instance;
		let config = this.config;
		if (config.host) {
			this.lastRx = Date.now();
			this.everReceived = false;
			this.socket = new TCPHelper(config.host, config.port, {
				reconnect: true,
				reconnect_interval: 2000,
			});
			this.socket.on('status_change', function (status, message) {
				self.updateStatus(status, message);
			});

			this.socket.on('error', function (err) {
				self.log('error', 'Network error: ' + err.message);
				this.markLinkDown('socket error');
			}.bind(this));

			// TCPHelper emits end (not disconnect/close) when the far side closes
			// cleanly; without this the watchdog is the only thing that notices
			this.socket.on('end', function () {
				self.log('debug', 'Close Connection.');
				this.markLinkDown('connection closed');
			}.bind(this));
			this.socket.on('connect', () => {
				this.onConnected();
			});
			let currentLength = 0;
			let splittetMessage = '';
			this.socket.on('data', (chunk) => {
				this.lastRx = Date.now();
				this.everReceived = true;
				this.rebuildCount = 0;
				//const header = 'pxr1';
				const header = [112, 120, 114, 49];
				let messageLength = 0;
				while(chunk.length>0)
				{
					if(currentLength == 0)
					{
						if(chunk[0] !== header[0] || chunk[1] !== header[1] || chunk[2] !== header[2] || chunk[3] !== header[3])
						{
							//console.log('debug','-------------------------------')
							//console.log('debug', 'header was not correct');
							//console.log('debug', chunk.toString('utf8'));
							splittetMessage = '';
							break;
						}
						messageLength = chunk[4] + (chunk[5]<<8) + (chunk[6]<<16) + (chunk[7]<<24);
						//console.log('debug',chunk[4],chunk[5],chunk[6],chunk[7])
						if(messageLength<=(chunk.length-8))
						{
							splittetMessage += chunk.subarray(0,messageLength+8);
						}
						else
						{
							//break loop and wait for next chunk to combine
							splittetMessage += chunk.subarray(0,chunk.length);
							currentLength += messageLength+8-chunk.length;
							break;
						}
						//console.log('debug',messageLength + " - Size MSG " + (chunk.length));
						//console.log(splittetMessage.toString('utf8'));
						if(splittetMessage.length+1 === chunk.length)
						{
							chunk = [];
						}
						else
							chunk = chunk.subarray(messageLength+8,chunk.length);
						//console.log('debug',chunk.length);
					}
					else
					{
						//console.log('debug', 'combine splitted message');
						if(currentLength<=chunk.length)
						{
							splittetMessage += chunk.subarray(0,currentLength);
							chunk = chunk.subarray(currentLength,chunk.length);
							currentLength = 0;
							//console.log('debug',splittetMessage);
						}
						else
						{
							console.log('debug','---------');
							console.log('error','error split second time');
						}

					}
					let splitChunk = splittetMessage.substring(8,splittetMessage.length).toString('utf8');
					this.processReceivedData(splitChunk);
					splittetMessage = '';
					
			}
			});
		}
	}
	destroy() {
		let self = this.instance;
		clearInterval(self.retry_interval);
		clearInterval(self.getSelectedTimelines);
		clearInterval(this.watchdog);
		if (this.socket) {
			this.socket.destroy();
			delete this.socket;
		}
	}
	onConnected() {
		let self = this.instance;
		let config = this.config;
		self.log('info', 'Pixera Connected');
		// guard against a connect without an intervening close leaving orphaned timers
		clearInterval(self.retry_interval);
		clearInterval(self.getSelectedTimelines);
		self.PIXERA_LINK_UP = true;
		this.lastRx = Date.now();
		self.updateStatus(InstanceStatus.Ok);
		//use version to filter commands
		this.send(1, 'Pixera.Utility.getApiRevision');
		//send message to get reply
		this.sendParams(99, 'Pixera.Utility.setShowContextInReplies', {
			doShow: true,
		});
		self.initFeedbacks();
		self.initPresets();
		this.send(75, 'Pixera.Ui.getAppMode');
		this.runDiscovery();
		if (self.config.polling) {
			self.retry_interval = setInterval(
				this.retry.bind(this),
				this.pollInterval()
			);
			this.retry();
		} else {
			// one call a second keeps "selected timeline" usable without the old 100ms loop
			self.getSelectedTimelines = setInterval(this.tickSelected.bind(this), 1000);
			this.tickSelected();
		}
	}
	markLinkDown(reason) {
		let self = this.instance;
		clearInterval(self.retry_interval);
		clearInterval(self.getSelectedTimelines);
		if (self.PIXERA_LINK_UP === false) {
			return;
		}
		self.PIXERA_LINK_UP = false;
		// drop cached engine state so feedbacks can't keep reporting a dead system as connected
		self.LIVESYSTEM_STATE = {};
		self.updateStatus(InstanceStatus.Disconnected, reason);
		self.checkFeedbacks('livesystem_state');
	}
	runDiscovery() {
		this.discoveryPending = true;
		this.lastDiscovery = Date.now();
		this.initVariables();
		this.initLiveSystems();
		this.initOutputs();
		this.initStudioCameras();
		this.initProjectors();
		//don't get resources because it take to long
		//this.initResources();
		this.initResourceFolders();
		/*this.initTranscodingFolders();*/
		this.initTimelines();
		this.initScreens();
	}
	checkLink() {
		let self = this.instance;
		if (!this.socket || !this.socket.isConnected) {
			this.markLinkDown('not connected');
			return;
		}
		let now = Date.now();
		let timeout = this.everReceived ? RX_TIMEOUT : CONNECT_GRACE;
		if (now - this.lastRx > timeout && now >= this.nextRebuildAt) {
			this.rebuildCount += 1;
			this.nextRebuildAt =
				now +
				Math.min(
					REBUILD_BACKOFF_MAX,
					WATCHDOG_INTERVAL * Math.pow(2, this.rebuildCount)
				);
			self.log(
				'error',
				'No reply from Pixera for ' + timeout + 'ms, rebuilding connection'
			);
			this.markLinkDown('no reply from Pixera');
			this.rebuildSocket();
			return;
		}
		// keeps traffic flowing so lastRx stays meaningful even when polling is off
		this.send(1, 'Pixera.Utility.getApiRevision');
		// discovery runs on connect, which can land before the engine is ready to
		// answer; without this the dropdowns stay empty until a manual reconnect
		if (this.discoveryPending && now - this.lastDiscovery > DISCOVERY_RETRY) {
			self.log('info', 'No live systems yet, retrying discovery');
			this.runDiscovery();
		}
	}
	rebuildSocket() {
		if (this.socket) {
			this.socket.destroy();
			delete this.socket;
		}
		this.createSocket();
	}
	generateCommand(id, method, params) {
		let self = this.instance;
		if (id == undefined || !method) {
			self.log('error', 'missing method or id in generate');
			return;
		}
		let command = {
			jsonrpc: '2.0',
			id: id,
			method: method,
		};
		if (params) {
			command.params = params;
		}
		return command;
	}
	send(id, method) {
		if (id == undefined || !method) {
			self.log('error', 'missing id,method or param in send');
			return;
		}
		this.sendParams(id, method, null);
	}
	sendParams(id, method, params) {
		let self = this.instance;
		if (id == undefined || !method) {
			self.log('error', 'missing id,method or param in sendParams');
			self.log('debug', id + ' - ' + method + ' - ' + params);
			return;
		}
		let msg = this.generateCommand(id, method, params);
		let sendBuffer = this.prependHeader(JSON.stringify(msg));
		if (sendBuffer) {
			this.sendBuffer(sendBuffer);
		}
	}
	prependHeader(body) {
		let self = this;
		var result = [];

		for (let i = 0; i < body.length; i++) {
			let hex = body.charCodeAt(i).toString(16);
			result = result.concat(this.roughScale(hex, 16));
		}

		var preHeader = [112, 120, 114, 49, body.length, 0, 0, 0];
		const buf = Buffer.from(preHeader.concat(result));
		return buf;
	}
	roughScale(x, base) {
		var parsed = parseInt(x, base);
		if (isNaN(parsed)) {
			return 0;
		}
		return parsed;
	}
	sendBuffer(cmd) {
		let self = this.instance;
		//enable this for debugging to see send out commands
		//self.log('debug', cmd.toString('utf8'));
		if (this.socket && this.socket.isConnected) {
			this.socket.send(cmd);
		} else {
			self.log('error', 'Pixera not connected. Can not send command');
		}
	}
	pool() {
		let self = this.instance;
		this.send(10000, 'Pixera.Utility.pollMonitoring');
	}
	pollInterval() {
		let rate = parseInt(this.config.polling_rate, 10);
		if (rate !== 50 && rate !== 100 && rate !== 200 && rate !== 500 && rate !== 1000 && rate !== 2000) {
			return 200;
		}
		return rate;
	}
	getSelectedTimeline() {
		let self = this.instance;
		this.send(10001, 'Pixera.Timelines.getTimelinesSelected');
	}
	transportLabel(mode) {
		if (mode == 1) return 'Play';
		if (mode == 2) return 'Pause';
		if (mode == 3) return 'Stop';
		return '';
	}
	// running time and countdown for whichever timeline is selected in Pixera
	publishActiveTimeline() {
		let self = this.instance;
		if (self.syncTimelineVariables) self.syncTimelineVariables();
		let values = {};
		let selected = null;
		let names = [];
		let timelines = self.CHOICES_TIMELINEFEEDBACK || [];
		let picked = self.SELECTEDTIMELINES || [];
		for (let i = 0; i < timelines.length; i++) {
			let tl = timelines[i];
			if (tl.varKey && tl.name && tl.name != '0') {
				let key = 'tl_' + tl.varKey;
				values[key + '_time'] = self.framesToHmsf(tl.timelinePositions, tl.fps);
				values[key + '_countdown'] = self.framesToHmsf(tl.timelineCountdowns, tl.fps);
				values[key + '_transport'] = this.transportLabel(tl.timelineTransport);
				values[key + '_fps'] = tl.fps ? String(tl.fps) : '';
				values[key + '_countdown_kind'] = self.countdownKind(tl.countdownFlag);
				values[key + '_next_cue'] = tl.nextCueName || '';
				values[key + '_prev_cue'] = tl.prevCueName || '';
			}
			for (let s = 0; s < picked.length; s++) {
				if (tl.handle == picked[s]) {
					names.push(tl.name);
					if (!selected) selected = tl;
				}
			}
		}
		if (!selected) {
			values.active_timeline = '';
			values.running_time = '';
			values.time_to_next_cue = '';
			values.transport = '';
			values.fps = '';
			values.countdown_kind = '';
			values.next_cue = '';
			values.prev_cue = '';
		} else {
			values.active_timeline = names.join(', ');
			values.running_time = self.framesToHmsf(selected.timelinePositions, selected.fps);
			values.time_to_next_cue = self.framesToHmsf(selected.timelineCountdowns, selected.fps);
			values.transport = this.transportLabel(selected.timelineTransport);
			values.fps = selected.fps ? String(selected.fps) : '';
			values.countdown_kind = self.countdownKind(selected.countdownFlag);
			values.next_cue = selected.nextCueName || '';
			values.prev_cue = selected.prevCueName || '';
		}
		self.setVariableValues(values);
	}
	// selectedOnly: just the timeline selected in Pixera. Otherwise also one other, rotating.
	askCueAround(selectedOnly) {
		let self = this.instance;
		let handles = [];
		let picked = self.SELECTEDTIMELINES || [];
		if (picked.length) handles.push(picked[0]);
		if (!selectedOnly) {
			let extras = [];
			let timelines = self.CHOICES_TIMELINEFEEDBACK || [];
			for (let i = 0; i < timelines.length; i++) {
				let h = timelines[i].handle;
				if (h == -1 || !timelines[i].name || timelines[i].name == '0') continue;
				if (handles.indexOf(h) >= 0) continue;
				extras.push(h);
			}
			if (extras.length) {
				if (this.cuePoll == undefined) this.cuePoll = 0;
				handles.push(extras[this.cuePoll % extras.length]);
				this.cuePoll++;
			}
		}
		for (let i = 0; i < handles.length; i++) {
			this.sendParams(125, 'Pixera.Timelines.Timeline.getCueNext', { handle: handles[i] });
			this.sendParams(126, 'Pixera.Timelines.Timeline.getCuePrevious', { handle: handles[i] });
		}
	}
	rememberCueName(timeline, cue, which) {
		let self = this.instance;
		if (!cue) {
			this.writeCueName(timeline, which, '');
			return;
		}
		if (!self.CUE_NAME_FOR) self.CUE_NAME_FOR = {};
		if (!self.CUE_NAME_FOR[cue]) self.CUE_NAME_FOR[cue] = [];
		self.CUE_NAME_FOR[cue].push({ timeline: timeline, which: which });
		this.sendParams(127, 'Pixera.Timelines.Cue.getName', { handle: cue });
	}
	writeCueName(timeline, which, name) {
		let self = this.instance;
		let timelines = self.CHOICES_TIMELINEFEEDBACK || [];
		for (let i = 0; i < timelines.length; i++) {
			if (timelines[i].handle != timeline) continue;
			if (which == 'next') timelines[i].nextCueName = name || '';
			else timelines[i].prevCueName = name || '';
		}
		self.checkFeedbacks('next_cue');
		self.checkFeedbacks('prev_cue');
		this.publishActiveTimeline();
	}
	tickSelected() {
		this.getSelectedTimeline();
		this.askCueAround(true);
	}
	retry() {
		let self = this.instance;
		this.pool();
		this.getSelectedTimeline();
		this.send(75, 'Pixera.Ui.getAppMode');
		if (self.SELECTEDTIMELINES && self.SELECTEDTIMELINES.length) {
			this.sendParams(98, 'Pixera.Timelines.Timeline.getPreviewEditTransportMode', {
				handle: self.SELECTEDTIMELINES[0],
			});
		}
		this.askCueAround(false);
		let systems = self.CHOICES_LIVESYSTEMHANDLE;
		if (systems && systems.length && typeof systems != 'string') {
			for (let i = 0; i < systems.length; i++) {
				this.sendParams(61, 'Pixera.LiveSystems.LiveSystem.getState', {
					handle: systems[i],
				});
			}
		}
	}
	initLiveSystems() {
		let self = this.instance;
		this.send(15, 'Pixera.LiveSystems.getLiveSystems');
	}
	initOutputs() {
		let self = this.instance;
		this.send(21, 'Pixera.LiveSystems.getLiveSystems');
	}
	initStudioCameras() {
		let self = this.instance;
		this.send(17, 'Pixera.Screens.getStudioCameras');
	}
	initProjectors() {
		let self = this.instance;
		this.send(19, 'Pixera.Projectors.getProjectors');
		this.send(20, 'Pixera.Projectors.getProjectorNames');
	}
	initResources() {
		let self = this.instance;
		this.send(35, 'Pixera.Resources.getResources');
	}
	initResourceFolders() {
		let self = this.instance;
		this.send(48, 'Pixera.Resources.getResourceFolders');
	} /*
  initTranscodingFolders(){
    let self = this.instance;
		this.send(51,'Pixera.Resources.getTranscodingFolders');
  }*/
	initTimelines() {
		let self = this.instance;
		this.send(11, 'Pixera.Timelines.getTimelines');
	}
	initVariables() {
		let self = this.instance;

		self.CHOICES_LIVESYSTEMNAME = [{ label: '', id: 0 }];
		self.CHOICES_LIVESYSTEMHANDLE = '';
		self.LIVESYSTEM_STATE = {};
		self.CHOICES_OUTPUTNAME = [{ label: '', id: 0 }];
		self.CHOICES_OUTPUTHANDLE = [];
		self.CHOICES_STUDIOCAMERANAME = [{ label: '', id: 0 }];
		self.CHOICES_STUDIOCAMERAHANDLE = [];
		self.CHOICES_PROJECTORNAME = [{ label: '', id: 0 }];
		self.CHOICES_PROJECTORHANDLE = [];
		self.CHOICES_RESOURCENAME = [{ label: '', id: 0 }];
		self.CHOICES_RESOURCEHANDLE = [];
		self.CHOICES_RESOURCEFOLDERNAME = [{ label: '', id: 0 }];
		self.CHOICES_RESOURCEFOLDERHANDLE = [];
		/*
    self.CHOICES_TRANSCODEFOLDERNAME = [{label: '',id:0}]
    */
		self.CHOICES_TIMELINENAME = [{ label: '', id: 0 }];
		self.CHOICES_TIMELINEHANDLE = [];
		self.CHOICES_TIMELINEFEEDBACK = [];
		self.CHOICES_SCREENNAME = [{ label: '', id: 0 }];
		self.CHOICES_SCREENHANDLE = [];
		self.CHOICES_CUENAME = [];
		self.CHOICES_CUEHANDLE = [];
		self.CHOICES_FADELIST = [];
		self.SELECTEDTIMELINES = [];

		self.INDEX_LIVESYSTEM = 0;
		self.INDEX_STUDIOCAMERA = 0;
		self.INDEX_OUTPUT = 0;
		self.INDEX_RESOURCE = 0;
		self.INDEX_RESOURCEFOLDER = 0;
	}
	initScreens() {
		let self = this.instance;
		this.send(13, 'Pixera.Screens.getScreens');
		this.send(14, 'Pixera.Screens.getScreenNames');
	}
	processReceivedData(data) {
		let self = this.instance;
		try {
			let jsonData = JSON.parse(data);
			if (jsonData.id == undefined) {
				self.log('debug', 'id is missing in rec data: ' + data);
				return;
			}
			switch (jsonData.id) {
				case 0: //none
					break;

				case 1: //set version
					{
						let result = jsonData.result;
						self.VERSION = result;
					}
					break;

				case 11: //get timeline list
					{
						let result = jsonData.result;
						self.CHOICES_CUENAME = [];
						self._cueSig = {};
						let hasSelected = false;
						for (let n = 0; n < self.CHOICES_TIMELINENAME.length; n++) {
							if (self.CHOICES_TIMELINENAME[n].id == -1) hasSelected = true;
						}
						if (!hasSelected) {
							self.CHOICES_TIMELINENAME.unshift({
								label: 'Selected timeline',
								id: -1,
							});
						}
						self.CHOICES_TIMELINEHANDLE = result;
						self.CHOICES_TIMELINEHANDLE.push(-1);
						for (let i = 0; i < result.length; i++) {
							//set feedback timeline array
							self.CHOICES_TIMELINEFEEDBACK.push({
								handle: result[i],
								timelineTransport: '0',
								timelinePositions: '0',
								timelineCountdowns: '0',
								name: '0',
								fps: '0',
							}); //set timeline variable for feedback
							//get attributes for each timeline
							this.sendParams(12, 'Pixera.Timelines.Timeline.getAttributes', {
								handle: result[i],
							});
						}
						self.updateActions();
					}
					break;
				case 12: //get timeline attributes
					{
						//self.log('debug', 'timeline infos: ' + data);

						let result = jsonData.result;
						let context = jsonData.context;
						let handle = context['handle'];
						for (var i = 0; i < self.CHOICES_TIMELINEHANDLE.length; i++) {
							if (self.CHOICES_TIMELINEHANDLE[i] == handle) {
								if (handle == -1) {
									self.CHOICES_TIMELINENAME.push({
										label: 'Selected Timeline',
										id: self.CHOICES_TIMELINEHANDLE[i],
									}); //set timeline name for dropdown menu
								}
								self.CHOICES_TIMELINENAME.push({
									label: result['name'],
									id: self.CHOICES_TIMELINEHANDLE[i],
								}); //set timeline name for dropdown menu
								break;
							}
						}
						for (var k = 0; k < self.CHOICES_TIMELINEFEEDBACK.length; k++) {
							if (self.CHOICES_TIMELINEFEEDBACK[k]['handle'] == handle) {
								self.CHOICES_TIMELINEFEEDBACK[k]['name'] = result['name']; //set timeline name for feedback
								self.CHOICES_TIMELINEFEEDBACK[k]['fps'] = result['fps']; //set timeline fps for feedback
							}
						}
						if (handle != -1) {
							this.sendParams(124, 'Pixera.Timelines.Timeline.getCueNames', {
								handle: handle,
							});
						}
						self.updateActions();
					}
					break;
				case 13: //Pixera.Screens.getScreens
					{
						let result = jsonData.result;
						if (result != null) {
							self.CHOICES_SCREENHANDLE = result;
						}
						self.updateActions();
					}
					break;
				case 14: //Pixera.Screens.getScreenNames
					{
						let result = jsonData.result;
						if (result != null) {
							for (var i = 0; i < result.length; i++) {
								self.CHOICES_SCREENNAME.push({
									label: result[i],
									id: self.CHOICES_SCREENHANDLE[i],
								});
							}
						}
						self.updateActions();
					}
					break;
				case 15: //Pixera.LiveSystems.getLiveSystems
					{
						let result = jsonData.result;
						self.INDEX_LIVESYSTEM = 0;
						if (result != null) {
							if (result.length > 0) {
								this.discoveryPending = false;
							}
							self.CHOICES_LIVESYSTEMHANDLE = result;
							for (let i = 0; i < result.length; i++) {
								this.sendParams(16, 'Pixera.LiveSystems.LiveSystem.getName', {
									handle: result[i],
								});
								this.sendParams(61, 'Pixera.LiveSystems.LiveSystem.getState', {
									handle: result[i],
								});
							}
						}
						self.updateActions();
					}
					break;
				case 16: //Pixera.LiveSystems.LiveSystem.getName
					{
						let result = jsonData.result;
						if (result != null) {
							self.CHOICES_LIVESYSTEMNAME.push({
								label: result,
								id: self.CHOICES_LIVESYSTEMHANDLE[self.INDEX_LIVESYSTEM],
							});
							self.INDEX_LIVESYSTEM += 1;
						}
						self.updateActions();
						// re-register feedbacks so dropdowns in the UI pick up the discovered names
						// (feedback definitions are captured at connect, before live systems are known)
						self.initFeedbacks();
					}
					break;
				case 17: //Pixera.Screens.getStudioCameras
					{
						let result = jsonData.result;
						self.INDEX_STUDIOCAMERA = 0;
						if (result != null) {
							self.CHOICES_STUDIOCAMERAHANDLE = result;
							for (let i = 0; i < result.length; i++) {
								this.sendParams(18, 'Pixera.Screens.StudioCamera.getName', {
									handle: result[i],
								});
							}
						}
						self.updateActions();
					}
					break;
				case 18: //Pixera.Screens.StudioCamera.getName
					{
						let result = jsonData.result;
						if (result != null) {
							self.CHOICES_STUDIOCAMERANAME.push({
								label: result,
								id: self.CHOICES_STUDIOCAMERAHANDLE[self.INDEX_STUDIOCAMERA],
							});
							self.INDEX_STUDIOCAMERA += 1;
						}
						self.updateActions();
					}
					break;
				case 19: //Pixera.Projectors.getProjectors
					{
						let result = jsonData.result;
						if (result != null) {
							self.CHOICES_PROJECTORHANDLE = result;
						}
						self.updateActions();
					}
					break;
				case 20: //Pixera.Projectors.getProjectorNames
					{
						let result = jsonData.result;
						if (result != null) {
							for (var i = 0; i < result.length; i++) {
								self.CHOICES_PROJECTORNAME.push({
									label: result[i],
									id: self.CHOICES_PROJECTORHANDLE[i],
								});
							}
						}
						self.updateActions();
					}
					break;
				case 21: //Pixera.LiveSystems.getLiveSystems
					{
						let result = jsonData.result;
						if (result != null) {
							for (let i = 0; i < result.length; i++) {
								this.sendParams(
									22,
									'Pixera.LiveSystems.LiveSystem.getEnabledOutputs',
									{ handle: result[i] }
								);
							}
						}
						self.updateActions();
					}
					break;
				case 22: //Pixera.LiveSystems.LiveSystem.getEnabledOutputs
					{
						let result = jsonData.result;
						self.INDEX_OUTPUT = 0;
						if (result != null) {
							for (let i = 0; i < result.length; i++) {
								self.CHOICES_OUTPUTHANDLE.push(result[i]);
								this.sendParams(23, 'Pixera.LiveSystems.Output.getName', {
									handle: result[i],
								});
							}
						}
						self.updateActions();
					}
					break;
				case 23: //Pixera.LiveSystems.Output.getName
					{
						let result = jsonData.result;
						if (result != null) {
							self.CHOICES_OUTPUTNAME.push({
								label: result,
								id: self.CHOICES_OUTPUTHANDLE[self.INDEX_OUTPUT],
							});
							self.INDEX_OUTPUT += 1;
						}
						self.updateActions();
					}
					break;
				case 24: //Pixera.LiveSystems.LiveSystem.getAudioMasterMute
					{
						let result = jsonData.result;
						if (result != null) {
							this.sendParams(
								0,
								'Pixera.LiveSystems.LiveSystem.setAudioMasterMute',
								{
									handle: self.LIVESYSTEM_SETAUDIOMASTER_MUTE_LIVESYSTEM,
									channel: self.LIVESYSTEM_SETAUDIOMASTER_MUTE_CHANNEL,
									state: !result,
								}
							);
						}
					}
					break;
				case 25: //Pixera.LiveSystems.Output.getActive
					{
						let result = jsonData.result;
						if (result != null) {
							this.sendParams(0, 'Pixera.LiveSystems.Output.setActive', {
								handle: self.OUTPUT_STATUS_OUTPUT,
								active: !result,
							});
						}
					}
					break;
				case 26: //Pixera.LiveSystems.Output.getIdentify
					{
						let result = jsonData.result;
						if (result != null) {
							this.sendParams(0, 'Pixera.LiveSystems.Output.setIdentify', {
								handle: self.OUTPUT_STATUS_OUTPUT,
								state: !result,
							});
						}
					}
					break;
				case 27: //Pixera.LiveSystems.Output.getIsOutputAggregate
					{
						let result = jsonData.result;
						if (result != null) {
							this.sendParams(
								0,
								'Pixera.LiveSystems.Output.setIsOutputAggregate',
								{ handle: self.OUTPUT_STATUS_OUTPUT, state: !result }
							);
						}
					}
					break;
				case 28: //Pixera.Screens.StudioCamera.getTrackingInputPause
					{
						let result = jsonData.result;
						if (result != null) {
							this.sendParams(
								0,
								'Pixera.Screens.StudioCamera.setTrackingInputPause',
								{
									handle: self.SCREEN_STUDIOCAMERA_TRACKING_STUDIOCAMERA,
									pause: !result,
								}
							);
						}
					}
					break;
				case 29: //Pixera.Screens.StudioCamera.getUsePositionPropertiesFromTracking
					{
						let result = jsonData.result;
						if (result != null) {
							this.sendParams(
								0,
								'Pixera.Screens.StudioCamera.setUsePositionPropertiesFromTracking',
								{
									handle: self.SCREEN_STUDIOCAMERA_TRACKING_STUDIOCAMERA,
									pause: !result,
								}
							);
						}
					}
					break;
				case 30: //Pixera.Screens.StudioCamera.getUseRotationPropertiesFromTracking
					{
						let result = jsonData.result;
						if (result != null) {
							this.sendParams(
								0,
								'Pixera.Screens.StudioCamera.setUseRotationPropertiesFromTracking',
								{
									handle: self.SCREEN_STUDIOCAMERA_TRACKING_STUDIOCAMERA,
									pause: !result,
								}
							);
						}
					}
					break;
				case 31: //Pixera.Projectors.Projector.getBlackout
					{
						let result = jsonData.result;
						if (result != null) {
							this.sendParams(0, 'Pixera.Projectors.Projector.setBlackout', {
								handle: self.PROJECTOR_BLACKOUT_PROJECTOR,
								isActive: !result,
							});
						}
					}
					break;
				case 32: //Pixera.Timelines.Timeline.createLayer
					{
						let result = jsonData.result;
						if (result != null) {
							this.sendParams(0, 'Pixera.Timelines.Layer.setName', {
								handle: result,
								name: self.CREATE_LAYER_NAME,
							});
						}
					}
					break;
				case 33: //Pixera.Timelines.Timeline.CueHandle -> Pixera.Timelines.Cue.blendToThis
					{
						let result = jsonData.result;
						let context = jsonData.context;
						let handleTimeline = context['handle'];
						let fps = 60;
						if (result != null) {
							for (let k = 0; k < self.CHOICES_TIMELINEFEEDBACK.length; k++) {
								if (
									self.CHOICES_TIMELINEFEEDBACK[k]['handle'] ==
										handleTimeline &&
									self.CHOICES_TIMELINEFEEDBACK[k]['fps'] != 0
								) {
									fps = self.CHOICES_TIMELINEFEEDBACK[k]['fps'];
									break;
								}
							}
							let time = self.CHOICES_BLENDNAME_FRAMES / fps;
							/*this.sendParams(0,'Pixera.Timelines.Cue.blendToThis',{'handle':result,'blendDurationInSeconds':time});*/
							this.sendParams(0, 'Pixera.Timelines.Cue.blendToThis', {
								handle: result,
								blendDuration: time,
							});
						}
					}
					break;
				case 34: //Pixera.Timelines.Timeline.getCurrentTime
					{
						let result = jsonData.result;
						if (result != null) {
							let name = self.TIMELINE_CREATE_CUE_NAME;
							let operation = self.TIMELINE_CREATE_CUE_CUEOPERATION;

							this.sendParams(0, 'Pixera.Timelines.Timeline.createCue', {
								handle: jsonData.context.handle,
								name: name,
								timeInFrames: result,
								operation: operation,
							});
						}
					}
					break;
				case 35: //Pixera.Resources.getResources
					{
						let result = jsonData.result;
						self.INDEX_RESOURCE = 0;
						if (result != null) {
							for (let i = 0; i < result.length; i++) {
								self.CHOICES_RESOURCEHANDLE.push(result[i]);
								this.sendParams(36, 'Pixera.Resources.Resource.getName', {
									handle: result[i],
								});
							}
						}
						self.updateActions();
					}
					break;
				case 36: //Pixera.Resources.Resource.getName()
					{
						let result = jsonData.result;
						if (result != null) {
							self.CHOICES_RESOURCENAME.push({
								label: result,
								id: self.CHOICES_RESOURCEHANDLE[self.INDEX_RESOURCE],
							});
							self.INDEX_RESOURCE += 1;
						}
						self.updateActions();
					}
					break;
				case 37: //Pixera.Resources.Resource.getUseGradient
					{
						let result = jsonData.result;
						if (result != null) {
							self.log('warn', 'Result: ' + result);
							this.sendParams(0, 'Pixera.Resources.Resource.setUseGradient', {
								handle: self.RESOURCE_SETTINGS_COLOR_RESOURCE,
								useGradient: !result,
							});
						}
					}
					break;
				case 39: //Pixera.Timelines.Layer.getInst -> Pixera.Timelines.Layer.muteLayer
				case 40: //Pixera.Timelines.Layer.getInst -> Pixera.Timelines.Layer.unMuteLayer
				case 41: //Pixera.Timelines.Layer.getInst -> Pixera.Timelines.Layer.muteAudio
				case 42: //Pixera.Timelines.Layer.getInst -> Pixera.Timelines.Layer.unMuteAudio
					{
						let result = jsonData.result;
						let muteMethod = 'Pixera.Timelines.Layer.muteLayer';
						if (jsonData.id == 40) {
							muteMethod = 'Pixera.Timelines.Layer.unMuteLayer';
						} else if (jsonData.id == 41) {
							muteMethod = 'Pixera.Timelines.Layer.muteAudio';
						} else if (jsonData.id == 42) {
							muteMethod = 'Pixera.Timelines.Layer.unMuteAudio';
						}
						this.sendParams(0, muteMethod, { handle: result });
					}
					break;
				case 43: //Pixera.Timelines.Layer.getInst -> Pixera.Timelines.Layer.resetLayer
					{
						let result = jsonData.result;
						if (result != null) {
							this.sendParams(0, 'Pixera.Timelines.Layer.resetLayer', {
								handle: result,
							});
						}
					}
					break;
				case 44: //Pixera.Timelines.Layer.getInst
				case 45: //Pixera.Timelines.Layer.getInst
					{
						self.MUTE_TOGGLE_LAYER = jsonData.result;
						if (jsonData.id == 45) {
							this.sendParams(47, 'Pixera.Timelines.Layer.getIsAudioMuted', {
								handle: self.MUTE_TOGGLE_LAYER,
							});
						} else {
							this.sendParams(46, 'Pixera.Timelines.Layer.getIsLayerMuted', {
								handle: self.MUTE_TOGGLE_LAYER,
							});
						}
					}
					break;
				case 46: //Pixera.Timelines.Layer.getIsLayerMuted
				case 47: //Pixera.Timelines.Layer.getIsAudioMuted
					{
						let result = jsonData.result;
						if (result == true) {
							if (jsonData.id == 46) {
								this.sendParams(0, 'Pixera.Timelines.Layer.unMuteLayer', {
									handle: self.MUTE_TOGGLE_LAYER,
								});
							} else {
								this.sendParams(0, 'Pixera.Timelines.Layer.unMuteAudio', {
									handle: self.MUTE_TOGGLE_LAYER,
								});
							}
						} else {
							if (jsonData.id == 46) {
								this.sendParams(0, 'Pixera.Timelines.Layer.muteLayer', {
									handle: self.MUTE_TOGGLE_LAYER,
								});
							} else {
								this.sendParams(0, 'Pixera.Timelines.Layer.muteAudio', {
									handle: self.MUTE_TOGGLE_LAYER,
								});
							}
						}
					}
					break;
				case 48: //Pixera.Resources.getResourceFolders
					{
						let result = jsonData.result;
						self.INDEX_RESOURCEFOLDER = 0;
						if (result != null) {
							for (let i = 0; i < result.length; i++) {
								this.sendParams(
									49,
									'Pixera.Resources.ResourceFolder.getResourceFolders',
									{ handle: result[i] }
								);
							}
						}
						self.updateActions();
					}
					break;
				case 49: //Pixera.Resources.ResourceFolder.getResourceFolders
					{
						let result = jsonData.result;
						self.INDEX_RESOURCEFOLDER = 0;
						if (result != null) {
							for (let i = 0; i < result.length; i++) {
								self.CHOICES_RESOURCEFOLDERHANDLE.push(result[i]);
								this.sendParams(50, 'Pixera.Resources.ResourceFolder.getName', {
									handle: result[i],
								});
							}
						}
						self.updateActions();
					}
					break;
				case 50: //Pixera.Resources.ResourceFolder.getName()
					{
						let result = jsonData.result;
						if (result != null) {
							self.CHOICES_RESOURCEFOLDERNAME.push({
								label: result,
								id: self.CHOICES_RESOURCEFOLDERHANDLE[
									self.INDEX_RESOURCEFOLDER
								],
							});
							self.INDEX_RESOURCEFOLDER += 1;
						}
						self.updateActions();
					}
					break;
					//---------resources start ----------
				case 51:
					this.sendParams(0, 'Pixera.Resources.Resource.removeThis', {
						handle: parseInt(jsonData.result),
					});
					break;
				case 52:
					this.sendParams(
						0,
						'Pixera.Resources.Resource.removeThisIncludingAssets',
						{ handle: parseInt(jsonData.result) }
					);
					break;
				case 53:
					this.sendParams(
						0,
						'Pixera.Resources.Resource.deleteFilesOnSystems',
						{ handle: parseInt(jsonData.result) }
					);
					break;
				case 54:
					this.sendParams(
						0,
						'Pixera.Resources.Resource.deleteAssetFromLiveSystem',
						{
							handle: parseInt(jsonData.result),
							apEntityLiveSystemHandle: self.RESOURCEREMOVE_LIVESYSTEM,
						}
					);
					break;
				case 55:
					this.sendParams(0, 'Pixera.Resources.Resource.replace', {
						handle: parseInt(jsonData.result),
						path: self.RESOURCE_REPLACE,
					});
					break;
				case 56:
					this.sendParams(0, 'Pixera.Resources.Resource.refresh', {
						handle: parseInt(jsonData.result),
						text: '',
					});
					break;
				case 58:
					this.sendParams(
						0,
						'Pixera.Resources.Resource.resetDistributionTargets',
						{ handle: parseInt(jsonData.result) }
					);
					break;
				case 59:
					this.sendParams(
						0,
						'Pixera.Resources.Resource.changeDistributionTarget',
						{
							handle: parseInt(jsonData.result),
							apEntityLiveSystemHandle: self.RESOURCECHANGEDIST[0],
							shouldDistribute: self.RESOURCECHANGEDIST[1],
						}
					);
					break;
				case 60:
					this.sendParams(0, 'Pixera.Resources.Resource.distribute', {
						handle: parseInt(jsonData.result),
					});
					break;
				case 61: //Pixera.LiveSystems.LiveSystem.getState
					{
						let result = jsonData.result;
						let handle = jsonData.context ? jsonData.context.handle : null;
						if (handle != null) {
							self.LIVESYSTEM_STATE[handle] = result;
							self.checkFeedbacks('livesystem_state');
						}
					}
					break;


				/*
        case 51: //Pixera.Resources.getTranscodingFolders
        {
          let result = jsonData.result;
          if(result != null){
            for(let i = 0; i < result.length; i++){
              self.CHOICES_TRANSCODEFOLDERNAME.push({label: "TanscodingFolder " + (i + 1), id:result[i]});
            }
          }
          self.updateActions();
        }
        break;
        */

				case 73: // Layer.getInst -> setOpacity
					{
						let result = jsonData.result;
						if (result != null) {
							let params = {
								handle: result,
								value: self.LAYER_OPACITY,
							};
							if (self.LAYER_OPACITY_FADE > 0) {
								params.fadeTimeMs = self.LAYER_OPACITY_FADE;
							}
							this.sendParams(0, 'Pixera.Timelines.Layer.setOpacity', params);
						}
					}
					break;
				case 74: // getAppMode, then flip inner/outer
					{
						let next = 4;
						if (jsonData.result == 4) next = 3;
						self.APP_MODE = next;
						self.setVariableValues({ workspace: self.workspaceLabel(next) });
						self.checkFeedbacks('workspace_mode');
						this.sendParams(0, 'Pixera.Ui.setAppMode', { mode: next });
					}
					break;
				case 75: // getAppMode
					{
						self.APP_MODE = jsonData.result;
						self.setVariableValues({
							workspace: self.workspaceLabel(self.APP_MODE),
						});
						self.checkFeedbacks('workspace_mode');
					}
					break;
				case 97: // getCurrentTime -> start preview edit at the playhead
					{
						let result = jsonData.result;
						if (result != null) {
							this.sendParams(0, 'Pixera.Timelines.Timeline.startPreviewEdit', {
								handle: jsonData.context.handle,
								goalTime: result,
							});
							self.PREVIEW_EDIT = 2;
							self.setVariableValues({ preview_edit: 'On' });
							self.checkFeedbacks('preview_edit');
						}
					}
					break;
				case 98: // preview edit transport, 0 means edit mode is off
					{
						self.PREVIEW_EDIT = jsonData.result;
						let on = self.PREVIEW_EDIT == 1 || self.PREVIEW_EDIT == 2 || self.PREVIEW_EDIT == 3;
						self.setVariableValues({ preview_edit: on ? 'On' : 'Off' });
						self.checkFeedbacks('preview_edit');
					}
					break;
				case 110: // default fade duration in ms -> blendToTime in frames
					{
						let ms = parseFloat(jsonData.result);
						let jobs = self.FADE_JOBS || [];
						self.FADE_JOBS = [];
						if (isNaN(ms)) break;
						for (let i = 0; i < jobs.length; i++) {
							let frames = (ms / 1000) * jobs[i].fps;
							this.sendParams(0, 'Pixera.Timelines.Timeline.blendToTime', {
								handle: jobs[i].handle,
								goalTime: jobs[i].goalTime,
								blendDuration: frames,
							});
						}
					}
					break;
				case 124: // cue names for the dropdown
					{
						let names = jsonData.result;
						let handle = jsonData.context && jsonData.context.handle;
						if (handle == undefined || !names || !names.length) break;
						if (!Array.isArray(names)) break;
						let tlName = '';
						for (let i = 0; i < self.CHOICES_TIMELINEFEEDBACK.length; i++) {
							if (self.CHOICES_TIMELINEFEEDBACK[i]['handle'] == handle) {
								tlName = self.CHOICES_TIMELINEFEEDBACK[i]['name'];
							}
						}
						let sig = names.join('|');
						if (!self._cueSig) self._cueSig = {};
						if (self._cueSig[handle] == sig) break;
						self._cueSig[handle] = sig;
						let prefix = String(handle) + '||';
						let kept = [];
						for (let i = 0; i < self.CHOICES_CUENAME.length; i++) {
							if (String(self.CHOICES_CUENAME[i].id).indexOf(prefix) != 0) {
								kept.push(self.CHOICES_CUENAME[i]);
							}
						}
						for (let i = 0; i < names.length; i++) {
							let n = names[i];
							if (n && n.name) n = n.name;
							if (!n) continue;
							kept.push({
								id: prefix + n,
								label: (tlName || 'Timeline') + ' / ' + n,
							});
						}
						self.CHOICES_CUENAME = kept;
						self.updateActions();
					}
					break;
				case 125: // next cue handle
					this.rememberCueName(
						jsonData.context && jsonData.context.handle,
						jsonData.result,
						'next'
					);
					break;
				case 126: // previous cue handle
					this.rememberCueName(
						jsonData.context && jsonData.context.handle,
						jsonData.result,
						'prev'
					);
					break;
				case 127: // cue name came back
					{
						let cue = jsonData.context && jsonData.context.handle;
						let waiting = (self.CUE_NAME_FOR && self.CUE_NAME_FOR[cue]) || [];
						if (self.CUE_NAME_FOR) delete self.CUE_NAME_FOR[cue];
						let name = jsonData.result || '';
						for (let i = 0; i < waiting.length; i++) {
							this.writeCueName(waiting[i].timeline, waiting[i].which, name);
						}
					}
					break;
				case 130: // cue handle from name, then the queued calls
					{
						let cue = jsonData.result;
						let tl = jsonData.context && jsonData.context.handle;
						let calls = self.CUE_JOBS && self.CUE_JOBS[tl];
						if (self.CUE_JOBS) delete self.CUE_JOBS[tl];
						if (cue == null || !calls) break;
						for (let i = 0; i < calls.length; i++) {
							let params = { handle: cue };
							let extra = calls[i].params || {};
							for (let key in extra) params[key] = extra[key];
							this.sendParams(0, calls[i].method, params);
						}
					}
					break;
				case 131: // playhead, then move the cue there
					{
						let frames = jsonData.result;
						let tl = jsonData.context && jsonData.context.handle;
						let job = self.CUE_MOVE && self.CUE_MOVE[tl];
						if (self.CUE_MOVE) delete self.CUE_MOVE[tl];
						if (job == null || frames == null) break;
						if (!self.CUE_JOBS) self.CUE_JOBS = {};
						self.CUE_JOBS[tl] = [
							{ method: 'Pixera.Timelines.Cue.setTime', params: { time: frames } },
						];
						this.sendParams(130, 'Pixera.Timelines.Timeline.getCueFromName', {
							handle: tl,
							name: job.name,
						});
					}
					break;
				case 140: // Layer.getInst -> setVolume
					{
						if (jsonData.result == null) break;
						let params = { handle: jsonData.result, value: self.LAYER_VOLUME };
						if (self.LAYER_VOLUME_FADE > 0) params.fadeTimeMs = self.LAYER_VOLUME_FADE;
						this.sendParams(0, 'Pixera.Timelines.Layer.setVolume', params);
					}
					break;
				case 142: // Resource.getInst -> getId
					{
						if (jsonData.result == null || !self.CLIP_RES) break;
						this.sendParams(143, 'Pixera.Resources.Resource.getId', {
							handle: jsonData.result,
						});
					}
					break;
				case 143: // resource id -> layer
					{
						if (jsonData.result == null || !self.CLIP_RES) break;
						self.CLIP_RES.resId = jsonData.result;
						this.sendParams(144, 'Pixera.Timelines.Layer.getInst', {
							instancePath: self.CLIP_RES.layerPath,
						});
					}
					break;
				case 144: // layer -> current clip
					{
						if (jsonData.result == null || !self.CLIP_RES) break;
						this.sendParams(145, 'Pixera.Timelines.Layer.getClipCurrent', {
							handle: jsonData.result,
							offset: 0,
						});
					}
					break;
				case 145: // clip -> assign resource
					{
						let job = self.CLIP_RES;
						self.CLIP_RES = null;
						if (jsonData.result == null || !job) break;
						let params = { handle: jsonData.result, resId: job.resId };
						if (job.setDuration) params.setToResourceDuration = true;
						else params.setToResourceDuration = false;
						this.sendParams(0, 'Pixera.Timelines.Clip.assignResource', params);
					}
					break;
				case 147: // layer -> current clip, for duration
					{
						if (jsonData.result == null || !self.CLIP_LEN) break;
						this.sendParams(148, 'Pixera.Timelines.Layer.getClipCurrent', {
							handle: jsonData.result,
							offset: 0,
						});
					}
					break;
				case 148: // current clip
					{
						let job = self.CLIP_LEN;
						if (jsonData.result == null || !job) {
							self.CLIP_LEN = null;
							break;
						}
						job.clip = jsonData.result;
						if (job.mode == 'set') {
							self.CLIP_LEN = null;
							this.sendParams(0, 'Pixera.Timelines.Clip.setDuration', {
								handle: job.clip,
								duration: job.frames,
							});
						} else {
							this.sendParams(149, 'Pixera.Timelines.Clip.getDuration', {
								handle: job.clip,
							});
						}
					}
					break;
				case 149: // duration + frames
					{
						let job = self.CLIP_LEN;
						self.CLIP_LEN = null;
						if (jsonData.result == null || !job) break;
						this.sendParams(0, 'Pixera.Timelines.Clip.setDuration', {
							handle: job.clip,
							duration: parseFloat(jsonData.result) + job.addFrames,
						});
					}
					break;
				case 150: // playhead -> place clip
					{
						let job = self.PLACE_CLIP;
						self.PLACE_CLIP = null;
						if (jsonData.result == null || !job) break;
						this.sendParams(0, 'Pixera.Compound.createClipOnLayerAtTimeWithResource', {
							layerPath: job.layerPath,
							time: jsonData.result,
							resourcePath: job.resourcePath,
						});
					}
					break;

				case 9999: //API
					{
						var result = jsonData.result;
						if (result != null) {
							self.log('info', result);
						}
					}
					break;
				case 10000: //monitoring
					{
						var result = jsonData.result;
						if (result != null) {
							for (var c = 0; c < result.length; c++) {
								if (result[c]['name'] == 'timelineTransport') {
									//transport change
									var timelineTransport = result[c]['entries'];
									for (var b = 0; b < timelineTransport.length; b++) {
										for (
											var t = 0;
											t < self.CHOICES_TIMELINEFEEDBACK.length;
											t++
										) {
											if (
												timelineTransport[b]['handle'] ==
												self.CHOICES_TIMELINEFEEDBACK[t]['handle']
											) {
												self.CHOICES_TIMELINEFEEDBACK[t]['timelineTransport'] =
													timelineTransport[b]['value'];
												self.checkFeedbacks('timeline_state');
												//self.log('debug', 'transport:',self.CHOICES_TIMELINEFEEDBACK);
											}
										}
									}
								} else if (result[c]['name'] == 'timelinePositions') {
									//timeline time
									var timelinePositions = result[c]['entries'];
									for (var b = 0; b < timelinePositions.length; b++) {
										for (
											var t = 0;
											t < self.CHOICES_TIMELINEFEEDBACK.length;
											t++
										) {
											if (
												timelinePositions[b]['handle'] ==
												self.CHOICES_TIMELINEFEEDBACK[t]['handle']
											) {
												self.CHOICES_TIMELINEFEEDBACK[t]['timelinePositions'] =
													timelinePositions[b]['value'];
												self.checkFeedbacks('timeline_positions');
												//self.log('debug', 'positions:',self.CHOICES_TIMELINEFEEDBACK);
											}
										}
									}
								} else if (result[c]['name'] == 'timelineCountdowns') {
									//timeline remain
									var timelineCountdowns = result[c]['entries'];
									for (var b = 0; b < timelineCountdowns.length; b++) {
										for (
											var t = 0;
											t < self.CHOICES_TIMELINEFEEDBACK.length;
											t++
										) {
											if (
												timelineCountdowns[b]['handle'] ==
												self.CHOICES_TIMELINEFEEDBACK[t]['handle']
											) {
												self.CHOICES_TIMELINEFEEDBACK[t]['timelineCountdowns'] =
													timelineCountdowns[b]['value'];
												let flag = timelineCountdowns[b]['flag'];
												if (flag == undefined) flag = timelineCountdowns[b]['Flag'];
												self.CHOICES_TIMELINEFEEDBACK[t]['countdownFlag'] = flag;
												self.checkFeedbacks('timeline_countdowns');
												//self.log('debug', 'countdowns:',self.CHOICES_TIMELINEFEEDBACK);
											}
										}
									}
								}
							}
						}
						self.checkFeedbacks('running_time');
						self.checkFeedbacks('time_to_next_cue');
						self.checkFeedbacks('transport_play');
						self.checkFeedbacks('transport_pause');
						self.checkFeedbacks('transport_stop');
						self.checkFeedbacks('countdown_under');
						this.publishActiveTimeline();
					}
					break;
				case 10001:
					{
						var result = jsonData.result;
						if (result != null) {
							self.SELECTEDTIMELINES = result;
						} else {
							self.SELECTEDTIMELINES = [];
						}
						self.checkFeedbacks('active_timeline');
						self.checkFeedbacks('running_time');
						self.checkFeedbacks('time_to_next_cue');
						self.checkFeedbacks('transport_play');
						self.checkFeedbacks('transport_pause');
						self.checkFeedbacks('transport_stop');
						self.checkFeedbacks('countdown_under');
						self.checkFeedbacks('next_cue');
						self.checkFeedbacks('prev_cue');
						this.publishActiveTimeline();
					}
					break;
			}
		} catch {
			self.log('error', 'error in rec data');
			self.log('error', data);
		}
	}
}

module.exports = Pixera;
