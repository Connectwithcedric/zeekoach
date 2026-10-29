// Mock data until there is a backend. Shapes mirror what the Figma screens show.

export type Role = "user" | "koach" | "prokoach";

export type Person = {
  id: string;
  name: string;
  role: Role;
  city: string;
  distanceKm: number;
  rating: number;
  reviews: number;
  followers: number;
  following: number;
  subscribers: number;
  bio: string;
  sports: string[];
  hue: number; // avatar color until real photos exist
};

export type SessionFormat = "in-person" | "stream";
export type Pricing = "per-person" | "private";

export type Session = {
  id: string;
  title: string;
  sport: string;
  koachId: string;
  format: SessionFormat;
  pricing: Pricing;
  price: number;
  date: string; // ISO date
  start: string;
  end: string;
  ageMin: number;
  indoor: boolean;
  attendees: number;
  capacity: number;
  likes: number;
  rating: number;
  reviews: number;
  description: string;
  equipment: string;
  locationId: string;
};

export type Location = {
  id: string;
  name: string;
  address: string;
  followers: number;
  meetUp: string;
};

export const people: Person[] = [
  {
    id: "aleksandar",
    name: "Aleksandar Stojaković",
    role: "koach",
    city: "Belgrade",
    distanceKm: 2.5,
    rating: 4.67,
    reviews: 3,
    followers: 325,
    following: 128,
    subscribers: 78,
    bio: "Tennis coach for 10 years. I work with beginners and club players on technique, footwork and match play.",
    sports: ["Tennis", "Padel"],
    hue: 222,
  },
  {
    id: "marija",
    name: "Marija Adams",
    role: "prokoach",
    city: "Belgrade",
    distanceKm: 1.2,
    rating: 4.9,
    reviews: 41,
    followers: 2140,
    following: 310,
    subscribers: 512,
    bio: "Certified strength and conditioning coach. Small-group HIIT and mobility sessions, every level welcome.",
    sports: ["HIIT", "Strength", "Mobility"],
    hue: 335,
  },
  {
    id: "alphonso",
    name: "Alphonso Baptista",
    role: "koach",
    city: "Belgrade",
    distanceKm: 3.8,
    rating: 4.5,
    reviews: 12,
    followers: 890,
    following: 204,
    subscribers: 96,
    bio: "Former semi-pro footballer. Speed, agility and ball skills for kids and adults.",
    sports: ["Football", "Speed & agility"],
    hue: 28,
  },
  {
    id: "kim",
    name: "Kim Press",
    role: "prokoach",
    city: "Belgrade",
    distanceKm: 4.1,
    rating: 4.8,
    reviews: 27,
    followers: 1530,
    following: 98,
    subscribers: 240,
    bio: "Yoga and pilates teacher. Calm, precise sessions in the studio or streamed live.",
    sports: ["Yoga", "Pilates"],
    hue: 160,
  },
  {
    id: "rajko",
    name: "Rajko Orman",
    role: "koach",
    city: "Novi Sad",
    distanceKm: 6.3,
    rating: 4.4,
    reviews: 9,
    followers: 412,
    following: 77,
    subscribers: 31,
    bio: "Boxing fundamentals and conditioning. Gloves provided for first sessions.",
    sports: ["Boxing"],
    hue: 0,
  },
];

export const locations: Location[] = [
  {
    id: "teamfit",
    name: "TeamFit Gym & Fitness",
    address: "Knjeginje Zorke 12, Belgrade, Serbia",
    followers: 396,
    meetUp: "Meet at reception on the ground floor. Lockers and showers are available.",
  },
  {
    id: "ada",
    name: "Ada Ciganlija Courts",
    address: "Ada Ciganlija 2, Belgrade, Serbia",
    followers: 1204,
    meetUp: "Court 4, next to the café. Bring water, shade is limited.",
  },
  {
    id: "zen",
    name: "Zen Studio Vračar",
    address: "Njegoševa 31, Belgrade, Serbia",
    followers: 188,
    meetUp: "Second floor, studio B. Mats are provided.",
  },
];

export const sessions: Session[] = [
  {
    id: "tennis-basics",
    title: "Tennis basics: forehand and backhand",
    sport: "Tennis",
    koachId: "aleksandar",
    format: "in-person",
    pricing: "per-person",
    price: 25,
    date: "2026-11-02",
    start: "18:00",
    end: "19:30",
    ageMin: 12,
    indoor: false,
    attendees: 5,
    capacity: 8,
    likes: 25,
    rating: 4.2,
    reviews: 57,
    description:
      "A relaxed group session for new players. We cover grip, ready position and the two main groundstrokes, then finish with short rallies.",
    equipment: "Tennis shoes and water. Rackets and balls are provided.",
    locationId: "ada",
  },
  {
    id: "tennis-private",
    title: "Private tennis lesson",
    sport: "Tennis",
    koachId: "aleksandar",
    format: "in-person",
    pricing: "private",
    price: 45,
    date: "2026-11-03",
    start: "09:00",
    end: "10:00",
    ageMin: 8,
    indoor: true,
    attendees: 0,
    capacity: 1,
    likes: 14,
    rating: 4.7,
    reviews: 22,
    description:
      "One-on-one lesson built around your game. Tell me what you want to work on when you book.",
    equipment: "Tennis shoes. A racket can be borrowed.",
    locationId: "teamfit",
  },
  {
    id: "hiit-lunch",
    title: "Lunchtime HIIT, 45 minutes",
    sport: "HIIT",
    koachId: "marija",
    format: "in-person",
    pricing: "per-person",
    price: 12,
    date: "2026-11-02",
    start: "12:15",
    end: "13:00",
    ageMin: 16,
    indoor: true,
    attendees: 11,
    capacity: 14,
    likes: 88,
    rating: 4.9,
    reviews: 132,
    description: "Fast interval circuit with bodyweight and kettlebells. Every exercise has an easier and a harder option.",
    equipment: "Training shoes, towel and water.",
    locationId: "teamfit",
  },
  {
    id: "mobility-stream",
    title: "Morning mobility (live stream)",
    sport: "Mobility",
    koachId: "marija",
    format: "stream",
    pricing: "per-person",
    price: 6,
    date: "2026-11-04",
    start: "07:30",
    end: "08:00",
    ageMin: 14,
    indoor: true,
    attendees: 38,
    capacity: 100,
    likes: 140,
    rating: 4.8,
    reviews: 64,
    description: "Thirty minutes to loosen hips, shoulders and spine before work. Join from anywhere.",
    equipment: "A mat or a towel.",
    locationId: "zen",
  },
  {
    id: "kids-football",
    title: "Kids football skills (8 to 12)",
    sport: "Football",
    koachId: "alphonso",
    format: "in-person",
    pricing: "per-person",
    price: 10,
    date: "2026-11-05",
    start: "17:00",
    end: "18:00",
    ageMin: 8,
    indoor: false,
    attendees: 9,
    capacity: 16,
    likes: 31,
    rating: 4.5,
    reviews: 19,
    description: "Dribbling, passing and small-sided games. Parents can watch from the stands.",
    equipment: "Football boots or trainers, shin pads.",
    locationId: "ada",
  },
  {
    id: "yoga-flow",
    title: "Evening yoga flow",
    sport: "Yoga",
    koachId: "kim",
    format: "in-person",
    pricing: "per-person",
    price: 14,
    date: "2026-11-03",
    start: "19:00",
    end: "20:15",
    ageMin: 16,
    indoor: true,
    attendees: 7,
    capacity: 12,
    likes: 57,
    rating: 4.8,
    reviews: 45,
    description: "Slow vinyasa flow ending with a long relaxation. Suitable for all levels.",
    equipment: "Comfortable clothes. Mats are provided.",
    locationId: "zen",
  },
  {
    id: "boxing-fundamentals",
    title: "Boxing fundamentals",
    sport: "Boxing",
    koachId: "rajko",
    format: "in-person",
    pricing: "per-person",
    price: 15,
    date: "2026-11-06",
    start: "20:00",
    end: "21:00",
    ageMin: 16,
    indoor: true,
    attendees: 6,
    capacity: 10,
    likes: 22,
    rating: 4.4,
    reviews: 9,
    description: "Stance, guard, jab and cross, then pad work in pairs. No sparring.",
    equipment: "Training shoes and hand wraps. Gloves are provided.",
    locationId: "teamfit",
  },
];

export const getPerson = (id: string) => people.find((p) => p.id === id);
export const getSession = (id: string) => sessions.find((s) => s.id === id);
export const getLocation = (id: string) => locations.find((l) => l.id === id);

// The signed-in user, until there is real authentication.
export const currentUserId = "aleksandar";

export const roleLabel: Record<Role, string> = {
  user: "Member",
  koach: "Koach",
  prokoach: "ProKoach",
};

export function formatPrice(n: number) {
  return `€${n.toFixed(2)}`;
}

export function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
