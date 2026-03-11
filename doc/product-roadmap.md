# Cursorful Product Roadmap

## Product Role

Cursorful should not be positioned as a screen recorder plus editor.

It should be positioned as a browser-first recorder for product demos and bug reproduction:

- It helps users record software workflows that already feel directed.
- It reduces the amount of manual post-processing needed after recording.
- It produces source material that is either ready to share immediately or much easier to hand off to professional editors.

In one sentence:

> Cursorful is not meant to help users edit videos. It is meant to help them record software workflows more clearly from the start.

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
- Be opinionated about product demos and bug reproduction.
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

- Users can explain a software workflow more clearly without learning video editing.
- Teams can produce product demos and bug reports that are easier to understand.
- Professional creators can start from footage that already contains clearer focus cues and motion language.

## Differentiation

Cursorful should not try to win by being a general-purpose recorder.

It should win by being better at software explanation.

The differentiation is:

- It is focused on product demos, walkthroughs, and bug reproduction rather than general recording.
- It emphasizes the key action during capture instead of relying on post-production editing.
- It is built around click intent, cursor movement, and focus guidance rather than generic recording controls.
- It produces source material that is useful both for instant sharing and for professional downstream editing.

## Roadmap

## Phase 1: Reliable Capture

Goal: make software workflow recording dependable enough that users trust the tool for real demos and bug reports.

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

## Phase 2: Workflow Focus

Goal: make product demos and bug reproductions easier to follow without manual editing.

Key outcomes:

- Auto-zoom based on click clusters
- Cursor-follow focus mode
- Smooth transitions between focus states
- Click emphasis effects
- Noise reduction for meaningless cursor motion
- Better focus logic for software workflows with clear action emphasis

This is the product's core differentiator.

Users should feel that the product is actively helping them explain what just happened on screen and where the viewer should look next.

Success signals:

- Users keep the default auto-focus behavior instead of turning it off
- Product demos are easier to follow without manual editing
- Bug reports are easier to understand on first watch
- Repeat usage increases for demos and bug reports

## Phase 3: Demo Presets

Goal: let users choose a recording mode that matches the software workflow they need to explain.

Key outcomes:

- Recording presets for product walkthroughs
- Recording presets for bug reproduction
- Export aspect ratio presets such as 16:9, 9:16, and 1:1
- Cursor treatment presets
- Focus behavior presets
- Simple background and framing presets that support clearer viewing

This phase should remain preset-driven, not timeline-driven.

The user should choose a recording mode before capture, not edit individual shots after the fact.

Success signals:

- High usage of presets
- Faster time from recording to sharing
- Better consistency across repeated demo and bug-report recordings

## Phase 4: Handoff Outputs

Goal: produce outputs that are easy to share immediately or hand off to professional tools without turning Cursorful into an editor.

Key outcomes:

- High-quality source export
- Raw recording export plus processed export
- Interaction metadata export for clicks, cursor trail, and focus events
- Structured output that is easier to hand off downstream
- Optional separate overlays or supporting data for advanced workflows

This phase matters because "no editing" is only credible if the product still gives users good source material and clean downstream handoff.

Success signals:

- Professional users adopt Cursorful as their capture step
- Teams reuse exported source material in downstream editing workflows

## Version Direction

- v0.4: stabilize recording and unify core flows across current entry points
- v0.5: connect auto-zoom logic to actual preview and export behavior for demos and bug reports
- v0.6: ship demo-focused presets for aspect ratio, focus style, cursor treatment, and framing
- v0.7: improve export quality and add metadata-oriented output for downstream workflows
- v1.0: complete the "product demo and bug reproduction recorder" positioning with polished workflow focus and dependable export

## Strategic Risks

- Building editing features will dilute focus and slow down the core product advantage.
- If auto-focus feels noisy or wrong, the product loses its main differentiator.
- If export quality is unreliable, users will fall back to generic recorders immediately.
- If templates become too complicated, the product will recreate editing complexity in a different form.

## Near-Term Priorities

1. Strengthen recording reliability.
2. Make automatic focus visible, trustworthy, and useful for software workflows.
3. Turn presets into scenario-based recording modes.
4. Improve export quality and downstream compatibility.

## Positioning Summary

Cursorful should be built as a browser-first recorder for product demos and bug reproduction, with automatic focus that makes software workflows easier to follow.

It should help users create clearer recordings without becoming an editor, and it should produce better source material for professionals who prefer to finish elsewhere.
