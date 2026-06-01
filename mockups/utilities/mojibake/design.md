# Design: Korean Text Repair

## Route And Naming
- Page file: `app/mojibake/page.tsx`
- Client file: `app/mojibake/mojibake-client.tsx`
- API route: `app/api/mojibake/repair/route.ts`

## Information Architecture
- Intro panel with status and character count.
- Input panel with repair, sample, and clear actions.
- Processing note below the input.
- Candidate panel with ranked cards and copy/use actions.

## State Model
- `text: string`
- `candidates: RepairCandidate[]`
- `status: "idle" | "loading" | "ready" | "error"`
- `message: string`
- `copyId: string | null`

## Implementation Notes
- Keep the max length constant aligned between client and server.
- Server route should reject oversized input instead of silently truncating.
- Candidate labels should describe the attempted transform.
