# Discussion Group Mode design QA

Final result: passed

Scope: shared Group Mode layout across all ten discussion units.
Reference: /var/folders/w0/_dtrl1sj5qd91whwz3sw82kr0000gn/T/codex-clipboard-b834e212-42fc-477e-9cb1-01cfe8c0b990.png (1672 × 941).
Desktop capture: /tmp/discussion-group-desktop.png (1672 × 941, Round 1).
Mobile capture: /tmp/discussion-group-mobile.png (390 × 844 viewport, Round 3).

The desktop screenshot was compared with the reference at matching dimensions. The question now precedes the role cards and has the dominant type size. Category and conversation sit on the left of the header; round and phase sit on the right. Secondary session controls use quiet text buttons. Question borders and shadows are reduced. Existing Karla and Atkinson Hyperlegible fonts and unit accent variables are retained. No new image assets are needed.

Intentional differences: keep the user's simple Student # / ASKS / ANSWERS wording, existing Answered action, existing session controls, and existing question bank. Omit the reference's YOU marker and duplicated round labels. Question content varies because the game randomly selects prompts.

Verified Round 1, Round 2 follow-up with expanded hints, and Round 3 in the browser. Mobile Round 3 has no horizontal overflow (390px content width at a 390px viewport). Secondary actions retain 48px minimum height and visible keyboard focus. Automatic focus on the conversation no longer draws a competing outline around the whole panel. All 41 existing gameplay/data tests pass, including all ten units and balanced participation for 2–8 students. Asset URLs are versioned to prevent stale shared styles/scripts after refresh. No unresolved material issues.
