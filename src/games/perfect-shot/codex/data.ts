import { knifeVariant, levelConfig, TARGETS, type TargetKind } from "../play/levels";
import { KNIFE_COUNT, KNIFE_INFO } from "../play/KnifeArt";
import { HEAD_INFO, HEAD_KINDS, type HeadKind } from "../play/HeadArt";
import { STAGES, TOTAL } from "../quest/data";

export type CodexEntry = {
  id: string;
  group: "wheel" | "boss" | "obstacle";
  knife?: number;
  kind: TargetKind;
  head?: HeadKind;
  name: string;
  tag: string;
  tagColor: string;
  desc: string;
  facts: string[];
  first: number; // first stage it appears in (0 = never)
};

type WheelKind = Exclude<TargetKind, "boss">;
const W: Record<WheelKind, { name: string; tag: "FRUIT" | "BALL" | "WOOD" | "GAME" | "BEACH" | "SPACE" | "UNIQUE" | "FOOD"; desc: string; hit: string; burst: string }> = {
  orange: { name: "Orange", tag: "FRUIT", desc: "Fresh orange slice with 10 segments. The first wheel — a warm-up.", hit: "Wet squelch", burst: "Orange juice splash" },
  lime: { name: "Lime", tag: "FRUIT", desc: "A sour lime slice. Small but slippery!", hit: "Wet squelch", burst: "Green juice splash" },
  lemon: { name: "Lemon", tag: "FRUIT", desc: "Bright yellow lemon slice with glistening fibres.", hit: "Wet squelch", burst: "Yellow juice splash" },
  watermelon: { name: "Watermelon", tag: "FRUIT", desc: "Fresh red watermelon packed with black seeds.", hit: "Wet squelch", burst: "Red splash" },
  wood: { name: "Wood", tag: "WOOD", desc: "A log slice showing its growth rings.", hit: "Wooden thock", burst: "Wood splinters" },
  durian: { name: "Durian Halves", tag: "FRUIT", desc: "The king of fruits split in two: spiky green rind, 5 chambers of smooth golden flesh.", hit: "Rind crack", burst: "Durian flesh scatters" },
  kiwi: { name: "Kiwi", tag: "FRUIT", desc: "Fuzzy green kiwi with a ring of black seeds.", hit: "Wet squelch", burst: "Green splash" },
  dragonfruit: { name: "Dragon Fruit", tag: "FRUIT", desc: "Scaly magenta skin, white flesh with hundreds of tiny seeds.", hit: "Wet squelch", burst: "Magenta splash" },
  pineapple: { name: "Pineapple", tag: "FRUIT", desc: "Fibrous pineapple slice with a diamond-patterned rind.", hit: "Wet squelch", burst: "Yellow splash" },
  apple: { name: "Apple", tag: "FRUIT", desc: "Red apple sliced across — look at the five-seed star!", hit: "Crisp crunch", burst: "Creamy splash" },
  soccer: { name: "Soccer Ball", tag: "BALL", desc: "Classic black-and-white pentagon soccer ball.", hit: "Rubber bonk", burst: "Bursts + air rushes out" },
  basketball: { name: "Basketball", tag: "BALL", desc: "Textured orange basketball with black seams.", hit: "Heavy bonk", burst: "Bursts + air rushes out" },
  tennis: { name: "Tennis Ball", tag: "BALL", desc: "Neon tennis ball with soft fuzz.", hit: "Light pok", burst: "Bursts + air rushes out" },
  baseball: { name: "Baseball", tag: "BALL", desc: "Leather ball with red V-shaped stitching.", hit: "Leather pok", burst: "Bursts + air rushes out" },
  bowling: { name: "Bowling Ball", tag: "BALL", desc: "Shiny purple resin ball with 3 finger holes.", hit: "Heavy thock", burst: "STRIKE! pins scatter" },
  carrom: { name: "Mandala Striker", tag: "GAME", desc: "Ivory carrom striker with a gold frame and layered red, green & gold mandala.", hit: "Soft tak", burst: "Disc shards scatter" },
  carrom2: { name: "Lotus Striker", tag: "GAME", desc: "Midnight-blue carrom striker with a pink lotus blooming from the centre.", hit: "Soft tak", burst: "Disc shards scatter" },
  casino: { name: "Casino Coin", tag: "GAME", desc: "Red-and-gold 100 chip with spade, heart, diamond & club symbols.", hit: "Chip click", burst: "Rain of chips & coins" },
  volleyball: { name: "Volleyball", tag: "BEACH", desc: "Blue-yellow-white beach volleyball with curved panels.", hit: "Rubber bonk", burst: "Bursts + air rushes out" },
  umbrella: { name: "Beach Umbrella", tag: "BEACH", desc: "Rainbow umbrella seen from above — 8 colourful panels with wavy edges.", hit: "Fabric thump", burst: "Fabric flutters away" },
  starfish: { name: "Starfish", tag: "BEACH", desc: "Bumpy orange starfish in a clear pool full of bubbles.", hit: "Squishy squelch", burst: "Sea-water splash" },
  coconut: { name: "Coconut", tag: "BEACH", desc: "Coconut split in two: fibrous husk, shell, white flesh & coconut water.", hit: "Shell thock", burst: "Coconut water sprays" },
  eightball: { name: "8-Ball", tag: "BALL", desc: "Glossy black number 8 billiard ball — the ball that decides the game.", hit: "Billiard clack", burst: "Ball shatters" },
  moon: { name: "Moon", tag: "SPACE", desc: "Grey satellite full of craters and dark seas.", hit: "Stony thud", burst: "Moon rocks scatter" },
  mars: { name: "Mars", tag: "SPACE", desc: "Dusty red planet with a giant valley and icy polar caps.", hit: "Stony thud", burst: "Red dust scatters" },
  jupiter: { name: "Jupiter", tag: "SPACE", desc: "Banded gas giant with the Great Red Spot — an eternal storm.", hit: "Gaseous woom", burst: "Gas clouds scatter" },
  pluto: { name: "Pluto", tag: "SPACE", desc: "Icy dwarf planet famous for its heart-shaped plains.", hit: "Icy thud", burst: "Ice crystals scatter" },
  ufo: { name: "UFO", tag: "SPACE", desc: "Metal flying saucer with colourful lights — a green alien peeks out of the glass dome!", hit: "Metal dong", burst: "Lights & metal scatter" },
  dartboard: { name: "Dartboard", tag: "GAME", desc: "Full dartboard: 20 numbered segments, double & triple rings, plus the bullseye.", hit: "Sisal thunk", burst: "Board splinters" },
  disco: { name: "Disco Ball", tag: "UNIQUE", desc: "Mirror ball packed with hundreds of sparkling facets. A party on every spin!", hit: "Glass ting", burst: "Rain of mirror shards" },
  icecream: { name: "Strawberry Ice Cream", tag: "FOOD", desc: "One big scoop of soft, wavy pink strawberry ice cream.", hit: "Soft plop", burst: "Ice-cream splash" },
  spiral: { name: "Hypno Spiral", tag: "UNIQUE", desc: "A black-and-white spiral that makes you dizzy as it spins… focus!", hit: "Woom", burst: "Vortex shatters" },
  ornament: { name: "Christmas Bauble", tag: "UNIQUE", desc: "Glossy red tree ornament with a gold ribbon & snowflakes.", hit: "Glass ting", burst: "Red glass shards" },
  peppermint: { name: "Peppermint", tag: "FOOD", desc: "Red-and-white swirl candy in a clear wrapper.", hit: "Candy crack", burst: "Candy shards" },
  friedegg: { name: "Fried Egg", tag: "FOOD", desc: "A perfectly round sunny-side-up egg with a big orange yolk.", hit: "Soft plop", burst: "Yolk splatters" },
  pearl: { name: "Pearl", tag: "UNIQUE", desc: "White pearl with a rainbow sheen — treasure from the sea floor.", hit: "Glass ting", burst: "Pearl shimmer" },
  quailegg: { name: "Quail Egg", tag: "FOOD", desc: "Creamy quail egg speckled black and grey.", hit: "Shell crack", burst: "Shell shatters" },
  grapesoda: { name: "Grape Soda Cap", tag: "FOOD", desc: "Serrated purple grape-soda bottle cap with a GRAPE ribbon — a true adventurer's badge!", hit: "Cap clink", burst: "Bottle cap flies off" },
  cannon: { name: "Cannon Bomb", tag: "UNIQUE", desc: "Black iron cannonball with a lit fuse and a skull mark. Watch out — it explodes!", hit: "Heavy iron dong", burst: "KABOOM! huge explosion" },
  eyeball: { name: "Eyeball", tag: "UNIQUE", desc: "Giant bloodshot eyeball with a green iris that keeps staring at you…", hit: "Squish!", burst: "Rubbery splash" },
};
const TAG_COLOR = { FRUIT: "#22c55e", BALL: "#38bdf8", WOOD: "#d97706", GAME: "#f59e0b", BEACH: "#06b6d4", SPACE: "#818cf8", UNIQUE: "#f472b6", FOOD: "#fb923c", BOSS: "#ef4444", HAZARD: "#94a3b8" } as const;

function firstStages() {
  const wheel = new Map<string, number>();
  const boss = new Map<string, number>();
  for (let n = 1; n <= TOTAL; n++) {
    const L = levelConfig(n);
    if (L.boss && L.head) {
      if (!boss.has(L.head)) boss.set(L.head, n);
    } else if (!wheel.has(L.target)) wheel.set(L.target, n);
  }
  return { wheel, boss };
}

const FS = firstStages();
const wheelKinds = Array.from(new Set<WheelKind>([...(TARGETS as WheelKind[]), ...(Object.keys(W) as WheelKind[])]));

export const CODEX_WHEELS: CodexEntry[] = wheelKinds
  .map((k) => {
    const w = W[k];
    return {
      id: k,
      group: "wheel" as const,
      kind: k,
      name: w.name,
      tag: w.tag,
      tagColor: TAG_COLOR[w.tag],
      desc: w.desc,
      facts: [`Sound: ${w.hit}`, `Break: ${w.burst}`],
      first: FS.wheel.get(k) ?? 0,
    };
  })
  .sort((a, b) => (a.first || 999) - (b.first || 999));

export const CODEX_BOSSES: CodexEntry[] = HEAD_KINDS.map((h) => {
  const first = FS.boss.get(h) ?? 0;
  const L = first ? levelConfig(first) : null;
  const all = STAGES.filter((s) => s.head === h).map((s) => s.n);
  return {
    id: h,
    group: "boss" as const,
    kind: "boss" as TargetKind,
    head: h,
    name: HEAD_INFO[h].name,
    tag: "BOSS",
    tagColor: TAG_COLOR.BOSS,
    desc: HEAD_INFO[h].desc,
    facts: [L ? `Needs ${L.ammo} shots` : "—", `Stage ${all.join(" & ")}`],
    first,
  };
}).sort((a, b) => (a.first || 999) - (b.first || 999));

function firstKnife(v: number) {
  for (let n = 1; n <= TOTAL; n++) {
    const L = levelConfig(n);
    for (let i = 0; i < L.obstacles; i++) if (knifeVariant(n, i) === v) return n;
  }
  return 0;
}

export const CODEX_OBSTACLES: CodexEntry[] = Array.from({ length: KNIFE_COUNT }, (_, v) => ({
  id: `knife${v}`,
  group: "obstacle" as const,
  kind: "orange" as TargetKind,
  knife: v,
  name: KNIFE_INFO[v].name,
  tag: "HAZARD",
  tagColor: TAG_COLOR.HAZARD,
  desc: KNIFE_INFO[v].desc,
  facts: ["Stuck in the wheel", "Hit = MISS"],
  first: firstKnife(v),
})).sort((a, b) => (a.first || 999) - (b.first || 999));
