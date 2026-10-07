const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '..', 'public', 'demo-photos');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const photos = [
  // 1. Beach trip (Goa)
  { id: 'beach_01', seed: 'goa-beach-sunset-friends-1' },
  { id: 'beach_02', seed: 'goa-beach-shack-ocean-2' },
  { id: 'beach_03', seed: 'goa-vagator-palms-evening-3' },
  // 2. Birthday party
  { id: 'bday_01', seed: 'birthday-cake-candle-lights-1' },
  { id: 'bday_02', seed: 'birthday-balloons-party-room-2' },
  { id: 'bday_03', seed: 'birthday-friends-cheers-living-3' },
  // 3. Diwali
  { id: 'diwali_01', seed: 'diwali-diyas-oil-lamp-lights-1' },
  { id: 'diwali_02', seed: 'diwali-fairy-lights-rangoli-2' },
  { id: 'diwali_03', seed: 'diwali-family-celebration-ethnic-3' },
  // 4. Mountain trek (Manali)
  { id: 'trek_01', seed: 'manali-himalayan-snow-peak-1' },
  { id: 'trek_02', seed: 'mountain-hiking-backpack-forest-2' },
  { id: 'trek_03', seed: 'solang-valley-snow-pines-3' },
  // 5. Cafe & street food
  { id: 'cafe_01', seed: 'hot-chai-kulhad-tea-cafe-1' },
  { id: 'cafe_02', seed: 'steamed-momos-chutney-street-2' },
  { id: 'cafe_03', seed: 'cozy-delhi-rooftop-cafe-3' },
  // 6. Wedding
  { id: 'wedding_01', seed: 'indian-wedding-dance-baraat-1' },
  { id: 'wedding_02', seed: 'wedding-colourful-outfits-lehenga-2' },
  { id: 'wedding_03', seed: 'sangeet-celebration-marigold-decor-3' },
  // 7. Rainy day (Monsoon)
  { id: 'rain_01', seed: 'rain-drops-cafe-window-glass-1' },
  { id: 'rain_02', seed: 'monsoon-clouds-mumbai-sea-2' },
  { id: 'rain_03', seed: 'green-foliage-rainy-shower-3' },
  // 8. Road trip
  { id: 'roadtrip_01', seed: 'highway-car-roadtrip-ghats-1' },
  { id: 'roadtrip_02', seed: 'scenic-roadside-dhaba-expressway-2' },
  { id: 'roadtrip_03', seed: 'sunset-car-windscreen-travel-3' },
];

async function downloadPhoto(item) {
  const filePath = path.join(targetDir, `${item.id}.jpg`);
  const url = `https://picsum.photos/seed/${item.seed}/800/800`;
  
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    console.log(`✓ Downloaded ${item.id}.jpg (${buffer.length} bytes)`);
    return true;
  } catch (err) {
    console.error(`✗ Failed to download ${item.id}:`, err.message);
    return false;
  }
}

async function main() {
  console.log(`Downloading ${photos.length} demo photos to ${targetDir}...`);
  for (const item of photos) {
    await downloadPhoto(item);
  }
  console.log('All downloads finished.');
}

main();
