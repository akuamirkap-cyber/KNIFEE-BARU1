/** The armory is data, not a dependency on the surrounding app. */
export type Shape = 'knife' | 'arrow' | 'bullet' | 'disc' | 'spark' | 'diamond' | 'star' | 'bolt';
export type GunStyle = 'ranger' | 'bow' | 'revolver' | 'neon' | 'disc' | 'martian' | 'diamond' | 'cannon' | 'ninja' | 'nova';
export type Rarity = 'CLASSIC' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface Weapon {
  id: string;
  name: string;
  note: string;
  cooldown: number;
  shape: Shape;
  /** RGB triplet shared by the projectile, trail, glow, and launcher. */
  rgb: string;
  style: GunStyle;
  rarity: Rarity;
  price: number;
}

export const WEAPONS: readonly Weapon[] = [
  { id: 'knife', name: 'Ranger', note: 'Bilah baja. Presisi tanpa basa-basi.', cooldown: 0.28, shape: 'knife', rgb: '204,236,247', style: 'ranger', rarity: 'CLASSIC', price: 0 },
  { id: 'bullet', name: 'Iron Revolver', note: 'Peluru kuningan dengan jeda singkat.', cooldown: 0.21, shape: 'bullet', rgb: '255,200,104', style: 'revolver', rarity: 'CLASSIC', price: 0 },
  { id: 'arrow', name: 'Longbow', note: 'Anak panah panjang, irama lebih tenang.', cooldown: 0.34, shape: 'arrow', rgb: '195,242,150', style: 'bow', rarity: 'CLASSIC', price: 0 },
  { id: 'neon', name: 'Neon Edge', note: 'Bilah neon dengan jejak biru elektrik.', cooldown: 0.25, shape: 'knife', rgb: '79,234,255', style: 'neon', rarity: 'RARE', price: 120 },
  { id: 'disc', name: 'Volt Disc', note: 'Cakram berputar dari reaktor mini.', cooldown: 0.38, shape: 'disc', rgb: '169,147,255', style: 'disc', rarity: 'RARE', price: 220 },
  { id: 'plasma', name: 'Martian Ray', note: 'Sinar plasma hijau dari planet merah.', cooldown: 0.30, shape: 'spark', rgb: '130,255,113', style: 'martian', rarity: 'EPIC', price: 350 },
  { id: 'diamond', name: 'Diamond Gun', note: 'Satu-satunya yang menembakkan berlian.', cooldown: 0.29, shape: 'diamond', rgb: '115,232,255', style: 'diamond', rarity: 'EPIC', price: 500 },
  { id: 'inferno', name: 'Ember Cannon', note: 'Laras berat, proyektil berjejak bara.', cooldown: 0.36, shape: 'bullet', rgb: '255,133,78', style: 'cannon', rarity: 'EPIC', price: 650 },
  { id: 'shuriken', name: 'Shadow Star', note: 'Bintang ninja dalam balutan ungu.', cooldown: 0.27, shape: 'star', rgb: '227,149,255', style: 'ninja', rarity: 'LEGENDARY', price: 850 },
  { id: 'nova', name: 'Nova Blaster', note: 'Baut energi emas. Cepat dan terang.', cooldown: 0.23, shape: 'bolt', rgb: '255,229,143', style: 'nova', rarity: 'LEGENDARY', price: 1100 },
];

export const FREE_WEAPONS = WEAPONS.filter((w) => w.price === 0).map((w) => w.id);
export function weaponById(id: string | null | undefined): Weapon {
  return WEAPONS.find((w) => w.id === id) ?? WEAPONS[0];
}
