// Mock data until there is a backend. Content and shapes follow the Figma screens.

export type Role = "member" | "koach" | "prokoach";

const photos = {
  aleksandar: "1578924608828-79a71150f711",
  marija: "1580489944761-15a19d654956",
  tibere: "1534528741775-53994a69daeb",
  alphonso: "1522529599102-193c0d76b5b6",
  kim: "1589525231707-f2de2428f59c",
  rajko: "1506794778202-cad84cf45f1d",
  paityn: "1786677772080-f908094ea342",
  stacey: "1516224498413-84ecf3a1e7fd",
  mia: "1632765854612-9b02b6ec2b15",
  lena: "1692197174597-1d85555c9b33",
  bike1: "1530143584546-02191bc84eb5",
  bike2: "1506686798560-b3217e54b634",
  band: "1518609571773-39b7d303a87b",
  tracker: "1762768752302-8b7a2a04b68e",
  coach: "1434847868581-86e8a2b8e7a3",
  gym: "1541534741688-6078c6bfb5c5",
  yoga: "1544367567-0f2fcb009e0b",
  swim: "1438029071396-1e831a7fa6d8",
  ropes: "1599058917212-d750089bc07e",
  tennis: "1510697963685-53101e615777",
  hiit: "1571019613454-1cb2f99b2d8b",
  football: "1579952363873-27f3bade9f55",
  run: "1571008887538-b36bb32f4571",
  gymInterior: "1689877020200-403d8542d95d",
} as const;

export type PhotoKey = keyof typeof photos;

// Free Unsplash photos, cropped by Unsplash's image CDN.
export function photo(key: PhotoKey, w: number, h = w, faces = false) {
  return `https://images.unsplash.com/photo-${photos[key]}?w=${w * 2}&h=${h * 2}&fit=crop${faces ? "&crop=faces" : ""}&q=70&auto=format`;
}

export type Person = {
  id: string;
  name: string;
  role: Role;
  photo: PhotoKey;
  verified?: boolean;
  distanceKm: number;
  rating: number;
  reviews: number;
  followers: number;
  following: number;
  subscribers: number;
  bio: string;
  streaming?: string; // class name when live right now
  real?: boolean; // a signed-up account from the database, not demo data
  avatarUrl?: string | null;
};

export const people: Person[] = [
  {
    id: "aleksandar",
    name: "Aleksandar Stojaković",
    role: "koach",
    photo: "aleksandar",
    distanceKm: 2.5,
    rating: 4.67,
    reviews: 3,
    followers: 325,
    following: 128,
    subscribers: 78,
    bio: "Tennis coach for 10 years. I work with beginners and club players on technique, footwork and match play. Sessions in Belgrade or streamed live.",
  },
  { id: "tibere", name: "Tibere Pey", role: "prokoach", photo: "tibere", verified: true, distanceKm: 1.1, rating: 4.9, reviews: 88, followers: 2140, following: 310, subscribers: 512, bio: "Strength and conditioning coach.", streaming: "Full body HIIT" },
  { id: "marija", name: "Marija Adams", role: "member", photo: "marija", distanceKm: 1.6, rating: 0, reviews: 0, followers: 210, following: 180, subscribers: 0, bio: "Runner and yoga lover.", streaming: "Morning mobility" },
  { id: "alphonso", name: "Alphonso Baptista", role: "koach", photo: "alphonso", distanceKm: 2.5, rating: 4.5, reviews: 12, followers: 890, following: 204, subscribers: 96, bio: "Speed, agility and football skills.", streaming: "Football drills" },
  { id: "rajko", name: "Rajko Orman", role: "koach", photo: "rajko", distanceKm: 2.5, rating: 4.4, reviews: 9, followers: 412, following: 77, subscribers: 31, bio: "Boxing fundamentals and conditioning.", streaming: "Boxing basics" },
  { id: "kim", name: "Kim Press", role: "prokoach", photo: "kim", distanceKm: 2.5, rating: 4.8, reviews: 27, followers: 1530, following: 98, subscribers: 240, bio: "Yoga and pilates teacher.", streaming: "Evening yoga flow" },
  { id: "paityn", name: "Paityn Franci", role: "koach", photo: "paityn", verified: true, distanceKm: 3.2, rating: 4.6, reviews: 15, followers: 640, following: 120, subscribers: 44, bio: "Pilates and core." },
  { id: "stacey", name: "Stacey Smith", role: "member", photo: "stacey", distanceKm: 3.9, rating: 0, reviews: 0, followers: 95, following: 140, subscribers: 0, bio: "" },
  { id: "mia", name: "Mia Vaccaro", role: "member", photo: "mia", distanceKm: 4.4, rating: 0, reviews: 0, followers: 133, following: 201, subscribers: 0, bio: "" },
  { id: "lena", name: "Lena Novak", role: "koach", photo: "lena", distanceKm: 4.8, rating: 4.7, reviews: 21, followers: 720, following: 150, subscribers: 61, bio: "Running coach." },
];

export type Location = { id: string; name: string; followers: number; address: string; meetUp: string; lat: number; lng: number; rating: number; reviews: number; verified?: boolean; real?: boolean };

export const locations: Location[] = [
  { id: "teamfit", name: "TeamFit Gym & Fitness", followers: 396, address: "Knjeginje Zorke 12, Belgrade, Serbia", meetUp: "Meet at reception on the ground floor. Lockers and showers are available, bring a padlock.", lat: 44.8059, lng: 20.4693, rating: 4.2, reviews: 57, verified: true },
  { id: "ada", name: "Ada Ciganlija Courts", followers: 1204, address: "Ada Ciganlija 2, Belgrade, Serbia", meetUp: "Court 4, next to the café. Bring water, shade is limited.", lat: 44.7866, lng: 20.4180, rating: 4.6, reviews: 203 },
  { id: "zen", name: "Zen Studio Vračar", followers: 188, address: "Njegoševa 31, Belgrade, Serbia", meetUp: "Second floor, studio B. Mats are provided.", lat: 44.7985, lng: 20.4760, rating: 4.8, reviews: 34 },
  { id: "kalemegdan", name: "Kalemegdan Outdoor Gym", followers: 512, address: "Kalemegdan Park, Belgrade, Serbia", meetUp: "By the basketball courts at the park entrance.", lat: 44.8225, lng: 20.4510, rating: 4.4, reviews: 88 },
  { id: "usce", name: "Ušće Park Fields", followers: 640, address: "Ušće Park, New Belgrade, Serbia", meetUp: "Main field, next to the bike path.", lat: 44.8160, lng: 20.4380, rating: 4.3, reviews: 61 },
  { id: "tasmajdan", name: "Tašmajdan Pool", followers: 930, address: "Ilije Garašanina 26, Belgrade, Serbia", meetUp: "Outdoor pool entrance, show your booking at the desk.", lat: 44.8075, lng: 20.4740, rating: 4.5, reviews: 140 },
];

export type Session = {
  id: string;
  title: string;
  koachId: string;
  format: "in-person" | "stream";
  pricing: "per-person" | "private";
  price: number;
  day: number; // days from today, so the demo always has upcoming sessions
  start: string;
  end: string;
  ageMin: number;
  indoor: boolean;
  attendees: number;
  capacity: number;
  likes: number;
  rating: number;
  reviews: number;
  image: PhotoKey;
  description: string;
  equipment: string;
  locationId: string;
  real?: boolean;
};

export const sessions: Session[] = [
  { id: "tennis-basics", title: "I will teach you tennis", koachId: "aleksandar", format: "in-person", pricing: "per-person", price: 45, day: 0, start: "09:00", end: "10:00", ageMin: 18, indoor: true, attendees: 42, capacity: 50, likes: 25, rating: 4.2, reviews: 57, image: "tennis", description: "A relaxed group session for new players. We cover grip, ready position and the two main groundstrokes, then finish with short rallies so everyone gets plenty of time on the ball.", equipment: "Tennis shoes and water. Rackets and balls are provided, but bring your own racket if you have one.", locationId: "teamfit" },
  { id: "tennis-stream", title: "Tennis footwork, live", koachId: "aleksandar", format: "stream", pricing: "per-person", price: 15, day: 0, start: "18:00", end: "19:00", ageMin: 12, indoor: true, attendees: 38, capacity: 100, likes: 31, rating: 4.6, reviews: 22, image: "tennis", description: "Split step, recovery and movement patterns you can practise at home. Join from anywhere with a little floor space.", equipment: "Trainers and a few metres of space.", locationId: "teamfit" },
  { id: "tennis-private", title: "Private tennis lesson", koachId: "aleksandar", format: "in-person", pricing: "private", price: 75, day: 1, start: "10:00", end: "11:00", ageMin: 8, indoor: false, attendees: 0, capacity: 1, likes: 14, rating: 4.7, reviews: 22, image: "tennis", description: "One-on-one lesson built around your game. Tell me what you want to work on when you book.", equipment: "Tennis shoes. A racket can be borrowed.", locationId: "ada" },
  { id: "hiit-lunch", title: "Full body HIIT", koachId: "tibere", format: "in-person", pricing: "per-person", price: 20, day: 0, start: "12:15", end: "13:00", ageMin: 16, indoor: true, attendees: 11, capacity: 14, likes: 88, rating: 4.9, reviews: 132, image: "hiit", description: "Fast interval circuit with bodyweight and kettlebells. Every exercise has an easier and a harder option.", equipment: "Training shoes, towel and water.", locationId: "teamfit" },
  { id: "ropes", title: "Battle ropes conditioning", koachId: "tibere", format: "stream", pricing: "per-person", price: 12, day: 2, start: "08:00", end: "08:45", ageMin: 16, indoor: true, attendees: 24, capacity: 60, likes: 54, rating: 4.8, reviews: 40, image: "ropes", description: "Short, intense rope intervals with mobility in between.", equipment: "Battle ropes, or a towel for the home version.", locationId: "teamfit" },
  { id: "football-kids", title: "Kids football skills", koachId: "alphonso", format: "in-person", pricing: "per-person", price: 10, day: 3, start: "17:00", end: "18:00", ageMin: 8, indoor: false, attendees: 9, capacity: 16, likes: 31, rating: 4.5, reviews: 19, image: "football", description: "Dribbling, passing and small-sided games. Parents can watch from the stands.", equipment: "Football boots or trainers, shin pads.", locationId: "ada" },
  { id: "yoga-flow", title: "Evening yoga flow", koachId: "kim", format: "in-person", pricing: "per-person", price: 14, day: 1, start: "19:00", end: "20:15", ageMin: 16, indoor: true, attendees: 7, capacity: 12, likes: 57, rating: 4.8, reviews: 45, image: "yoga", description: "Slow vinyasa flow ending with a long relaxation. Suitable for all levels.", equipment: "Comfortable clothes. Mats are provided.", locationId: "zen" },
  { id: "running-club", title: "Riverside running club", koachId: "lena", format: "in-person", pricing: "per-person", price: 8, day: 2, start: "07:00", end: "08:00", ageMin: 14, indoor: false, attendees: 18, capacity: 30, likes: 40, rating: 4.7, reviews: 33, image: "run", description: "Easy 5 to 8 km group run with drills before and strides after.", equipment: "Running shoes and water.", locationId: "ada" },
];

export type Post = {
  id: string;
  image: PhotoKey;
  likes: number;
  views: number;
  comments: number;
  kind: "photo" | "album" | "video" | "live";
  locked?: boolean;
  // Real posts carry uploaded media and an author; demo posts use a stock photo.
  real?: boolean;
  media?: string[];
  authorId?: string;
  caption?: string;
  createdAt?: string;
};

export const posts: Post[] = [
  { id: "p1", image: "bike1", likes: 0, views: 24, comments: 3, kind: "album" },
  { id: "p2", image: "gym", likes: 12, views: 140, comments: 4, kind: "photo" },
  { id: "p3", image: "bike2", likes: 8, views: 61, comments: 1, kind: "photo" },
  { id: "p4", image: "band", likes: 0, views: 24, comments: 3, kind: "photo" },
  { id: "p5", image: "coach", likes: 33, views: 410, comments: 9, kind: "photo" },
  { id: "p6", image: "tracker", likes: 5, views: 77, comments: 0, kind: "photo" },
  { id: "p7", image: "swim", likes: 0, views: 78, comments: 0, kind: "live", locked: true },
  { id: "p8", image: "ropes", likes: 0, views: 24, comments: 3, kind: "video", locked: true },
  { id: "p9", image: "yoga", likes: 41, views: 302, comments: 6, kind: "album" },
  { id: "p10", image: "run", likes: 17, views: 120, comments: 2, kind: "photo" },
  { id: "p11", image: "football", likes: 22, views: 198, comments: 5, kind: "photo" },
];

// Sample people, sessions, posts and places fill the screens until real ones exist.
// Set NEXT_PUBLIC_SHOW_SAMPLES=false to show only real content.
export const showSamples = process.env.NEXT_PUBLIC_SHOW_SAMPLES !== "false";
export const withSamples = <T extends { real?: boolean }>(list: T[]) => (showSamples ? list : list.filter((x) => x.real));

export const getPerson = (id: string) => people.find((p) => p.id === id);
export const getSession = (id: string) => sessions.find((s) => s.id === id);
export const getPost = (id: string) => posts.find((p) => p.id === id);
export const getLocation = (id: string) => locations.find((l) => l.id === id);

// The signed-in user, until there is real authentication.
export const currentUserId = "aleksandar";

export const roleLabel: Record<Role, string> = { member: "Member", koach: "Koach", prokoach: "ProKoach" };

export const formatPrice = (n: number) => `$${n % 1 ? n.toFixed(2) : n}`;
export const formatPriceLong = (n: number) => `$${n.toFixed(2)}`;

// Call these on the client only: they depend on the visitor's current date.
export function sessionDate(s: Session, today = new Date()) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  d.setDate(d.getDate() + s.day);
  return d;
}

export function formatDate(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

export const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

export function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, "0")}${suffix}` : `${h12}${suffix}`;
}

// Real accounts and sessions from the database are added to the demo lists in the
// browser, so every screen that looks things up by id works with both.
function upsert<T extends { id: string }>(list: T[], item: T) {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) list.push(item);
  else list[i] = item;
}
export const registerPerson = (p: Person) => upsert(people, p);
export const registerSession = (s: Session) => upsert(sessions, s);
export const registerLocation = (l: Location) => upsert(locations, l);
