## AV Stumpfl Pixera JSON Api Rev367

Nativ implementation using Pixera JSON/TCP Api

** Implemented Commands
* Timeline Transport Mode
* Timeline NextCue
* Timeline PerviusCue
* Timeline IgnoreNextCueW
* Timeline Store
* Visible Screen On/Off
* Screen is Projectable On/Off
* Screen Trigger Mapping		
* Goto Timecode
* Goto Cue by Name
* Goto Cue by Index
* Blend to Timecode
* Blend to Cue by Name
* Blend to Next Cue
* Blend to Prev Cue
* Timeline Opacity				
* Timeline SMPTE Mode				
* Timeline Fade Opacity			(StartOpacityAnimation)
* Timeline Opacity Adjust		(set, increase/decrease by step, toggle 0/100%)
* Layer Opacity Adjust			(pick Timeline, then Layer; set, increase/decrease by step, toggle 0/100%)
* Layer Position / Size (Scale) / Rotation Adjust	(pick Timeline, Layer and axis; set, increase/decrease by step; Size can change X and Y together keeping the aspect ratio)
* Dial Sensitivity			(switch a dial between its fine and coarse step)
* Layer dropdowns also offer Selected Layer(s), and the Timeline dropdown Selected Timeline(s): the action then works on whatever is selected in Pixera
* Layer Reset
* Layer Mute/VolumeMute
* Layer Paramter
* Control Action
* API (e.g. {"jsonrpc":"2.0", "id":9, "method":"Pixera.Compound.startFirstTimeline"})

** Implemented Feedback
* Button Color Timeline State
* Button Text Timeline Timecode
* Button Text Timeline Remain
* Button Color Live System State (requires polling to be enabled)
* Button Style Timeline/Layer Opacity Level
* Button Style Dial Sensitivity is Coarse (the dial presets turn orange on the coarse step)

** Stream Deck+ Dials
* Put an Adjust action with Decrease on rotate left and Increase on rotate right
* Put Dial Sensitivity on press to switch between the fine and coarse step; give the dial the same Dial Name in all its actions
* Presets: Dials (Stream Deck+) has ready-made dials per timeline: timeline opacity, and per layer opacity, position X/Y, size and rotation Z, plus a set of dials for the selected layer
* Steps are applied from the module's own copy of the value, so fast turns stay smooth
* Position, size and rotation use the x/y/z parameters of the layer's Position, Scale (or Size) and Rotation nodes (API rev 481)

** Variables
* `timeline_opacity_<timeline name>` in percent, for every timeline
* `layer_<timeline name>_<layer name>_opacity` in percent, for every layer
* `layer_<timeline name>_<layer name>_position_x` (and `_y`, `_z`, `scale_*`, `rotation_*`) for parameters used on a button
* `dial_<dial name>_sensitivity`: fine or coarse
* `selected_timeline`, `selected_layer`, `selected_layer_count`: what is selected in Pixera
* `selected_opacity`, `selected_position_x` (and the other position, scale and rotation axes): values of the first selected layer
* `dial_last_name` / `dial_last_value`: the last timeline or layer parameter changed from Companion
* Changes made in Pixera itself show up when polling is enabled

** Response
* API Commands returns Handles if available

* some commands are only workig in version 2.0