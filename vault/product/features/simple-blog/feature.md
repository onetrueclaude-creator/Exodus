# Simple Blog

A minimal read-only blog built with Vite + React.
Displays a hardcoded list of posts. Clicking a post shows its full content.
No backend, no routing library — just React state.

## Tech constraints

- Vite + React (TypeScript)
- Plain CSS modules (no Tailwind, no UI library)
- All post data is a hardcoded array in `src/data/posts.ts`
- Tests use Vitest + React Testing Library

## Post shape

```ts
interface Post {
  id: string;
  title: string;
  date: string;       // "YYYY-MM-DD"
  summary: string;
  body: string;
}
```

## What's in scope

- Post list page (home)
- Post detail view (in-page, no URL change)
- Back button to return to list

## What's out of scope

- Real backend or API
- URL routing
- Comments, tags, search
- Auth
