const { combineRgb } = require('@companion-module/base');

function button(category, name, text, bgcolor, actionId, options, feedbacks) {
	return {
		type: 'button',
		category: category,
		name: name,
		style: {
			text: text,
			size: '14',
			color: combineRgb(255, 255, 255),
			bgcolor: bgcolor,
		},
		steps: [
			{
				down: actionId
					? [
							{
								actionId: actionId,
								options: options || {},
							},
					  ]
					: [],
				up: [],
			},
		],
		feedbacks: feedbacks || [],
	};
}

module.exports = {
	initPresets() {
		let self = this;
		let selected = -1;
		let presets = {};
		// Companion sorts categories by name. The prefix keeps Feedback last.
		let feedbackCategory = '\u200bFeedback';

		presets.play = button('Playout', 'Play', 'Play', combineRgb(0, 120, 0), 'timeline_transport', {
			mode: 1,
			timelinename_state: selected,
		});
		presets.pause = button('Playout', 'Pause', 'Pause', combineRgb(140, 110, 0), 'timeline_transport', {
			mode: 2,
			timelinename_state: selected,
		});
		presets.stop = button('Playout', 'Stop', 'Stop', combineRgb(140, 0, 0), 'timeline_transport', {
			mode: 3,
			timelinename_state: selected,
		});
		presets.toggle = button('Playout', 'Toggle', 'Play\\nPause', combineRgb(0, 90, 40), 'timeline_transport', {
			mode: 4,
			timelinename_state: selected,
		});
		presets.next_cue = button('Playout', 'Next cue', 'Next\\nCue', combineRgb(40, 40, 40), 'timeline_next_cue', {
			timelinename_next: selected,
			timelinename_next_ignore: false,
			timelinename_next_blend: false,
		});
		presets.prev_cue = button('Playout', 'Previous cue', 'Prev\\nCue', combineRgb(40, 40, 40), 'timeline_prev_cue', {
			timelinename_prev: selected,
			timelinename_prev_ignore: false,
			timelinename_prev_blend: false,
		});
		presets.running_time = button(
			'Playout',
			'Running time',
			'00:00:00:00',
			combineRgb(0, 0, 0),
			null,
			null,
			[{ feedbackId: 'running_time', options: { timeline: '' } }]
		);
		presets.time_to_next_cue = button(
			'Playout',
			'Time to next cue',
			'--:--:--:--',
			combineRgb(0, 0, 0),
			null,
			null,
			[{ feedbackId: 'time_to_next_cue', options: { timeline: '' } }]
		);
		presets.edit_mode = button(
			'Playout',
			'Edit mode',
			'Edit mode',
			combineRgb(90, 70, 0),
			'preview_edit',
			{ timeline: selected, what: 'enter', seconds: '' },
			[
				{
					feedbackId: 'preview_edit',
					options: {
						fg: combineRgb(0, 0, 0),
						bg: combineRgb(255, 180, 0),
					},
				},
			]
		);
		presets.playing = button(
			feedbackCategory,
			'Playing',
			'Playing',
			combineRgb(0, 80, 0),
			null,
			null,
			[
				{
					feedbackId: 'transport_play',
					options: {
						timeline: '',
						fg: combineRgb(255, 255, 255),
						bg: combineRgb(0, 140, 0),
					},
				},
			]
		);
		presets.paused = button(
			feedbackCategory,
			'Paused',
			'Paused',
			combineRgb(90, 70, 0),
			null,
			null,
			[
				{
					feedbackId: 'transport_pause',
					options: {
						timeline: '',
						fg: combineRgb(0, 0, 0),
						bg: combineRgb(255, 200, 0),
					},
				},
			]
		);
		presets.stopped = button(
			feedbackCategory,
			'Stopped',
			'Stopped',
			combineRgb(90, 0, 0),
			null,
			null,
			[
				{
					feedbackId: 'transport_stop',
					options: {
						timeline: '',
						fg: combineRgb(255, 255, 255),
						bg: combineRgb(160, 0, 0),
					},
				},
			]
		);
		presets.active_timeline = button(
			feedbackCategory,
			'Active timeline',
			'Timeline',
			combineRgb(20, 20, 20),
			null,
			null,
			[{ feedbackId: 'active_timeline', options: {} }]
		);

		presets.fade_in = button('Programming', 'Fade in', 'Fade\\nIn', combineRgb(0, 70, 90), 'timeline_fade', {
			timeline: selected,
			fade_in: true,
			seconds: '1',
		});
		presets.fade_out = button('Programming', 'Fade out', 'Fade\\nOut', combineRgb(40, 40, 50), 'timeline_fade', {
			timeline: selected,
			fade_in: false,
			seconds: '1',
		});
		presets.store = button('Programming', 'Store', 'Store', combineRgb(40, 40, 40), 'timeline_store', {
			timelinename_store: selected,
		});
		presets.reset = button('Programming', 'Clear dominant', 'Clear', combineRgb(80, 40, 0), 'timeline_reset', {
			timeline_reset_timeline: selected,
		});
		presets.frame_back = button('Programming', 'Frame back', '< Frame', combineRgb(30, 30, 30), 'timeline_scrubcurrenttime', {
			timeline_scrubcurrenttime_timeline: selected,
			timeline_scrubcurrenttime_frames: -1,
		});
		presets.frame_forward = button('Programming', 'Frame forward', 'Frame >', combineRgb(30, 30, 30), 'timeline_scrubcurrenttime', {
			timeline_scrubcurrenttime_timeline: selected,
			timeline_scrubcurrenttime_frames: 1,
		});

		let workspace = function (id, name, text, mode) {
			presets[id] = button('Programming', name, text, combineRgb(0, 60, 90), 'workspace', { mode: mode }, [
				{
					feedbackId: 'workspace_mode',
					options: {
						mode: parseInt(mode),
						fg: combineRgb(255, 255, 255),
						bg: combineRgb(0, 100, 160),
					},
				},
			]);
		};
		workspace('outer', 'Outer compositing', 'Outer', '3');
		workspace('inner', 'Inner compositing', 'Inner', '4');
		presets.dive = button('Programming', 'Toggle inner / outer', 'Dive', combineRgb(0, 60, 90), 'workspace', {
			mode: 'toggle',
		});
		workspace('screens', 'Screens (projectors)', 'Screens', '1');
		workspace('mapping', 'Mapping', 'Mapping', '2');

		self.setPresetDefinitions(presets);
	},
};
