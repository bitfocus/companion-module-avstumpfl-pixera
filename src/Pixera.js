const {instanceStatus,TCPHelper} = require('@companion-module/base');
const { isIP } = require('net');

class Pixera {
  constructor(instance,config){
    this.instance = instance;
    let self = instance;
    //buffer for receive stream
    if(isIP(config.host) !== 4){
      self.log('error', self.config + ' is not a valid IP');
      return;
    }
    if(config.host)
    {
      this.socket = new TCPHelper(config.host, config.port)
      this.socket.on('status_change', function(status, message) {
        self.updateStatus(status, message);
      });

      this.socket.on('disconnect', function(err) {
        self.log('error',"Network error: " + err.message);
        clearInterval(self.retry_interval);
      });

      this.socket.on('error', function(err) {
        self.log('error',"Network error: " + err.message);
        clearInterval(self.retry_interval);
      });

      this.socket.on('close',function() {
        self.log('debug', "Close Connection.");
        clearInterval(self.retry_interval);
      })
      this.socket.on('connect',()=>{
        self.log('info', 'Pixera Connected');
        //use version to filter commands
        this.send(1,'Pixera.Utility.getApiRevision');
        //send message to get reply
        this.sendParams(99,'Pixera.Utility.setShowContextInReplies',{'doShow':true});
        self.initFeedbacks()
        this.initVariables();
        this.initTimelines();
        this.initScreens();
        this.initLiveSystem();
        if(self.config.polling)
				{
          //self.log('debug',config.polling_rate);
					self.retry_interval = setInterval(this.retry.bind(this), config.polling_rate);//ms for pool timelinestate
					this.retry();
				}
      })
      this.socket.on('data',(chunk)=>{
        const header = 'pxr1';
        if (chunk.toString('utf8',0,4) == header) {
          let splitChunk = chunk.toString('utf8').split('pxr1');
          splitChunk.forEach(element => {
            if(!element)return;
            let data = element.substring(4,element.length).trim();
            //self.log('debug',data);
            this.processReceivedData(data);
          });
          
        }
      })
    }
  }
  destroy(){
    let self = this.instance;
    clearInterval(self.retry_interval);
    if(this.socket){
      this.socket.destroy();
      delete this.socket;
    }
  }
  generateCommand(id,method,params){
    let self = this.instance;
    if(id == undefined || !method){
      self.log('error','missing method or id in generate');
      return;
    }
    let command = {
      'jsonrpc': '2.0',
      'id': id,
      'method': method,
    };
    if(params){
      command.params = params;
    }
    return command;
  }
  send(id,method){
    if(id == undefined || !method){
     self.log('error','missing id,method or param in send');
    return;
  }
  this.sendParams(id,method,null);
  }
  sendParams(id,method,params){
    let self = this.instance;
    if(id == undefined || !method){
      self.log('error','missing id,method or param in sendParams');
      self.log('debug',id + ' - ' + method + ' - ' + params);
      return;
    }
    let msg = this.generateCommand(id,method,params);
    let sendBuffer = this.prependHeader(JSON.stringify(msg));
    if(sendBuffer){
      this.sendBuffer(sendBuffer);
    }
  }
  prependHeader(body) {
		let self = this;
			var result = [];

			for (let i=0; i<body.length; i++) {
				let hex = body.charCodeAt(i).toString(16);
				result = result.concat(this.roughScale(hex,16));
			}

			var preHeader = [112,120,114,49,body.length,0,0,0];
			const buf = Buffer.from(preHeader.concat(result));
			return buf;
	}
  roughScale(x, base) {
		var parsed = parseInt(x, base);
		if (isNaN(parsed)) { return 0 }
		return parsed;
	}
  sendBuffer(cmd){
    let self = this.instance;
    //enable this for debugging to see send out commands
    //self.log('debug',cmd.toString('utf8'));
    if(this.socket && this.socket.isConnected){
      this.socket.send(cmd)
    }
    else{
      self.log('error', 'Pixera not connected. Can not send command');
    }
  }
  pool() {
		let self = this.instance;
    this.send(10000,'Pixera.Utility.pollMonitoring');
	}
  retry() {
		let self = this.instance;
		this.pool();
	}
  initTimelines(){
		let self = this.instance;
		this.send(11,'Pixera.Timelines.getTimelines');
	};
  initRemoteSystemIps() {
    let self = this.instance;
    this.send(6,'Pixera.Session.getRemoteSystemIps')
  };
  initLiveSystem() {
    let self = this.instance;
    this.send(4,'Pixera.LiveSystems.getLiveSystems')
  };
  initVariables(){
		let self = this.instance;

		self.CHOICES_TIMELINENAME = [{label: '',id:0}];
		self.CHOICES_TIMELINEHANDLE = [];
    self.CHOICES_TIMELINEFEEDBACK = [];

		self.CHOICES_SCREENNAME = [{label: '',id:0}];
		self.CHOICES_SCREENHANDLE = [];

		self.CHOICES_CUENAME = [];
		self.CHOICES_CUEHANDLE = [];

		self.CHOICES_FADELIST = [];

    self.CHOICES_LIVESYSTEMNAME = [{label: '',id:0}]
    self.CHOICES_LIVESYSTEMHANDLE = '';
  }
  initScreens(){
		let self = this.instance;
		this.send(13,'Pixera.Screens.getScreens');
    this.send(14,'Pixera.Screens.getScreenNames');
  }
  processReceivedData(data){
		let self = this.instance;
		try{
			let jsonData = JSON.parse(data);
			if(jsonData.id == undefined){
				self.log('debug','id is missing in rec data: ' + data);
				return;
			}
			switch(jsonData.id){
        case 0:   //none
        break;

        case 1:
        {
          let result = jsonData.result;
          self.VERSION = result;
        }
        break;

        case 4:
        {
          let result = jsonData.result;
          if(result != null){
            for(let i = 0; i < result.length; i++){
              self.CHOICES_LIVESYSTEMHANDLE = result;
              this.sendParams(5,'Pixera.LiveSystems.LiveSystem.getName',
                {'handle':result[i]});
            }
          }
          self.updateActions();
        }
        break;

        case 5:
        {
          let result = jsonData.result;
          if(result != null){
            self.CHOICES_LIVESYSTEMNAME.push({label: result, id:self.CHOICES_LIVESYSTEMHANDLE[0]});

            let temp = []
            for (let i = 1; i < self.CHOICES_LIVESYSTEMHANDLE.length; i++) {
              temp.push(self.CHOICES_LIVESYSTEMHANDLE[i]);
            }
            self.CHOICES_LIVESYSTEMHANDLE = temp;
          }
          self.updateActions();
        }
        break;

        case 8:
        {
          let result = jsonData.result;
          if(result != null){
            let name = self.CREATELAYER_LAYERNAME

            this.sendParams(0,'Pixera.Timelines.Layer.setName',
              {'handle':result, 'name':name});
          }
        }
        break;

        case 9: // create cue at current time
        {
          let result = jsonData.result;
          if(result != null){
            let handle = self.TIMELINE_CREATECUE_TIMELINEHANDLE
            let name = self.TIMELINE_CREATECUE_CUENAME
            let operation = self.TIMELINE_CREATECUE_CUEOPERATION

            this.sendParams(0,'Pixera.Timelines.Timeline.createCue',
              {'handle':handle, 'name':name, 'timeInFrames':result, 'operation':operation});
          }
        }
        break;

				case 11:  //get timeline list
				{
					let result = jsonData.result;
					self.CHOICES_TIMELINEHANDLE = result;
					for(let i = 0; i<result.length;i++){
						//set feedback timeline array 
						self.CHOICES_TIMELINEFEEDBACK.push({'handle': result[i],'timelineTransport':'0','timelinePositions':'0','timelineCountdowns':'0','name':'0', 'fps':'0'}); //set timeline variable for feedback
						//get attributes for each timeline
						this.sendParams(12,'Pixera.Timelines.Timeline.getAttributes',{'handle':result[i]});
					}
					self.updateActions();
				}
				break;

				case 12:  //get timeline attributes
				{
					let result = jsonData.result;
					let context = jsonData.context;
					let handle = context['handle'];
					for(var i = 0;i<self.CHOICES_TIMELINEHANDLE.length;i++){
						if(self.CHOICES_TIMELINEHANDLE[i] == handle){
							self.CHOICES_TIMELINENAME.push({ label: result['name'], id: self.CHOICES_TIMELINEHANDLE[i]}); //set timeline name for dropdown menu
							break;
						}
					}
					for(var k = 0;k<self.CHOICES_TIMELINEFEEDBACK.length;k++){
						if(self.CHOICES_TIMELINEFEEDBACK[k]['handle'] == handle){
							self.CHOICES_TIMELINEFEEDBACK[k]['name'] = result['name'];//set timeline name for feedback
							self.CHOICES_TIMELINEFEEDBACK[k]['fps'] = result['fps'];//set timeline fps for feedback
						}
					}
					self.updateActions();
				}
				break;
        case 13:  //Pixera.Screens.getScreens
        {
          let result = jsonData.result;
          if(result != null){
            self.CHOICES_SCREENHANDLE = result;
          }
          self.updateActions();
        }
        break;
        case 14:  //Pixera.Screens.getScreenNames
        {
          let result = jsonData.result;
          if(result != null){
            for(var i = 0; i<result.length;i++){
              self.CHOICES_SCREENNAME.push({label: result[i],id:self.CHOICES_SCREENHANDLE[i]});
            }
          }
          self.updateActions();
        }
        break;
        case 33: //Pixera.Timelines.Timeline.CueHandle -> Pixera.Timelines.Cue.blendToThis
        {
          let result = jsonData.result;
          let context = jsonData.context;
					let handleTimeline = context['handle'];
          let fps = 60;
          if(result != null){
            for(let k = 0; k<self.CHOICES_TIMELINEFEEDBACK.length;k++){
              if(self.CHOICES_TIMELINEFEEDBACK[k]['handle'] == handleTimeline &&
                 self.CHOICES_TIMELINEFEEDBACK[k]['fps']!=0){
                fps = self.CHOICES_TIMELINEFEEDBACK[k]['fps'];
                break;
              }
            }
            let time = self.CHOICES_BLENDNAME_FRAMES/fps;
            this.sendParams(19,'Pixera.Timelines.Cue.blendToThis',{'handle':result,'blendDurationInSeconds':time});
          }
        }
        break;
        case 39:  //Pixera.Timelines.Layer.getInst -> Pixera.Timelines.Layer.muteLayer
        case 40:  //Pixera.Timelines.Layer.getInst -> Pixera.Timelines.Layer.unMuteLayer
        case 41:  //Pixera.Timelines.Layer.getInst -> Pixera.Timelines.Layer.muteAudio
        case 42:  //Pixera.Timelines.Layer.getInst -> Pixera.Timelines.Layer.unMuteAudio
        {
          let result = jsonData.result;
          let muteMethod =  'Pixera.Timelines.Layer.muteLayer';
          if(jsonData.id == 40){
            muteMethod =  'Pixera.Timelines.Layer.unMuteLayer';
          }
          else if(jsonData.id == 41){
            muteMethod =  'Pixera.Timelines.Layer.muteAudio';
          }
          else if(jsonData.id == 42){
            muteMethod =  'Pixera.Timelines.Layer.unMuteAudio';
          }
          this.sendParams(0,muteMethod,{'handle':result});
        }
        break;
        case 43:  //Pixera.Timelines.Layer.getInst -> Pixera.Timelines.Layer.resetLayer
        {
          let result = jsonData.result;
          if(result != null){
            this.sendParams(0,'Pixera.Timelines.Layer.resetLayer',{'handle':result});
          }
        }
        break;
        case 44:  //Pixera.Timelines.Layer.getInst -> Pixera.Timelines.Layer.muteLayerToggle
        case 45:  //Pixera.Timelines.Layer.getInst -> Pixera.Timelines.Layer.muteAudioToggle
        {
          let result = jsonData.result;
          let muteMethod =  'Pixera.Timelines.Layer.muteLayerToggle';
          if(jsonData.id == 45){
            muteMethod =  'Pixera.Timelines.Layer.muteAudioToggle';
          }
          this.sendParams(0, muteMethod, {'handle':result});
        }
        break;
        case 9999:  //API
        {
          var result = jsonData.result;
          if(result != null){
            self.log('info', result);
          }
        }
        break;
        case 10000: //monitoring
        {
          var result = jsonData.result;
							if(result != null){
								for(var c = 0; c<result.length ; c++){
									if(result[c]['name'] == 'timelineTransport'){//transport change
										var timelineTransport = result[c]['entries'];
										for(var b = 0; b<timelineTransport.length;b++){
											for(var t = 0;t<self.CHOICES_TIMELINEFEEDBACK.length;t++){
												if(timelineTransport[b]['handle'] == self.CHOICES_TIMELINEFEEDBACK[t]['handle']){
													self.CHOICES_TIMELINEFEEDBACK[t]['timelineTransport'] = timelineTransport[b]['value']
													self.checkFeedbacks('timeline_state');
													//self.log('debug', 'transport:',self.CHOICES_TIMELINEFEEDBACK);
												}
											}
										}
									}
									else if(result[c]['name'] == 'timelinePositions'){//timeline time
										var timelinePositions = result[c]['entries'];
										for(var b = 0; b<timelinePositions.length;b++){
											for(var t = 0;t<self.CHOICES_TIMELINEFEEDBACK.length;t++){
												if(timelinePositions[b]['handle'] == self.CHOICES_TIMELINEFEEDBACK[t]['handle']){
													self.CHOICES_TIMELINEFEEDBACK[t]['timelinePositions'] = timelinePositions[b]['value']
													self.checkFeedbacks('timeline_positions');
													//self.log('debug', 'positions:',self.CHOICES_TIMELINEFEEDBACK);
												}
											}
										}
									}
									else if(result[c]['name'] == 'timelineCountdowns'){//timeline remain
										var timelineCountdowns = result[c]['entries'];
										for(var b = 0; b<timelineCountdowns.length;b++){
											for(var t = 0;t<self.CHOICES_TIMELINEFEEDBACK.length;t++){
												if(timelineCountdowns[b]['handle'] == self.CHOICES_TIMELINEFEEDBACK[t]['handle']){
													self.CHOICES_TIMELINEFEEDBACK[t]['timelineCountdowns'] = timelineCountdowns[b]['value']
													self.checkFeedbacks('timeline_countdowns');
													//self.log('debug', 'countdowns:',self.CHOICES_TIMELINEFEEDBACK);
												}
											}
										}
									}
								}
							}
        }
        break;
      }
		}
		catch{
			self.log('error','error in rec data');
      self.log('error',data);
		}
	}
}

module.exports = Pixera