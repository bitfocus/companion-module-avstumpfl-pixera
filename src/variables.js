module.exports = function (self) {
	// Define variables that will be updated from OSC info messages
	self.setVariableDefinitions([
		// /ict_ev/info/playback
		{ variableId: 'countdown_s_pad', name: 'Countdown (Seconds, Padded)' },
		{ variableId: 'countdown_s', name: 'Countdown (Seconds)' },
		{ variableId: 'countdown_m_pad', name: 'Countdown (Minutes, Padded)' },
		{ variableId: 'countdown_m', name: 'Countdown (Minutes)' },
		{ variableId: 'countdown_h_pad', name: 'Countdown (Hours, Padded)' },
		{ variableId: 'countdown_h', name: 'Countdown (Hours)' },
		{ variableId: 'countdown_f_pad', name: 'Countdown (Frames, Padded)' },
		{ variableId: 'countdown_f', name: 'Countdown (Frames)' },
        
		{ variableId: 'timecode_s_pad', name: 'Timecode (Seconds, Padded)' },
		{ variableId: 'timecode_s', name: 'Timecode (Seconds)' },
		{ variableId: 'timecode_m_pad', name: 'Timecode (Minutes, Padded)' },
		{ variableId: 'timecode_m', name: 'Timecode (Minutes)' },
		{ variableId: 'timecode_h_pad', name: 'Timecode (Hours, Padded)' },
		{ variableId: 'timecode_h', name: 'Timecode (Hours)' },
		{ variableId: 'timecode_f_pad', name: 'Timecode (Frames, Padded)' },
		{ variableId: 'timecode_f', name: 'Timecode (Frames)' },
	])

	// Initialize formatted variables with placeholder so UI shows --:-- before any OSC is received
	const _initialFormatted = {
		countdown_s_pad: '',
		countdown_s: '',
		countdown_m_pad: '',
		countdown_m: '',
		countdown_h_pad: '',
		countdown_h: '',
		countdown_f_pad: '',
		countdown_f: '',
		timecode_s_pad: '',
		timecode_s: '',
		timecode_m_pad: '',
		timecode_m: '',
		timecode_h_pad: '',
		timecode_h: '',
		timecode_f_pad: '',
		timecode_f: '',
	}

	if (typeof self.setVariableValues === 'function') {
		self.setVariableValues(_initialFormatted)
	} else if (typeof self.setVariable === 'function') {
		Object.entries(_initialFormatted).forEach(([k, v]) => {
			self.setVariable(k, v)
		})
	} else {
		self.log && self.log('debug', `Initial variables: ${JSON.stringify(_initialFormatted)}`)
	}
}


//jester productions: elevating simple - M L (Singapore - 2026)