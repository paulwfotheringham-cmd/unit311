# Unit311

Centralised platform to **accelerate and run your business** — company setup, operations, finance, logistics, and client delivery in one workspace.

- **Production:** https://unit311.vercel.app
- **Unit311 Central (login):** https://unit311central.com/login
- **Internal dashboard:** https://unit311central.com/internaldashboard
- **GitHub:** https://github.com/paulwfotheringham-cmd/unit311

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

Pushes to `main` deploy automatically via Vercel Git integration.

```bash
npx vercel link --project unit311
npx vercel --prod
```
