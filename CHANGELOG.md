# Pixera module changes against 3.2.3

For Pixera 25 and newer. Existing actions from 3.2.3 are still there, including Timeline Create Cue, Blend To Timecode, Timeline Fade Opacity and Timeline Remove Cues.

## Connection

Actions, feedbacks and presets are listed as soon as the module loads. A host and port are only needed when a button is pressed.

The polling rate can be set to 50, 100, 200, 500, 1000 or 2000 ms. Default is 200 ms, and only while polling is enabled. With polling off, the selected timeline is still read once a second.

## New actions

- **Fade to Timecode.** Target time as hour, minute, second and frame. Fade length in seconds. Empty fade uses the fade stored in Pixera. Blend To Timecode still sends the fade in frames.
- **Fade to Cue.** Cue from the dropdown, or a typed name when that field is filled in. Fade in seconds. Empty fade uses the fade stored on the cue.
- **Go to Cue Number.** Numbers such as 1, 1.2 or 1.2.3. Fade in seconds, empty uses the cue fade.
- **Timeline Fade.** Fade in or fade out. Duration in seconds for a full fade from 0 to 1. Timeline Fade Opacity still uses frames.
- **Default Fade Time.** Sets the general fade-to-time duration in Pixera.
- **Rename Cue, Recolor Cue, Move Cue, Cue Jump Target, Cue Wait, Remove Cue.** One cue, chosen from the list or typed. Move can use the playhead or a time in seconds. Jump target is a time or another cue. Wait is in seconds. Remove Cue deletes that cue only. Timeline Remove Cues still deletes every cue on the timeline.
- **Layer Opacity Fade** and **Layer Volume.** Value plus an optional fade in seconds. Layer path, including a group path from Pixera 25.2 (`Timeline.Group.Layer`).
- **Resource on Clip.** Puts a resource on the clip under the playhead. Path like `Media/Folder/file.mov`. Option to set the clip length to the resource.
- **Place Clip.** On the playhead, or at a time in seconds.
- **Clip Duration.** Set the length in seconds, or add frames. A negative frame count shortens the clip.
- **Workspace.** Screens, Mapping, Outer compositing, Inner compositing, or a toggle between inner and outer.
- **Preview Camera.** Slots 1 to 5.
- **Preview Edit.** Enter edit mode at the playhead, return to the playhead, or move the playhead to the edit time.
- **Outputs Active, Test Pattern, On-Screen Statistics.**

## Changed actions

- **Live Systems Set Audio Master Volume.** Volume and channels accept variables. The float check that blocked variables is gone.

## Feedbacks

Existing feedbacks for timeline state, one timecode field and one countdown field are unchanged.

- **Running time** and **Time to next cue** show the full timecode. An empty timeline name uses the timeline selected in Pixera.
- **Playing, Paused, Stopped.**
- **Countdown under N seconds.** Lights only after Pixera has sent a countdown.
- **Next cue name** and **Previous cue name.**
- **Active timeline.**
- **Workspace** and **Edit mode.**

## Variables

For the selected timeline: running time, time to next cue, transport, fps, countdown kind (`to cue` or `cue wait`), next cue, previous cue, workspace and edit mode.

The same timeline fields also exist per timeline. The variable id is the timeline name in lower case, for example `tl_timeline_1_time` for a timeline named Timeline 1.

## Presets

- **Playout.** Play, pause, stop, toggle, next cue, previous cue, running time, time to next cue, edit mode.
- **Programming.** Fade in, fade out, store, clear dominant values, frame back, frame forward, outer compositing, inner compositing, dive, screens, mapping.
- **Feedback.** Playing, paused, stopped, active timeline. This group is listed after Playout and Programming.

Clear calls `Timeline.reset`. That clears dominant values on the timeline. Cues, clips and the playhead stay where they are. With nothing dominant, the button shows no change.

## Cue list

After Pixera connects, cue actions get a dropdown filled from the show, labelled `Timeline / Cue`. A typed name overrides the dropdown, so a variable still works. The list is filled on connect, not on every poll.
