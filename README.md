# AutoVahan — India's Premium Car Showroom

A stunning, production-ready web application showcasing **55+ authentic Indian market cars** with accurate 2024-25 pricing, detailed specifications, and an exceptional user experience.

Built for **Vercel (Frontend)** + **Railway (Backend)** + **Supabase (Database)**.

## ✨ Highlights

- **55+ real Indian cars** (Maruti, Tata, Mahindra, Hyundai, Kia, Toyota, Honda, MG, Skoda, VW, BYD, BMW, Mercedes, Audi, Jeep, Renault, Citroën)
- Beautiful dark luxury automotive design with buttery animations
- Advanced multi-filter system (brand, body type, fuel, price range)
- Stunning detail modal with specs, features, variants & instant inquiry form
- Compare up to 3 cars side-by-side
- Favorites / Wishlist (persisted locally)
- Fully functional backend + Supabase integration
- Mobile-first, blazing fast, and production ready

## Project Structure

```
Car/
├── fn/                  # Frontend (React + Vite + TypeScript + Tailwind)
│   ├── src/
│   │   ├── App.tsx      # The complete outstanding UI
│   │   ├── lib/carsData.ts
│   │   └── ...
├── bn/                  # Backend (Express + TypeScript)
│   ├── src/
│   │   ├── index.ts     # Full REST API
│   │   └── seed.ts      # Database seeder
│   └── supabase-schema.sql
└── README.md
```

## Quick Start (Local Development)

### 1. Supabase Setup (Required)

1. Create a new Supabase project at https://supabase.com
2. Go to **SQL Editor** → paste and run the entire contents of `bn/supabase-schema.sql`
3. Go to **Settings → API** and copy:
   - Project URL
   - `service_role` key (keep this secret)

### 2. Backend (Railway)

```bash
cd bn
cp .env.example .env
# Edit .env with your Supabase credentials
npm install
npm run dev          # runs on http://localhost:4000
```

Seed the database:

```bash
npm run seed
```

### 3. Frontend (Vercel)

```bash
cd fn
npm install
npm run dev          # http://localhost:5173
```

The frontend proxies `/api/*` to the backend automatically in development.

### 4. Deploy

- **Frontend**: Connect `fn/` folder to Vercel. Add env var `VITE_API_URL` (your Railway URL) if needed.
- **Backend**: Connect `bn/` folder to Railway. Add the same Supabase environment variables.
- Set proper CORS `FRONTEND_URL` in backend production.

## Environment Variables

**Backend (bn/.env)**
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
PORT=4000
FRONTEND_URL=https://your-vercel-app.vercel.app
```

## Tech Stack

**Frontend**
- React 18 + TypeScript + Vite
- TanStack Query, Framer Motion, Zustand, Sonner (toasts)
- Tailwind CSS + custom luxury design system

**Backend**
- Express + TypeScript
- Supabase JS (service role)
- Zod validation

**Database**
- PostgreSQL via Supabase (with RLS policies)
- Proper indexes + full-text search ready

## Images

All car images use high-quality Unsplash + Picsum sources for immediate visual impact. For production, upload your own curated photography to Supabase Storage and update the `image_url` + `images` fields.

## Next Steps / Polish Ideas

- Add Supabase Auth + user accounts
- Real payment integration (test drive booking fees)
- Admin panel to manage cars
- Virtual 360° views or video embeds
- Dealer locator + EMI calculator

---

Built with ❤️ for the Indian automotive enthusiast.

**Ready to deploy?** Follow the deployment steps above and you will have a world-class car discovery experience live in under 30 minutes.
