# ZeeKOACH

Web app for ZeeKOACH, a social platform where people find a Koach near them, book sessions and train together. Built from the YouKoach Figma design (now renamed ZeeKOACH).

## What's in this first build

- **Home**: sessions this week, Koaches near you, popular locations, follow suggestions
- **Sessions**: list with sport, format and price filters, plus an empty state
- **Session detail**: format, time, spots left, what to bring, location and meet-up notes
- **Profile**: stats, bio, sports and the Koach's sessions
- **Booking**: who's coming, payment method, confirm and done. This is a demo, so no payment is taken.

Data is mocked in `src/lib/data.ts` until there is a backend. Challenges, Chat and Wallet are placeholders for now.

Some changes from the Figma, taken from the design review:
- The navigation has text labels and shows which page you're on. On phones it becomes a bottom tab bar.
- The Koach and ProKoach roles are shown as text badges, not only as ring color.
- Secondary text and the yellow prices use darker shades so they're easier to read.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 and lucide-react icons. The design tokens are in `src/app/globals.css`.
