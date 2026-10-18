# Reading app surface

Mode: Operate. Visual authority: design/canvas/project, especially Main, S2, S8, S11, S14, A4 and I1.

## Direction contract

THESIS: One readable task at a time, with the story hidden during questions and real evidence visible afterward.

OWN-WORLD: Inherit the canvas's green-white surfaces, teal actions, dark ink, Lexend headings and Atkinson Hyperlegible body text. Clear borders, restrained rounding, no decorative imagery.

STORY: Create an account, read, answer, and understand the result. Saved progress starts empty. A parent sees only granted information.

SCOPE: Public hackathon build. Preserve the existing reading flow and extend its visual system with review-gated placement and lessons, fresh story rechecks, word practice, high contrast and optional browser read-aloud. Add a separate team review workspace for authored materials and manual guardian approvals. Under-13 microphones need verified guardian approval plus learner consent. Draft material remains unavailable until real approval. Hosting, educational validity and live provider quality are separate from UI review.

FIRST VIEWPORT: A compact brand header and navigation above a centered working area. Home has a large reading invitation and a narrower level and help column. Questions use a single focused reading column with large selectable answers.

FORM: Existing canvas flow, implemented as responsive application screens. The brief pins the structure and visual system; no concept seed or new visual world is needed.

Reading refinement: show Read, Answer and Results as a real task sequence. Put the next action directly after the passage, before optional read-aloud controls. Remove the global Hackathon preview banner. Keep contextual uncertainty wording with results. Dropdown fields and supported native picker menus inherit teal actions, green-white surfaces, visible focus and the existing rounded scale. Preserve native keyboard interaction and platform fallback.

Pronunciation refinement: optional Azure acoustic feedback extends the existing read-aloud, word-practice, saved-result and explicitly shared parent-analysis surfaces. Use a wrapping summary definition list, flat word rows, expected English words and IPA suggestions. Keep uncertainty visible. Guidance must fit the current task and available actions; Listen appears only with an authorized callback. Misheard flags do not verify a reading or raise scores. Pronunciation never decides comprehension or level movement.

Activation remains explicit: Groq is the default speech provider. Azure needs server configuration, fresh provider-specific learner consent and renewed verified guardian approval for under-13 learners. Missing configuration or a provider failure remains visible without sending audio to another provider. The current review has no Azure key or region and establishes neither live Azure behavior nor accent calibration. See `docs/AZURE-SPEECH.md` and `docs/adr/0010-acoustic-pronunciation-assessment.md` for activation and factual limits.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
