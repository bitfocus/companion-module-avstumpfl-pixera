## AV Stumpfl Pixera JSON Api Rev67

Nativ implementation using Pixera JSON/TCP Api

** Implemented Commands
* Timeline Transport Mode
* Timeline NextCue
* Timeline PerviusCue
* Timeline IgnoreNextCue
* Timeline Store
* Visible Screen On/Off
* Screen is Projectable On/Off
* Screen Trigger Mapping		need API Version >= 67
* Goto Timecode
* Goto Cue by Name
* Goto Cue by Index
* Blend to Timecode
* Blend to Cue by Name
* Timeline Opacity				need API Version >= 67
* Timeline Fade Opacity			need API Version >= 67
* API (e.g. {"jsonrpc":"2.0", "id":9, "method":"Pixera.Compound.startFirstTimeline"})

** Implemented Feedback
* Button Color Timeline State
* Button Text Timeline Timecode
* Button Text Timeline Remain

** Response
* API Commands returns Handles if available