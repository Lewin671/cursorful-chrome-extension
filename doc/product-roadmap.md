# Cursorful Product Roadmap

## Product Role

Cursorful should not be positioned as a screen recorder plus editor.

It should be positioned as an automatic presentation recorder:

- It helps users record demos, walkthroughs, and bug reproductions that already feel directed.
- It reduces the amount of manual post-processing needed after recording.
- It produces source material that is either ready to share immediately or much easier to hand off to professional editors.

In one sentence:

> Cursorful is not meant to help users edit videos. It is meant to help them record clearer videos from the start.

## Target Users

### Primary users

- Product managers recording feature walkthroughs
- Designers explaining flows and interaction details
- Engineers recording bug reproductions or implementation demos
- Support and success teams creating issue explanations or help videos

### Secondary users

- Sales and growth teams creating product demos
- Solo builders and SaaS founders making launch or onboarding videos

### Professional users

- Video editors or creators who do not need another editor, but do want better recorded source material with built-in focus cues

## Product Principles

- Do not build a timeline editor.
- Do not compete on editing depth.
- Compete on recording quality and presentation clarity.
- Make the automatic focus system the core product differentiator.
- Optimize for "record once, share now" and "record once, edit less later."

## Product Boundary

### What Cursorful should do

- Reliable browser-based recording
- Capture cursor movement and click intent
- Automatically emphasize the important area of the screen
- Apply presentation presets during capture or export
- Export high-quality local files
- Preserve metadata that can help downstream professional workflows

### What Cursorful should not do

- Complex timeline editing
- Keyframe editing
- Multi-track editing
- Subtitle editing
- Full post-production workflows

## Core Value Proposition

The product value is not "you can record your screen."

That is a commodity.

The real value is:

- Users can explain something more clearly without learning video editing.
- Teams can produce demos and bug reports that are easier to understand.
- Professional creators can start from footage that already contains better focus and motion language.

## Roadmap

## Phase 1: Solid Recording Foundation

Goal: make recording dependable enough that users trust the tool for real work.

Key outcomes:

- Stable start, pause, resume, and stop flows
- Clear recording state feedback
- Reliable local preview and download
- Good output defaults for video quality and file naming
- Better handling of tab, window, and full-screen capture choices
- Consistent capture of cursor trail and click events

Success signals:

- High first-recording success rate
- High export success rate
- Low abandonment during first-run recording

## Phase 2: Auto-Director Core

Goal: make recordings feel like they already have presentation direction.

Key outcomes:

- Auto-zoom based on click clusters
- Cursor-follow focus mode
- Smooth transitions between focus states
- Click emphasis effects
- Noise reduction for meaningless cursor motion
- Multiple focus behavior presets such as conservative, balanced, and aggressive

This is the product's core differentiator.

Users should feel that the product is actively helping them "tell the story" of what is happening on screen.

Success signals:

- Users keep the default auto-focus behavior instead of turning it off
- Shared recordings are easier to follow without manual editing
- Repeat usage increases for demos and bug reports

## Phase 3: Recording Templates Instead of Editing

Goal: let users define the final presentation style before they record.

Key outcomes:

- Export aspect ratio presets such as 16:9, 9:16, and 1:1
- Background presets such as clean fill, gradient, framed, or padded canvas
- Cursor style presets
- Focus style presets
- Team or brand presets for colors and framing

This phase should remain preset-driven, not timeline-driven.

The user should choose a recording mode or presentation template, not edit individual shots after the fact.

Success signals:

- High usage of presets
- Faster time from recording to sharing
- Better consistency across repeated team recordings

## Phase 4: Professional Workflow Outputs

Goal: serve users who will still finish in professional tools, without turning Cursorful into one.

Key outcomes:

- High-quality source export
- Raw recording export plus processed export
- Interaction metadata export for clicks, cursor trail, and focus events
- Structured output that is easier to hand off downstream
- Optional separate overlays or supporting data for advanced workflows

This phase matters because "no editing" is only credible if the product still respects professional production pipelines.

Success signals:

- Professional users adopt Cursorful as their capture step
- Teams reuse exported source material in downstream editing workflows

## Version Direction

- v0.4: stabilize recording and unify core flows across current entry points
- v0.5: connect auto-zoom logic to actual preview and export behavior
- v0.6: ship recording presets for aspect ratio, focus style, background, and cursor treatment
- v0.7: improve export quality and add metadata-oriented output for professional workflows
- v1.0: complete the "automatic presentation recorder" positioning with polished auto-focus behavior and dependable export

## Strategic Risks

- Building editing features will dilute focus and slow down the core product advantage.
- If auto-focus feels noisy or wrong, the product loses its main differentiator.
- If export quality is unreliable, users will fall back to generic recorders immediately.
- If templates become too complicated, the product will recreate editing complexity in a different form.

## Near-Term Priorities

1. Strengthen recording reliability.
2. Make automatic focus visible and trustworthy.
3. Turn presets into the main customization layer.
4. Improve export quality and downstream compatibility.

## Positioning Summary

Cursorful should be built as an automatic presentation recorder for demos, walkthroughs, and bug reproductions.

It should help users create clearer recordings without becoming an editor, and it should produce better source material for professionals who prefer to finish elsewhere.
