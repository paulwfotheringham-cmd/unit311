# Unit311

Production clone of the BCN Drone Center internal operations platform.

- **Production:** https://unit311.vercel.app
- **Internal dashboard:** https://unit311.vercel.app/internaldashboard

Built with Next.js 16, React 19, TypeScript, Tailwind CSS v4, and Supabase.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Environment

Copy `.env.example` to `.env.local` and set Supabase credentials plus any integration keys you need locally.

## Deploy

This project is linked to the Vercel project `unit311` and GitHub repo `paulwfotheringham-cmd/unit311`.

**Production URL:** https://unit311.vercel.app

Pushes to `main` deploy automatically via Vercel Git integration. Manual deploy:

```bash
npx vercel link --project unit311
npx vercel --prod
```

## Related

- BCN Drone Center: https://barcelonadronecenter.vercel.app
- Source lineage: cloned from `barcelonadronecenter`
