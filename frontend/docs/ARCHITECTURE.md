# Architecture

## Principles

- Keep the rendered product path separate from archived experiments.
- Group code by feature first, then by role inside that feature.
- Use barrel exports at feature boundaries so imports stay stable as files move.
- Keep reusable layout in `src/components/layout`; avoid putting page sections there.
- Keep generated output (`dist`) and dependencies (`node_modules`) out of source decisions.

## Runtime Flow

```text
src/main.tsx
  -> src/app/App.tsx
    -> Header
    -> LandingPage
      -> landing sections
      -> landing widgets
    -> Footer
    -> AssessmentModal
    -> DemoVideoModal
```

`App` owns cross-page UI state such as modal visibility. `LandingPage` owns the ordered page composition. Individual sections remain presentation-focused.

## Import Rules

Prefer aliases for cross-folder imports:

```ts
import { AssessmentModal } from '@/features/assessment';
```

Relative imports are fine only for files that sit in the same small folder, such as a section importing a local helper.

## Legacy Folder

`src/features/landing/legacy` contains previous section experiments that are not rendered by the current app. Keep them there until they are either reintroduced into `LandingPage` or intentionally removed.

## Verification

Run these before handing off UI structure changes:

```bash
npm run build
npm run lint
```
