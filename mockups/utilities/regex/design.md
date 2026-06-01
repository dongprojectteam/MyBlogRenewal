# Design: Regex Tester

## Route And Naming
- Page file: `app/regex/page.tsx`
- Client file: `app/regex/regex-client.tsx`

## Information Architecture
- Intro panel with flags and match count.
- Workbench with:
  - Pattern input.
  - Flag checkboxes.
  - Test text editor.
  - Replacement input.
  - Highlight preview.
  - Replacement output.
  - Match cards.

## State Model
- `pattern: string`
- `flags: Record<RegexFlag, boolean>`
- `text: string`
- `replacement: string`
- `copyState: "idle" | "copied" | "failed"`

## Implementation Notes
- Use native JavaScript `RegExp`.
- Keep a match cap for responsiveness.
- Show errors as text notices.
