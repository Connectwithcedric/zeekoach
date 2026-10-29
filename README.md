# ZeeKOACH

Web app for ZeeKOACH, a social platform where people find a Koach near them, book sessions and train together. The layout, icons and colors follow the YouKoach Figma design (now renamed ZeeKOACH): a 1440px frame with three columns (330 | 640 | 330).

## Screens

- **Home**: Explore/Following feed with photo, album, video and live tiles, Koaches near by, popular locations, follow suggestions
- **Sessions**: full filter panel (class type, radius, price, duration, attendees, time, user type, area), a 7-day calendar strip, and the session list with Book buttons
- **Session detail**: the pop-up card from Figma, with tags, date, price, description, equipment and location
- **Profile**: profile card with role strip, stats, bio and socials, plus class cards
- **Booking**: Who's coming (community or external guests), checkout with fees and VAT, payment method, and thank you. This is a demo, so no payment is taken.
- Challenges, Chat, Share & Earn and Wallet are placeholders for now.

Data is mocked in `src/lib/data.ts` until there is a backend. Photos are loaded from Unsplash.

The Figma uses the licensed Gilroy font. The app uses Plus Jakarta Sans as a free stand-in until the font license is sorted.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 and lucide-react icons. The design tokens are in `src/app/globals.css`.
