/**
 * data/demo-photos.ts
 * ====================
 * 24 demo photos across 8 Indian-context friendly themes spread over the last 3 years.
 * Each photo includes rich metadata for client-side fuzzy clustering & scoring.
 */

export interface DemoPhoto {
  id: string;
  src: string;
  title: string;
  date: string; // ISO 8601 format
  place: string;
  people: string[];
  mood: string;
  tags: string[];
  cluster: string;

  // Compatibility aliases for existing UI components
  filename?: string;
  timestamp?: string;
  location_label?: string;
  caption?: string;
  objects?: string[];
  mood_tags?: string[];
  episode_label?: string;
  purpose_tag?: string;
  url?: string;
}

export const DEMO_PHOTOS: DemoPhoto[] = [
  // ─────────────────────────────────────────────────────────────
  // 1. Beach trip (Goa), sunset, friends — (2024, Last year)
  // ─────────────────────────────────────────────────────────────
  {
    id: "beach_01",
    src: "/demo-photos/beach_01.jpg",
    title: "Sunset at Palolem Beach with friends",
    date: "2024-11-14T17:45:00.000Z",
    place: "Palolem Beach, Goa",
    people: ["Rohan", "Priya", "Amit"],
    mood: "Happy and loud",
    tags: ["beach", "sunset", "friends", "ocean", "water", "sand", "goa", "outdoors", "nature"],
    cluster: "Beach days, Goa",
    filename: "beach_01.jpg",
    timestamp: "2024-11-14T17:45:00.000Z",
    location_label: "Palolem Beach, Goa",
    caption: "Sunset at Palolem Beach with friends",
    objects: ["beach", "sunset", "friends", "ocean", "sand"],
    mood_tags: ["happy and loud", "sunset", "beach"],
    episode_label: "Beach days, Goa",
    purpose_tag: "memory",
    url: "/demo-photos/beach_01.jpg",
  },
  {
    id: "beach_02",
    src: "/demo-photos/beach_02.jpg",
    title: "Golden hour at Anjuna beach shack",
    date: "2024-11-15T18:15:00.000Z",
    place: "Anjuna Beach, Goa",
    people: ["Rohan", "Amit"],
    mood: "Calm and quiet",
    tags: ["beach", "sunset", "shack", "ocean", "water", "waves", "goa", "relaxing", "nature"],
    cluster: "Beach days, Goa",
    filename: "beach_02.jpg",
    timestamp: "2024-11-15T18:15:00.000Z",
    location_label: "Anjuna Beach, Goa",
    caption: "Golden hour at Anjuna beach shack",
    objects: ["shack", "ocean", "sunset", "waves"],
    mood_tags: ["calm and quiet", "golden hour"],
    episode_label: "Beach days, Goa",
    purpose_tag: "memory",
    url: "/demo-photos/beach_02.jpg",
  },
  {
    id: "beach_03",
    src: "/demo-photos/beach_03.jpg",
    title: "Evening waves and palm trees in Vagator",
    date: "2024-11-16T18:50:00.000Z",
    place: "Vagator Beach, Goa",
    people: ["Priya", "Amit", "Kunal"],
    mood: "Happy and loud",
    tags: ["beach", "friends", "palms", "sunset", "ocean", "water", "goa", "outdoors"],
    cluster: "Beach days, Goa",
    filename: "beach_03.jpg",
    timestamp: "2024-11-16T18:50:00.000Z",
    location_label: "Vagator Beach, Goa",
    caption: "Evening waves and palm trees in Vagator",
    objects: ["palms", "ocean", "waves", "friends"],
    mood_tags: ["happy and loud", "beach"],
    episode_label: "Beach days, Goa",
    purpose_tag: "memory",
    url: "/demo-photos/beach_03.jpg",
  },

  // ─────────────────────────────────────────────────────────────
  // 2. Birthday party, cake, balloons, indoors — (2026, This year)
  // ─────────────────────────────────────────────────────────────
  {
    id: "bday_01",
    src: "/demo-photos/bday_01.jpg",
    title: "Midnight chocolate cake cutting",
    date: "2026-03-15T21:30:00.000Z",
    place: "Indiranagar, Bangalore",
    people: ["Ananya", "Vikram", "Sneha"],
    mood: "Happy and loud",
    tags: ["birthday", "cake", "candles", "indoors", "party", "celebration", "food", "people"],
    cluster: "Birthday evening",
    filename: "bday_01.jpg",
    timestamp: "2026-03-15T21:30:00.000Z",
    location_label: "Indiranagar, Bangalore",
    caption: "Midnight chocolate cake cutting",
    objects: ["cake", "candles", "party", "balloons"],
    mood_tags: ["happy and loud", "celebration"],
    episode_label: "Birthday evening",
    purpose_tag: "memory",
    url: "/demo-photos/bday_01.jpg",
  },
  {
    id: "bday_02",
    src: "/demo-photos/bday_02.jpg",
    title: "Golden balloons and birthday decorations",
    date: "2026-03-15T22:00:00.000Z",
    place: "Indiranagar, Bangalore",
    people: ["Ananya", "Sneha"],
    mood: "Busy and chaotic",
    tags: ["balloons", "birthday", "decorations", "party", "indoors", "people", "special clothes"],
    cluster: "Birthday evening",
    filename: "bday_02.jpg",
    timestamp: "2026-03-15T22:00:00.000Z",
    location_label: "Indiranagar, Bangalore",
    caption: "Golden balloons and birthday decorations",
    objects: ["balloons", "party", "decorations"],
    mood_tags: ["busy and chaotic", "celebration"],
    episode_label: "Birthday evening",
    purpose_tag: "memory",
    url: "/demo-photos/bday_02.jpg",
  },
  {
    id: "bday_03",
    src: "/demo-photos/bday_03.jpg",
    title: "Friends group toast in the living room",
    date: "2026-03-15T22:45:00.000Z",
    place: "Indiranagar, Bangalore",
    people: ["Ananya", "Vikram", "Sneha", "Karan"],
    mood: "Happy and loud",
    tags: ["friends", "birthday", "living room", "indoors", "party", "people"],
    cluster: "Birthday evening",
    filename: "bday_03.jpg",
    timestamp: "2026-03-15T22:45:00.000Z",
    location_label: "Indiranagar, Bangalore",
    caption: "Friends group toast in the living room",
    objects: ["friends", "toast", "living room"],
    mood_tags: ["happy and loud", "party"],
    episode_label: "Birthday evening",
    purpose_tag: "memory",
    url: "/demo-photos/bday_03.jpg",
  },

  // ─────────────────────────────────────────────────────────────
  // 3. Diwali, diyas, lights, family — (2023, A while ago)
  // ─────────────────────────────────────────────────────────────
  {
    id: "diwali_01",
    src: "/demo-photos/diwali_01.jpg",
    title: "Lighting clay diyas on the verandah",
    date: "2023-11-12T19:15:00.000Z",
    place: "Family Home, Jaipur",
    people: ["Dadi", "Mummy", "Aarav"],
    mood: "Calm and quiet",
    tags: ["diwali", "diyas", "lights", "family", "oil lamps", "indoors", "special clothes"],
    cluster: "Diwali lights & family",
    filename: "diwali_01.jpg",
    timestamp: "2023-11-12T19:15:00.000Z",
    location_label: "Family Home, Jaipur",
    caption: "Lighting clay diyas on the verandah",
    objects: ["diyas", "lights", "family", "lamps"],
    mood_tags: ["calm and quiet", "festival"],
    episode_label: "Diwali lights & family",
    purpose_tag: "memory",
    url: "/demo-photos/diwali_01.jpg",
  },
  {
    id: "diwali_02",
    src: "/demo-photos/diwali_02.jpg",
    title: "Fairy lights and colourful flower rangoli",
    date: "2023-11-12T20:00:00.000Z",
    place: "Family Home, Jaipur",
    people: ["Mummy", "Aarav"],
    mood: "Calm and quiet",
    tags: ["diwali", "lights", "rangoli", "flowers", "fairy lights", "indoors", "family"],
    cluster: "Diwali lights & family",
    filename: "diwali_02.jpg",
    timestamp: "2023-11-12T20:00:00.000Z",
    location_label: "Family Home, Jaipur",
    caption: "Fairy lights and colourful flower rangoli",
    objects: ["rangoli", "fairy lights", "flowers"],
    mood_tags: ["calm and quiet", "diwali"],
    episode_label: "Diwali lights & family",
    purpose_tag: "memory",
    url: "/demo-photos/diwali_02.jpg",
  },
  {
    id: "diwali_03",
    src: "/demo-photos/diwali_03.jpg",
    title: "Family puja and sparklers in the courtyard",
    date: "2023-11-12T21:10:00.000Z",
    place: "Family Home, Jaipur",
    people: ["Papa", "Mummy", "Dadi", "Aarav"],
    mood: "Happy and loud",
    tags: ["diwali", "family", "sparklers", "lights", "ethnic", "special clothes", "people"],
    cluster: "Diwali lights & family",
    filename: "diwali_03.jpg",
    timestamp: "2023-11-12T21:10:00.000Z",
    location_label: "Family Home, Jaipur",
    caption: "Family puja and sparklers in the courtyard",
    objects: ["sparklers", "family", "ethnic", "lights"],
    mood_tags: ["happy and loud", "diwali"],
    episode_label: "Diwali lights & family",
    purpose_tag: "memory",
    url: "/demo-photos/diwali_03.jpg",
  },

  // ─────────────────────────────────────────────────────────────
  // 4. Mountain trek (Manali), snow, hiking — (2024, Last year)
  // ─────────────────────────────────────────────────────────────
  {
    id: "trek_01",
    src: "/demo-photos/trek_01.jpg",
    title: "Snow peaks panorama at Rohtang Pass",
    date: "2024-01-20T11:00:00.000Z",
    place: "Rohtang Pass, Manali",
    people: ["Kunal", "Tanya"],
    mood: "Calm and quiet",
    tags: ["mountain", "trek", "manali", "snow", "hiking", "nature", "peaks", "water or snow", "outdoors"],
    cluster: "Manali snow trek",
    filename: "trek_01.jpg",
    timestamp: "2024-01-20T11:00:00.000Z",
    location_label: "Rohtang Pass, Manali",
    caption: "Snow peaks panorama at Rohtang Pass",
    objects: ["snow", "mountain", "peaks", "hiking"],
    mood_tags: ["calm and quiet", "snow", "mountain"],
    episode_label: "Manali snow trek",
    purpose_tag: "memory",
    url: "/demo-photos/trek_01.jpg",
  },
  {
    id: "trek_02",
    src: "/demo-photos/trek_02.jpg",
    title: "Hiking through snow-dusted pine trail",
    date: "2024-01-21T13:30:00.000Z",
    place: "Solang Valley, Manali",
    people: ["Kunal"],
    mood: "Calm and quiet",
    tags: ["hiking", "trail", "snow", "trees", "pines", "mountain", "manali", "nature", "water or snow"],
    cluster: "Manali snow trek",
    filename: "trek_02.jpg",
    timestamp: "2024-01-21T13:30:00.000Z",
    location_label: "Solang Valley, Manali",
    caption: "Hiking through snow-dusted pine trail",
    objects: ["trail", "snow", "trees", "hiking"],
    mood_tags: ["calm and quiet", "nature"],
    episode_label: "Manali snow trek",
    purpose_tag: "memory",
    url: "/demo-photos/trek_02.jpg",
  },
  {
    id: "trek_03",
    src: "/demo-photos/trek_03.jpg",
    title: "High-altitude winter camp under clear skies",
    date: "2024-01-22T16:00:00.000Z",
    place: "Hampta Base, Manali",
    people: ["Kunal", "Tanya"],
    mood: "Busy and chaotic",
    tags: ["trek", "snow", "mountain", "manali", "camp", "hiking", "nature", "water or snow"],
    cluster: "Manali snow trek",
    filename: "trek_03.jpg",
    timestamp: "2024-01-22T16:00:00.000Z",
    location_label: "Hampta Base, Manali",
    caption: "High-altitude winter camp under clear skies",
    objects: ["snow", "tents", "camp", "mountain"],
    mood_tags: ["busy and chaotic", "trek"],
    episode_label: "Manali snow trek",
    purpose_tag: "memory",
    url: "/demo-photos/trek_03.jpg",
  },

  // ─────────────────────────────────────────────────────────────
  // 5. Cafe and street food, chai, momos — (2026, This year)
  // ─────────────────────────────────────────────────────────────
  {
    id: "cafe_01",
    src: "/demo-photos/cafe_01.jpg",
    title: "Steaming kulhad chai and bun maska",
    date: "2026-02-10T16:30:00.000Z",
    place: "Old Delhi Tea Stall, Delhi",
    people: ["Neha"],
    mood: "Calm and quiet",
    tags: ["chai", "tea", "kulhad", "street food", "cafe", "food", "snacks", "indoors"],
    cluster: "Street food & cafe",
    filename: "cafe_01.jpg",
    timestamp: "2026-02-10T16:30:00.000Z",
    location_label: "Old Delhi, Delhi",
    caption: "Steaming kulhad chai and bun maska",
    objects: ["chai", "tea", "kulhad", "bun maska"],
    mood_tags: ["calm and quiet", "chai", "food"],
    episode_label: "Street food & cafe",
    purpose_tag: "memory",
    url: "/demo-photos/cafe_01.jpg",
  },
  {
    id: "cafe_02",
    src: "/demo-photos/cafe_02.jpg",
    title: "Hot steamed momos with fiery red chutney",
    date: "2026-02-14T17:45:00.000Z",
    place: "Majnu Ka Tila, Delhi",
    people: ["Neha", "Simran"],
    mood: "Happy and loud",
    tags: ["momos", "street food", "spicy", "chutney", "cafe", "food", "snacks", "indoors"],
    cluster: "Street food & cafe",
    filename: "cafe_02.jpg",
    timestamp: "2026-02-14T17:45:00.000Z",
    location_label: "Majnu Ka Tila, Delhi",
    caption: "Hot steamed momos with fiery red chutney",
    objects: ["momos", "chutney", "street food"],
    mood_tags: ["happy and loud", "food"],
    episode_label: "Street food & cafe",
    purpose_tag: "memory",
    url: "/demo-photos/cafe_02.jpg",
  },
  {
    id: "cafe_03",
    src: "/demo-photos/cafe_03.jpg",
    title: "Afternoon coffee and dessert at corner table",
    date: "2026-02-20T15:15:00.000Z",
    place: "Hauz Khas Village, Delhi",
    people: ["Simran"],
    mood: "Calm and quiet",
    tags: ["cafe", "coffee", "pastry", "indoors", "food", "table", "cozy"],
    cluster: "Street food & cafe",
    filename: "cafe_03.jpg",
    timestamp: "2026-02-20T15:15:00.000Z",
    location_label: "Hauz Khas Village, Delhi",
    caption: "Afternoon coffee and dessert at corner table",
    objects: ["coffee", "dessert", "cafe table"],
    mood_tags: ["calm and quiet", "cafe"],
    episode_label: "Street food & cafe",
    purpose_tag: "memory",
    url: "/demo-photos/cafe_03.jpg",
  },

  // ─────────────────────────────────────────────────────────────
  // 6. Wedding, colourful outfits, dancing — (2023, A while ago)
  // ─────────────────────────────────────────────────────────────
  {
    id: "wedding_01",
    src: "/demo-photos/wedding_01.jpg",
    title: "Baraat dancing with dhols and marigolds",
    date: "2023-12-08T20:15:00.000Z",
    place: "Heritage Palace, Udaipur",
    people: ["Kabir", "Meera", "Cousins"],
    mood: "Busy and chaotic",
    tags: ["wedding", "dancing", "baraat", "dhol", "colourful outfits", "people", "special clothes", "celebration"],
    cluster: "Wedding celebrations",
    filename: "wedding_01.jpg",
    timestamp: "2023-12-08T20:15:00.000Z",
    location_label: "Heritage Palace, Udaipur",
    caption: "Baraat dancing with dhols and marigolds",
    objects: ["dancing", "dhols", "marigolds", "wedding"],
    mood_tags: ["busy and chaotic", "dancing", "wedding"],
    episode_label: "Wedding celebrations",
    purpose_tag: "memory",
    url: "/demo-photos/wedding_01.jpg",
  },
  {
    id: "wedding_02",
    src: "/demo-photos/wedding_02.jpg",
    title: "Bride in embroidered lehenga and jewellery",
    date: "2023-12-09T18:45:00.000Z",
    place: "Heritage Palace, Udaipur",
    people: ["Meera"],
    mood: "Calm and quiet",
    tags: ["wedding", "colourful outfits", "lehenga", "jewellery", "ethnic", "bride", "special clothes", "people"],
    cluster: "Wedding celebrations",
    filename: "wedding_02.jpg",
    timestamp: "2023-12-09T18:45:00.000Z",
    location_label: "Heritage Palace, Udaipur",
    caption: "Bride in embroidered lehenga and jewellery",
    objects: ["lehenga", "jewellery", "bride", "wedding"],
    mood_tags: ["calm and quiet", "wedding", "special clothes"],
    episode_label: "Wedding celebrations",
    purpose_tag: "memory",
    url: "/demo-photos/wedding_02.jpg",
  },
  {
    id: "wedding_03",
    src: "/demo-photos/wedding_03.jpg",
    title: "Sangeet stage dance performance with family",
    date: "2023-12-10T22:30:00.000Z",
    place: "Heritage Palace, Udaipur",
    people: ["Kabir", "Meera", "Aunties"],
    mood: "Happy and loud",
    tags: ["sangeet", "dancing", "wedding", "stage", "colourful outfits", "lights", "people", "special clothes"],
    cluster: "Wedding celebrations",
    filename: "wedding_03.jpg",
    timestamp: "2023-12-10T22:30:00.000Z",
    location_label: "Heritage Palace, Udaipur",
    caption: "Sangeet stage dance performance with family",
    objects: ["sangeet", "dancing", "stage", "wedding"],
    mood_tags: ["happy and loud", "dancing"],
    episode_label: "Wedding celebrations",
    purpose_tag: "memory",
    url: "/demo-photos/wedding_03.jpg",
  },

  // ─────────────────────────────────────────────────────────────
  // 7. Rainy day, window, monsoon — (2024, Last year)
  // ─────────────────────────────────────────────────────────────
  {
    id: "rain_01",
    src: "/demo-photos/rain_01.jpg",
    title: "Monsoon raindrops running down cafe glass window",
    date: "2024-07-18T14:40:00.000Z",
    place: "Bandra, Mumbai",
    people: [],
    mood: "Calm and quiet",
    tags: ["rainy day", "window", "monsoon", "rain", "raindrops", "nature", "water", "water or snow", "indoors"],
    cluster: "Monsoon moments",
    filename: "rain_01.jpg",
    timestamp: "2024-07-18T14:40:00.000Z",
    location_label: "Bandra, Mumbai",
    caption: "Monsoon raindrops running down cafe glass window",
    objects: ["rain", "window", "raindrops", "glass"],
    mood_tags: ["calm and quiet", "rainy", "monsoon"],
    episode_label: "Monsoon moments",
    purpose_tag: "memory",
    url: "/demo-photos/rain_01.jpg",
  },
  {
    id: "rain_02",
    src: "/demo-photos/rain_02.jpg",
    title: "Dark rain clouds gathering over Marine Drive",
    date: "2024-07-22T16:15:00.000Z",
    place: "Marine Drive, Mumbai",
    people: [],
    mood: "Calm and quiet",
    tags: ["rainy day", "monsoon", "clouds", "sea", "ocean", "nature", "water", "water or snow", "outdoors"],
    cluster: "Monsoon moments",
    filename: "rain_02.jpg",
    timestamp: "2024-07-22T16:15:00.000Z",
    location_label: "Marine Drive, Mumbai",
    caption: "Dark rain clouds gathering over Marine Drive",
    objects: ["clouds", "sea", "rain", "marine drive"],
    mood_tags: ["calm and quiet", "monsoon"],
    episode_label: "Monsoon moments",
    purpose_tag: "memory",
    url: "/demo-photos/rain_02.jpg",
  },
  {
    id: "rain_03",
    src: "/demo-photos/rain_03.jpg",
    title: "Fresh green leaves dripping after heavy shower",
    date: "2024-08-03T11:20:00.000Z",
    place: "Lonavala, Maharashtra",
    people: [],
    mood: "Calm and quiet",
    tags: ["rainy day", "monsoon", "green", "nature", "water", "water or snow", "garden", "fresh", "outdoors"],
    cluster: "Monsoon moments",
    filename: "rain_03.jpg",
    timestamp: "2024-08-03T11:20:00.000Z",
    location_label: "Lonavala, Maharashtra",
    caption: "Fresh green leaves dripping after heavy shower",
    objects: ["leaves", "rain", "water drops", "nature"],
    mood_tags: ["calm and quiet", "green", "monsoon"],
    episode_label: "Monsoon moments",
    purpose_tag: "memory",
    url: "/demo-photos/rain_03.jpg",
  },

  // ─────────────────────────────────────────────────────────────
  // 8. Road trip, car, highway, friends — (2026, This year)
  // ─────────────────────────────────────────────────────────────
  {
    id: "roadtrip_01",
    src: "/demo-photos/roadtrip_01.jpg",
    title: "Driving through scenic Western Ghats on highway",
    date: "2026-01-14T09:15:00.000Z",
    place: "Mumbai-Pune Expressway",
    people: ["Arjun", "Sameer", "Zoya"],
    mood: "Happy and loud",
    tags: ["road trip", "car", "highway", "friends", "driving", "nature", "people", "outdoors"],
    cluster: "Highway road trip",
    filename: "roadtrip_01.jpg",
    timestamp: "2026-01-14T09:15:00.000Z",
    location_label: "Mumbai-Pune Expressway",
    caption: "Driving through scenic Western Ghats on highway",
    objects: ["car", "highway", "mountains", "friends"],
    mood_tags: ["happy and loud", "road trip"],
    episode_label: "Highway road trip",
    purpose_tag: "memory",
    url: "/demo-photos/roadtrip_01.jpg",
  },
  {
    id: "roadtrip_02",
    src: "/demo-photos/roadtrip_02.jpg",
    title: "Dhaba breakfast pitstop with hot parathas & chai",
    date: "2026-01-14T13:30:00.000Z",
    place: "Highway Dhaba, Khopoli",
    people: ["Arjun", "Sameer"],
    mood: "Busy and chaotic",
    tags: ["road trip", "highway", "dhaba", "food", "tea", "friends", "car", "people"],
    cluster: "Highway road trip",
    filename: "roadtrip_02.jpg",
    timestamp: "2026-01-14T13:30:00.000Z",
    location_label: "Highway Dhaba, Khopoli",
    caption: "Dhaba breakfast pitstop with hot parathas & chai",
    objects: ["dhaba", "food", "chai", "friends"],
    mood_tags: ["busy and chaotic", "food"],
    episode_label: "Highway road trip",
    purpose_tag: "memory",
    url: "/demo-photos/roadtrip_02.jpg",
  },
  {
    id: "roadtrip_03",
    src: "/demo-photos/roadtrip_03.jpg",
    title: "Golden sunset view through car windshield",
    date: "2026-01-15T17:40:00.000Z",
    place: "Old Mumbai-Pune Highway",
    people: ["Zoya"],
    mood: "Calm and quiet",
    tags: ["road trip", "car", "windshield", "sunset", "highway", "scenic", "nature", "outdoors"],
    cluster: "Highway road trip",
    filename: "roadtrip_03.jpg",
    timestamp: "2026-01-15T17:40:00.000Z",
    location_label: "Old Mumbai-Pune Highway",
    caption: "Golden sunset view through car windshield",
    objects: ["car", "sunset", "windshield", "highway"],
    mood_tags: ["calm and quiet", "sunset"],
    episode_label: "Highway road trip",
    purpose_tag: "memory",
    url: "/demo-photos/roadtrip_03.jpg",
  },
];

/**
 * Story albums derived from the 24 demo photos for the memories carousel
 */
export const DEMO_STORY_ALBUMS = [
  {
    id: "story-goa",
    title: "Beach days, Goa",
    subtitle: "Goa Trip",
    photo_count: 3,
    cover_photo: DEMO_PHOTOS[0] as any,
    photos: DEMO_PHOTOS.filter((p) => p.cluster === "Beach days, Goa") as any[],
  },
  {
    id: "story-bday",
    title: "Birthday evening",
    subtitle: "Celebrations",
    photo_count: 3,
    cover_photo: DEMO_PHOTOS[3] as any,
    photos: DEMO_PHOTOS.filter((p) => p.cluster === "Birthday evening") as any[],
  },
  {
    id: "story-diwali",
    title: "Diwali lights",
    subtitle: "Family Festival",
    photo_count: 3,
    cover_photo: DEMO_PHOTOS[6] as any,
    photos: DEMO_PHOTOS.filter((p) => p.cluster === "Diwali lights & family") as any[],
  },
  {
    id: "story-manali",
    title: "Manali snow trek",
    subtitle: "Mountain Highs",
    photo_count: 3,
    cover_photo: DEMO_PHOTOS[9] as any,
    photos: DEMO_PHOTOS.filter((p) => p.cluster === "Manali snow trek") as any[],
  },
  {
    id: "story-cafe",
    title: "Street food & cafe",
    subtitle: "Delhi Delights",
    photo_count: 3,
    cover_photo: DEMO_PHOTOS[12] as any,
    photos: DEMO_PHOTOS.filter((p) => p.cluster === "Street food & cafe") as any[],
  },
  {
    id: "story-wedding",
    title: "Wedding festivities",
    subtitle: "Udaipur",
    photo_count: 3,
    cover_photo: DEMO_PHOTOS[15] as any,
    photos: DEMO_PHOTOS.filter((p) => p.cluster === "Wedding celebrations") as any[],
  },
  {
    id: "story-monsoon",
    title: "Monsoon moments",
    subtitle: "Rainy days",
    photo_count: 3,
    cover_photo: DEMO_PHOTOS[18] as any,
    photos: DEMO_PHOTOS.filter((p) => p.cluster === "Monsoon moments") as any[],
  },
  {
    id: "story-roadtrip",
    title: "Highway road trip",
    subtitle: "Western Ghats",
    photo_count: 3,
    cover_photo: DEMO_PHOTOS[21] as any,
    photos: DEMO_PHOTOS.filter((p) => p.cluster === "Highway road trip") as any[],
  },
];

/**
 * Cluster definition for agent scoring
 */
export interface ScoredCluster {
  id: string;
  name: string;
  reason: string;
  score: number;
  photos: DemoPhoto[];
  narrowingClue?: string;
}

/**
 * Client-side deterministic cluster generator and scoring function.
 */
export function scoreAndRankClusters(
  answers: {
    moodAnswer?: string;
    timelineAnswer?: string;
    clueAnswer?: string;
    narrowingAnswer?: string;
  },
  excludedClusterIds: string[] = []
): ScoredCluster[] {
  // Define the 8 cluster metadata blueprints
  const clusterDefs: {
    id: string;
    name: string;
    theme: string;
    defaultReason: string;
    moodAffinity: string[];
    timeline: "This year" | "Last year" | "A while ago";
    clueAffinity: ("People" | "Food" | "Nature" | "Indoors")[];
    narrowingQuestion: string;
    narrowingTag: string;
  }[] = [
    {
      id: "beach",
      name: "Beach days, Goa",
      theme: "Beach days, Goa",
      defaultReason: "sunny, outdoors, friends, last year",
      moodAffinity: ["Happy and loud", "Calm and quiet"],
      timeline: "Last year",
      clueAffinity: ["People", "Nature"],
      narrowingQuestion: "Was there water or snow in the background?",
      narrowingTag: "water or snow",
    },
    {
      id: "bday",
      name: "Birthday evening",
      theme: "Birthday evening",
      defaultReason: "indoors, cake, lots of people, this year",
      moodAffinity: ["Happy and loud", "Busy and chaotic"],
      timeline: "This year",
      clueAffinity: ["People", "Food", "Indoors"],
      narrowingQuestion: "Were you celebrating with cake and balloons?",
      narrowingTag: "cake",
    },
    {
      id: "diwali",
      name: "Diwali lights & family",
      theme: "Diwali lights & family",
      defaultReason: "traditional, lights, family home, a while ago",
      moodAffinity: ["Calm and quiet", "Happy and loud"],
      timeline: "A while ago",
      clueAffinity: ["People", "Indoors"],
      narrowingQuestion: "Were you wearing special ethnic outfits?",
      narrowingTag: "special clothes",
    },
    {
      id: "trek",
      name: "Manali snow trek",
      theme: "Manali snow trek",
      defaultReason: "snowy peaks, hiking, cold outdoors, last year",
      moodAffinity: ["Calm and quiet", "Busy and chaotic"],
      timeline: "Last year",
      clueAffinity: ["Nature"],
      narrowingQuestion: "Was there water or snow in the background?",
      narrowingTag: "water or snow",
    },
    {
      id: "cafe",
      name: "Monsoon cafe & street food",
      theme: "Street food & cafe",
      defaultReason: "calm, chai, momos, cozy indoors, this year",
      moodAffinity: ["Calm and quiet", "Happy and loud"],
      timeline: "This year",
      clueAffinity: ["Food", "Indoors"],
      narrowingQuestion: "Were you eating street food or having tea?",
      narrowingTag: "food",
    },
    {
      id: "wedding",
      name: "Big fat wedding",
      theme: "Wedding celebrations",
      defaultReason: "colourful outfits, dancing, celebration, a while ago",
      moodAffinity: ["Busy and chaotic", "Happy and loud"],
      timeline: "A while ago",
      clueAffinity: ["People", "Indoors"],
      narrowingQuestion: "Were you wearing something special or dancing?",
      narrowingTag: "special clothes",
    },
    {
      id: "rain",
      name: "Rainy day & monsoon",
      theme: "Monsoon moments",
      defaultReason: "calm, rainy, quiet window view, last year",
      moodAffinity: ["Calm and quiet"],
      timeline: "Last year",
      clueAffinity: ["Nature", "Indoors"],
      narrowingQuestion: "Was there water or rain in the scene?",
      narrowingTag: "water or snow",
    },
    {
      id: "roadtrip",
      name: "Highway road trip",
      theme: "Highway road trip",
      defaultReason: "car, highway ghats, friends driving, this year",
      moodAffinity: ["Happy and loud", "Busy and chaotic"],
      timeline: "This year",
      clueAffinity: ["People", "Nature"],
      narrowingQuestion: "Were you travelling inside a car on a road trip?",
      narrowingTag: "car",
    },
  ];

  const results: ScoredCluster[] = [];

  for (const def of clusterDefs) {
    if (excludedClusterIds.includes(def.id)) continue;

    let score = 10; // Base score
    const reasons: string[] = [];

    // 1. Mood scoring
    if (answers.moodAnswer && answers.moodAnswer !== "Not sure") {
      if (def.moodAffinity.includes(answers.moodAnswer)) {
        score += 8;
        reasons.push(answers.moodAnswer.toLowerCase());
      } else {
        score -= 2;
      }
    }

    // 2. Timeline scoring
    if (answers.timelineAnswer && answers.timelineAnswer !== "No idea") {
      if (def.timeline === answers.timelineAnswer) {
        score += 10;
        reasons.push(answers.timelineAnswer.toLowerCase());
      } else {
        score -= 4;
      }
    }

    // 3. Clues scoring
    if (answers.clueAnswer) {
      const clueMatch = def.clueAffinity.some((c) =>
        answers.clueAnswer?.toLowerCase().includes(c.toLowerCase())
      );
      if (clueMatch) {
        score += 9;
        reasons.push(answers.clueAnswer.toLowerCase());
      }
    }

    // 4. Narrowing scoring
    if (answers.narrowingAnswer) {
      const isPositive =
        answers.narrowingAnswer.toLowerCase().includes("yes") ||
        answers.narrowingAnswer.toLowerCase().includes("definitely") ||
        answers.narrowingAnswer.toLowerCase().includes("water") ||
        answers.narrowingAnswer.toLowerCase().includes("snow") ||
        answers.narrowingAnswer.toLowerCase().includes("special") ||
        answers.narrowingAnswer.toLowerCase().includes("food") ||
        answers.narrowingAnswer.toLowerCase().includes("car") ||
        answers.narrowingAnswer.toLowerCase().includes("cake");

      if (isPositive) {
        score += 12;
      }
    }

    // Get photos belonging to this cluster
    const clusterPhotos = DEMO_PHOTOS.filter((p) => p.cluster === def.theme);

    // Build synthesized one-line reason (e.g. "Beach days, Goa: sunny, outdoors, friends, last year")
    const dynamicReason = reasons.length > 0 ? reasons.join(", ") : def.defaultReason;

    results.push({
      id: def.id,
      name: def.name,
      reason: `${def.name}: ${dynamicReason}`,
      score,
      photos: clusterPhotos,
      narrowingClue: def.narrowingQuestion,
    });
  }

  // Sort descending by score
  results.sort((a, b) => b.score - a.score);
  return results;
}
