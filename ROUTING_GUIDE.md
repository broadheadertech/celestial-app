# App Routing Quick Guide

This project uses Next.js App Router (`app/` directory). Routes are file‑system based: the folder path maps to the URL path. Keep routes short, focused, and colocate UI, data handlers, and metadata inside the same route folder when practical.

## Basics

- Page route: create `app/<segment>/page.tsx`
  - URL becomes `/<segment>`
  - Example: `app/admin/users/page.tsx` → `/admin/users`

- Nested routes: nest folders
  - `app/client/dashboard/page.tsx` → `/client/dashboard`

- Layouts: `app/<segment>/layout.tsx`
  - Wraps all pages under that segment
  - Use for shared shells, nav, or data providers

- API routes: `app/api/<path>/route.ts`
  - Export HTTP handlers: `GET`, `POST`, etc.
  - Example: `app/api/auth/[...nextauth]/route.ts` handles next-auth

## Dynamic Routes

- Dynamic segment: `[id]`
  - `app/admin/users/[userId]/page.tsx` → `/admin/users/123`
  - Access params: `({ params }: { params: { userId: string } })`

- Catch‑all: `[...slug]`
  - `app/docs/[...slug]/page.tsx` matches `/docs/a/b/c`

## Adding a New Page Route

1. Create a folder under `app/` for your path
   - Example: `app/reports`
2. Add `page.tsx`
   - Minimal template:
   ```tsx
   // app/reports/page.tsx
   export default function ReportsPage() {
     return <div className="p-6">Reports</div>;
   }
   ```
3. (Optional) Add `layout.tsx` to provide a section shell
   ```tsx
   // app/reports/layout.tsx
   export default function ReportsLayout({ children }: { children: React.ReactNode }) {
     return <section className="max-w-6xl mx-auto">{children}</section>;
   }
   ```
4. Navigate to `/reports`

## Adding a Dynamic Route

1. Create a dynamic segment folder
   - `app/reports/[reportId]/page.tsx`
2. Read route params inside the component
   ```tsx
   export default function ReportPage({ params }: { params: { reportId: string } }) {
     const { reportId } = params;
     return <div className="p-6">Report: {reportId}</div>;
   }
   ```

## API Routes (Server only)

1. Create `app/api/<path>/route.ts`
2. Export the handlers you need
   ```ts
   // app/api/reports/route.ts
   import { NextResponse } from 'next/server';

   export async function GET() {
     return NextResponse.json({ ok: true });
   }

   export async function POST(req: Request) {
     const body = await req.json();
     return NextResponse.json({ received: body });
   }
   ```

## Middleware

- `middleware.ts` runs before routes and can gate sections (auth, redirects).
- Scope it with `config.matcher` if needed.

## Conventions

- Keep route components small; move helpers to `components/` or `lib/`.
- Use `loading.tsx` for route‑level skeletons and `error.tsx` for error boundaries.
- For client components, add `'use client'` at the top.
- Co-locate images under `public/` and import with `next/image` for performance.

That’s it—create a folder, add `page.tsx`, and you have a route.

