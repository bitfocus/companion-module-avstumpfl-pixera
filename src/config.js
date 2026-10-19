const { Regex } = require('@companion-module/base')
module.exports = {
	getConfigFields() {
		return [
			{
				type: 'static-text',
				id: 'info',
				width: 12,
				label: 'Information',
				value: "AV Stumpfl Pixera JSON/TCP API",
			},
			{
				type: 'static-text',
				id: 'info',
				width: 12,
				label: 'API Function',
				value: "use API function at your own risk",
			},
			{
				type: 'textinput',
				id: 'host',
				label: 'Target IP',
				width: 6,
				regex: Regex.IP,
			},
			{
				type: 'number',
				id: 'port',
				width: 5,
				label: 'Port',
				default: 1400,
				regex: Regex.PORT,
			},
			{
				type: 'checkbox',
				id: 'polling',
				label: 'Enable Polling feedbacks?',
				width: 4,
				default: false,
			},
			{
				type: 'dropdown',
				label: 'Polling Rate',
				id: 'polling_rate',
				tooltip: 'How often timecode, countdown, workspace and the selected timeline are read. 200ms is enough for a running clock.',
				isVisible: (configValues) => configValues.polling === true,
				width: 6,
				default: 200,
				choices: [
					{ id: 50, label: '50ms (heavy)' },
					{ id: 100, label: '100ms' },
					{ id: 200, label: '200ms (recommended)' },
					{ id: 500, label: '500ms' },
					{ id: 1000, label: '1000ms' },
					{ id: 2000, label: '2000ms' },
				],
			},
		]
	},
}