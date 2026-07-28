# Astera Frontend

Astera is a Vite + React + TypeScript landing experience for an AI investment advisor product.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Source Layout

```text
src/
  app/                    Application shell and global state wiring
  assets/
    images/               Production source images used by the app
    legacy/               Template or unused visual assets kept for reference
  components/
    layout/               Shared layout components such as Header and Footer
  features/
    assessment/           Assessment modal feature
    demo-video/           Demo video modal feature
    landing/
      sections/           Active landing page sections
      widgets/            Landing-specific UI widgets
      legacy/             Older landing experiments not rendered by App
  styles/                 Global styles and archived template styles
  types/
    vendor/               Local declarations for third-party packages
```

Use the `@/` alias for imports from `src`:

```ts
import { Header } from '@/components/layout';
import { LandingPage } from '@/features/landing';
```

More detail: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).
