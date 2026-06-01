# Design: Codec Toolkit

## Route And Naming
- Page file: `app/codec/page.tsx`
- Client file: `app/codec/codec-client.tsx`

## Information Architecture
- Intro panel with mode and character count.
- Workbench with:
  - Mode segmented control.
  - Input editor.
  - Mode actions.
  - Output panel.
  - Facts grid.

## State Model
- `mode: "json" | "url" | "base64" | "jwt"`
- `source: string`
- `manualOutput: string`
- `manualError: string`
- `copyState: "idle" | "copied" | "failed"`

## Implementation Notes
- Keep processing in the browser.
- Use `TextEncoder` and `TextDecoder` for UTF-8 Base64 conversion.
- Do not imply JWT signature verification; this utility only decodes and inspects.
