# Frontend structure

The App Router owns URL routing only. Keep route files in `app/` small and import the corresponding feature page from `features/`.

```text
app/                 Next.js route entries, layouts, loading UI, and global styles
features/            Feature-owned pages, components, services, hooks, and utilities
  academy/
  auth/
  battle/
  chat/
  dashboard/
  friends/
  leaderboard/
  notifications/
  profile/
components/          Shared application shell, navigation, and generic UI
contexts/            Shared state providers
hooks/               Shared context and behavior hooks
lib/                 API client, sockets, and shared domain helpers
data/                Static frontend data
```

Keep feature-specific UI and behavior inside its feature folder. Put code in `components/`, `contexts/`, `hooks/`, or `lib/` only when it is genuinely shared. Route files should not contain feature logic. Prefer `@/` imports for workspace modules.

The dashboard page stays a Server Component for public leaderboard loading; its private profile and streak widgets remain client components because they depend on authenticated browser state.

## Static study notes

HSC Markdown notes live in `public/hsc-notes/`, grouped into folders such as `PHY-1st/`. Add chapter `.md` files inside the appropriate folder; the first Markdown heading supplies the chapter title. Add a new subject by creating its paper folder(s) and adding its Bengali name and stream assignment to `data/notesSubjects.json`. A single folder such as `ICT/` is treated as the first paper; numbered folders such as `ICT-1st/` and `ICT-2nd/` are also supported (folder codes are case-insensitive). Then run `npm run catalog:notes` from `frontend/` to regenerate `data/notesCatalog.json`. The UI discovers papers and chapters from that generated catalog, so no page code changes are needed.
