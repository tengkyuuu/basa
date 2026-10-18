---
name: BasaBridge
description: A readable, spacious interface for practising English reading for meaning.
colors:
  bg: '#f4f6f2'
  surface: '#ffffff'
  ink: '#14212b'
  muted: '#56646e'
  line: '#d9ded6'
  accent: '#0c6b63'
  accent-ink: '#ffffff'
  accent-soft: '#dceeea'
  mark-soft: '#fbefcf'
  good: '#23724a'
  good-soft: '#ddf0e4'
  bad: '#a9322b'
  bad-soft: '#f7e0dd'
  primary-hover: '#09564f'
  input-border: '#87968d'
  answer-hover-border: '#7b9c92'
  high-contrast-bg: '#ffffff'
  high-contrast-ink: '#000000'
  high-contrast-muted: '#222222'
  high-contrast-line: '#515151'
  high-contrast-accent: '#004b44'
  high-contrast-accent-soft: '#e4f1ed'
typography:
  display:
    fontFamily: "'Lexend', 'Atkinson Hyperlegible', system-ui, sans-serif"
    fontSize: 'clamp(2.3rem, 4.4vw, 3.35rem)'
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: '-0.025em'
  headline:
    fontFamily: "'Lexend', 'Atkinson Hyperlegible', system-ui, sans-serif"
    fontSize: 'clamp(2rem, 3.4vw, 2.8rem)'
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: '-0.025em'
  title:
    fontFamily: "'Lexend', 'Atkinson Hyperlegible', system-ui, sans-serif"
    fontSize: '1.3rem'
    fontWeight: 600
    lineHeight: 1.25
  subtitle:
    fontFamily: "'Lexend', 'Atkinson Hyperlegible', system-ui, sans-serif"
    fontSize: '1.05rem'
    fontWeight: 500
    lineHeight: 1.25
  body:
    fontFamily: "'Atkinson Hyperlegible', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: '18px'
    fontWeight: 400
    lineHeight: 1.55
  lead:
    fontFamily: "'Atkinson Hyperlegible', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: '20px'
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "'Atkinson Hyperlegible', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: '16px'
    fontWeight: 700
    lineHeight: 1.55
  small:
    fontFamily: "'Atkinson Hyperlegible', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: '14px'
    fontWeight: 400
    lineHeight: 1.5
  reading:
    fontFamily: "'Atkinson Hyperlegible', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: '1.4rem'
    fontWeight: 400
    lineHeight: 1.75
  practice:
    fontFamily: "'Atkinson Hyperlegible', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: '1.2rem'
    fontWeight: 400
    lineHeight: 1.75
rounded:
  field: '8px'
  control: '10px'
  reading: '12px'
  panel: '16px'
  tag: '20px'
  navigation: '24px'
spacing:
  '4': '4px'
  '8': '8px'
  '12': '12px'
  '14': '14px'
  '16': '16px'
  '20': '20px'
  '24': '24px'
  '28': '28px'
  '30': '30px'
  '32': '32px'
  '40': '40px'
  '44': '44px'
components:
  button-primary:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.accent-ink}'
    rounded: '{rounded.control}'
    padding: '13px 22px'
  button-primary-hover:
    backgroundColor: '{colors.primary-hover}'
  button-secondary:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.control}'
    padding: '13px 22px'
  button-secondary-hover:
    backgroundColor: '{colors.accent-soft}'
  button-danger:
    backgroundColor: '{colors.bad}'
    textColor: '{colors.surface}'
    rounded: '{rounded.control}'
    padding: '13px 22px'
  field:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.field}'
    padding: '10px 12px'
    width: '100%'
  panel:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.panel}'
    padding: '32px'
  navigation-active:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.bg}'
    rounded: '{rounded.navigation}'
    typography: '{typography.label}'
    padding: '9px 15px'
  tag:
    backgroundColor: '{colors.accent-soft}'
    textColor: '{colors.accent}'
    rounded: '{rounded.tag}'
    padding: '5px 12px'
  story-paper:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.reading}'
    typography: '{typography.reading}'
    padding: '36px 40px'
  answer-option:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.reading}'
    padding: '18px 22px'
    width: '100%'
  answer-option-selected:
    backgroundColor: '{colors.accent-soft}'
  segmented-selected:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.accent-ink}'
    rounded: '7px'
    padding: '10px 8px'
  worked-example:
    backgroundColor: '{colors.accent-soft}'
    rounded: '{rounded.reading}'
    padding: '24px'
  practice-passage:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.reading}'
    typography: '{typography.practice}'
    padding: '24px'
  practice-passage-mobile:
    padding: '20px'
---

# Design System: BasaBridge

## Overview

**Creative North Star: "One readable task at a time"**

Preserve the existing design canvas: green-white surfaces, teal actions, dark ink, readable type and generous space. The interface uses direct language and clear borders. Its visual identity comes from typography, spacing and useful state changes, with no decorative imagery.

This document records the implemented system. The visual authority is `design/canvas/project`; the direction contract is `docs/WALKTHROUGH-SURFACE.md`. Token values come from `packages/ui/src/tokens.css` and `apps/web/src/app/globals.css`. Font loading and the active theme come from `apps/web/src/app/layout.tsx`; reading preferences and component behavior come from `reading-app.tsx` and `speech-reader.tsx` in `apps/web/src/components`. This is design documentation, not a release verdict or certification of hosting or live providers.

**Key Characteristics:**

- Readable Lexend headings and Atkinson Hyperlegible body text.
- Teal actions, green-white surfaces and dark ink.
- Flat panels, visible borders and restrained rounding.
- Spacious reading areas and large selectable answers.
- Responsive layouts and explicit focus, selection and feedback states.

## Colors

The light palette pairs muted green backgrounds with dark ink and a strong teal action color. Frontmatter records the active light values, including component literals that supplement the shared tokens.

### Primary

- **Teal accent:** primary actions, links, icons, progress and selected answer borders.
- **Accent ink:** text on solid teal controls.
- **Soft teal:** selected answers, level summaries, tags and secondary-button hover.
- **Deep teal hover:** primary-button hover only.

### Neutral

- **Green-white background:** page canvas and segmented-control track.
- **White surface:** panels, inputs, reading paper and unselected answers.
- **Dark ink:** body text and the active navigation pill.
- **Muted slate:** supporting text and inactive navigation.
- **Soft border:** separators, panel edges and unselected answers.
- **Field border and answer hover border:** stronger outlines for form and selection affordances.

### Feedback

- **Soft amber:** the current reading-ruler line and answer feedback requiring attention.
- **Green and soft green:** success messages and correct-answer feedback.
- **Red and soft red:** errors and destructive actions.

The shared token file also defines dark-mode overrides, plus `mark` and `warn` colors. The current app pins `data-theme="light"`; those alternate or unused values are not an active UI theme specification here. Do not assume the dark palette has been reviewed with the app's literal hover and border colors.

High contrast is a learner-selected accommodation on the application shell. The six high-contrast frontmatter colors override background, ink, muted text, borders, accent and soft accent respectively. Other shared colors and component literals retain their existing values. This accommodation preserves the canvas identity and component structure.

**The Visible State Rule.** Pair status colors with wording, selection controls or icons so meaning does not depend on color alone.

## Typography

Lexend provides headings and the brand. Atkinson Hyperlegible provides body copy, labels and controls. The app loads Lexend weights 500 and 600 and Atkinson weights 400 and 700 locally through Fontsource. Font stacks and the observed hierarchy are normative in the frontmatter; this is a role-based hierarchy, not a generated modular scale.

Use the display role for the welcome heading, headline for page headings, title for section headings and subtitle for smaller section headings. Body paragraphs have a maximum width of 68 characters. Heading text balances across lines. Navigation uses the label role; supporting details use small text.

Reading text responds to learner settings: small (1.15rem), normal (1.4rem) and large (1.65rem), with normal leading (1.75) or wide leading (2.1). The settings preview uses these same values. At the mobile breakpoint, body text becomes 17px, lead text 18px and navigation 14px; the welcome heading becomes 2.3rem.

Short practice passages and review passage previews use the practice role. Word-practice entries share its text size. This adds a compact practice step without replacing the learner-controlled story sizes.

**The Reading Preference Rule.** Preserve the learner's text size, spacing and reading ruler in story presentation. Keep English learning content marked as English when the surrounding interface uses Filipino.

## Layout

The application is a vertical shell with a compact header, centered main area and footer. The main area's width is capped at 1120px with padding of 54px 40px 72px. Reading reduces the main top padding to 32px. Paragraphs remain narrower than their container. Reading uses a centered maximum width of 760px; supporting narrow pages use 730px and focused panels 700px.

Desktop home uses a broad main column and narrower supporting column, with a 64px column gap and 56px row gap. The welcome layout uses two columns with a 72px gap. Forms use a vertical 20px gap; answer choices use a 12px gap. Repeated spacing values in the frontmatter are extracted CSS values, not an existing custom-property spacing API.

At 850px and below, the header wraps, navigation takes its own row and column gaps narrow. At 640px and below, home and welcome become single-column layouts, main padding becomes 32px 20px 48px, and grouped actions stack. Story paper and result panels reduce to 24px padding. Tables scroll horizontally when needed. Preserve wrapping for longer Filipino wording and avoid fixed-height copy containers.

Lesson and review material lists use flat divided rows with 24px vertical padding and a 24px gap between content and action. Row content is capped at 65ch. At 640px and below, these rows stack with a 16px gap. Lesson workspace paragraphs and sections are capped at 70ch; the single material inspector is capped at 76ch. Worked examples and practice passages have 24px vertical margins, with 24px internal padding reduced to 20px at this breakpoint.

## Elevation & Depth

The implementation uses no box shadows. Depth comes from white panels over the green-white background, soft semantic fills, and explicit borders. There are no blur or floating-glass effects. The focus indicator is an outline, not elevation: 3px solid accent with a 4px offset.

## Shapes

Use modest rounded rectangles for fields, controls, reading paper and panels. Navigation and tags use pill-like corners; progress results and the reading symbol use circles. General panels have a 1px border. Answer options have a stronger 2px border and a minimum height of 68px. Input controls have a minimum height of 48px and primary, secondary and danger buttons have a minimum height of 52px.

## Components

### Buttons

Primary buttons are solid teal, secondary buttons are white with a soft border, and danger buttons use the error color. All share the control radius, bold body type, a 1.4 line height and generous padding. Hover changes the primary background to deep teal and secondary background to soft teal. Danger buttons have no separate hover color in the current implementation. Disabled buttons use 0.55 opacity and a not-allowed cursor. Text actions use an underlined teal treatment, with red for destructive text actions.

Background transitions last 140ms with ease-out. The loading spinner rotates in 900ms with linear easing. Reduced-motion preferences disable animations and transitions and replace smooth scrolling with automatic scrolling. Do not add decorative motion to reading tasks.

### Inputs and segmented controls

Text inputs use a white surface, a stronger border, rounded corners and a visible text label above. Inputs inherit body type and use a teal caret. Select controls use soft teal fill, a teal border and a teal arrow. Their hover state returns to white. Where native customizable selects are supported, picker menus use a white surface, a soft border and the reading radius; options use the field radius, with teal text and soft teal fill for hover, focus and selection. Keep the selected checkmark and visible focus. Other browsers retain the native picker with the branded closed control. Preserve native labels, keyboard selection and form behavior.

Segmented controls sit on a page-colored track with 4px padding and gaps; the pressed choice becomes solid teal with accent ink. Language choices instead use a soft teal selected state. Native radio and checkbox controls retain teal accent coloring.

### Navigation and tags

Navigation wraps across available space. The current page uses a dark-ink pill with page-background text and `aria-current="page"`. Other links gain a soft teal fill and teal text on hover. Tags use soft teal fill, teal bold text and rounded ends; the reading metadata context supplies their 14px type.

### Panels and reading paper

General panels use white, a soft border and the panel radius. Level summaries and result summaries use soft teal. Reading paper uses its own smaller radius, learner-controlled type and spacious padding. With the ruler enabled, each sentence occupies a block and the active line receives a soft amber fill. Keep the story hidden while the learner answers questions.

Reading sessions show the actual Read, Answer and Results sequence above the passage. Use a three-column ordered list, restrained dividers and numbered circles; the current step has solid teal fill and completed steps use a checkmark. The main Continue to questions action follows the passage immediately, with a short explanation that the story will be hidden. The action and explanation stack on narrow screens. There is no global preview banner.

### Answer choices and feedback

Answer options are large, full-width controls with a visible native input or order marker. A selected choice adds a teal border and soft teal fill. Correct feedback uses soft green, other feedback uses soft amber, and explanatory text accompanies both. Progress uses a thin teal bar over a border-colored track. Results use circles with visible fill and symbols, plus written counts.

### Speech controls and messages

The optional read-aloud area follows the main questions action in a native disclosure, separated with borders and spacing. It opens automatically when microphone consent or an attempt already exists. Prevent closing it during recording or analysis. It reuses existing buttons, checkbox rows, details, error messages and text statuses. Starting, recording and analysis states have explicit labels; recording time appears as a status. Word-level results use a disclosure and textual outcome labels. No separate speech-themed visual system is introduced.

Optional browser read-aloud uses an underlined text action that switches to a stop action while speaking. A small status line appears underneath when a matching voice is unavailable or speech fails. The wrapper wraps with an 8px gap; the status occupies a full line. The source component is `SpeakButton` in `spoken-text.tsx`.

### Lessons and review materials

Lesson lists and review material lists reuse secondary action buttons and flat bottom borders. Worked examples use soft teal and the reading radius; practice passages use a white surface, a 1px border and the same radius. Practice questions reuse the existing large answer choices and textual feedback.

The review workspace has a labeled search field matching material ID or title, eight items per page, previous and next buttons and a page status. Opening a material replaces the list with one inspector and moves focus to its heading. A text action returns to the list. Guardian requests use flat divided sections; long reference codes wrap. These patterns extend the existing canvas system.

### Accessibility states

Interactive elements share the accent focus outline. A skip link appears on keyboard focus. Page headings receive programmatic focus after navigation without a decorative outline. Busy states, errors and success messages use the appropriate status or alert semantics. Preserve these behaviors alongside the visual styles.

## Do's and Don'ts

### Do:

- **Do** preserve the canvas's teal, green-white, dark-ink identity and readable font pairing.
- **Do** reuse semantic colors and existing component states.
- **Do** retain visible keyboard focus, native selection controls and textual feedback.
- **Do** preserve reading preferences and allow translated copy to wrap.
- **Do** route interface copy through the English and Filipino catalogs with simple and standard wording.
- **Do** let empty progress screens reflect real activity.

### Don't:

- **Don't** replace the established identity with decorative imagery, shadows or ornamental motion.
- **Don't** communicate selection, success or error through color alone.
- **Don't** show the story while the learner answers questions.
- **Don't** invent learner activity to fill a layout.
- **Don't** treat documented styles as proof of deployment, provider behavior or release readiness.
