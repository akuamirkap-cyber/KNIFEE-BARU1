"""Generate the slide-1 port of slide-7 (`Weapon Hit 71 Senjata`) SET 2..5
weapon code, straight out of `games/game-4/src/game/Game.ts`.

Two files are produced, both machine-copied so no number is retyped by hand:

  src/games/gunhit/game/setSevenFire.ts  — the 65 fire recipes
  src/games/gunhit/game/setSevenAnim.ts  — the animation springs (recoil, slide,
                                           pump, heat, spin, charge…) plus the
                                           per-weapon idle ambience of the same
                                           65 weapons

The only edit is the receiver: slide 7's `this` (its `Game`) becomes the
slide-1 host of `setSevenFx.ts`, which forwards particles, FX, timers, shake,
screen flash, wheel paint and the real slide-7 projectile objects to slide 1.
"""
import os, re

ROOT = 'games/game-4/src/game'
OUT = 'src/games/gunhit/game'
game = open(os.path.join(ROOT, 'Game.ts')).read()
lines = game.split('\n')

# slide-7 id -> fire method name
TARGETS = {
    'snowball': 'fireSnowball', 'sniper': 'fireSniper', 'flame': 'fireFlame',
    'bubble': 'fireBubble', 'bamboo': 'fireBamboo', 'banana': 'fireBanana',
    'harpoon': 'fireHarpoon', 'chicken': 'fireChicken', 'confetti': 'fireConfetti',
    'seed': 'fireSeed', 'pizza': 'firePizza', 'minigun': 'fireMinigun',
    'crossbow': 'fireCrossbow', 'plasma': 'firePlasma', 'laser': 'fireLaser',
    'dragon': 'fireDragon', 'gravity': 'fireGravity', 'honey': 'fireHoney',
    'coconut': 'fireCoconut', 'angklung': 'fireAngklung', 'bee': 'fireBee',
    'sakura': 'fireSakura', 'firework': 'fireFirework', 'keris': 'fireKeris',
    'moonbeam': 'fireMoonbeam', 'storm': 'fireStorm', 'pencil': 'firePencil',
    'sandal': 'fireSandal', 'paintball': 'firePaintball', 'wand': 'fireWand',
    'shark': 'fireShark', 'ghost': 'fireGhost', 'ufo': 'fireUfo',
    'rainbow': 'fireRainbow', 'meteor': 'fireMeteor', 'diamond': 'fireDiamond',
    # SET 6 — slide-7 `Weapon Hit 71 Senjata`, second batch
    'fish': 'fireFish', 'rpg': 'fireRpg', 'cricket': 'fireCricket',
    'electro': 'fireElectro', 'bazooka': 'fireBazooka', 'freeze': 'fireFreeze',
    'rail': 'fireRail', 'shrink': 'fireSizeRay', 'grow': 'fireSizeRay',
    'magnet': 'fireMagnet', 'pirate': 'firePirate', 'card': 'fireCard',
    # SET 7 — the last seventeen of the 71 weapons
    'holy': 'fireHoly', 'unicorn': 'fireUnicorn', 'obliterator': 'fireObliterator',
    'coin': 'fireCoin', 'saber': 'fireSaber', 'gauntlet': 'fireGauntlet',
    'ruby': 'fireRuby', 'emerald': 'fireEmerald', 'sapphire': 'fireSapphire',
    'crystal': 'fireCrystal', 'beerifle': 'fireBeeRifle', 'charge': 'fireCharge',
    'pulse': 'firePulse', 'cryo': 'fireCryo', 'hyperdrive': 'fireHyper',
    'quantum': 'fireQuantum', 'wars': 'fireWars',
}

# The size rays share one method with a `grow` flag; slide 1 needs two recipes.
GROW_FLAG = {'shrink': 'false', 'grow': 'true'}


def method_body(name: str) -> str:
    if name == 'fireSizeRay':
        m = re.search(r'\n  private fireSizeRay\(mx: number, my: number, grow: boolean\) \{', game)
        if not m:
            raise SystemExit('missing fireSizeRay')
        start = game.index('{', m.start())
        depth = 0
        for i in range(start, len(game)):
            if game[i] == '{':
                depth += 1
            elif game[i] == '}':
                depth -= 1
                if depth == 0:
                    return game[start + 1:i]
        raise SystemExit('unbalanced fireSizeRay')
    m = re.search(r'\n  private %s\(mx: number, my: number\) \{' % name, game)
    if not m:
        raise SystemExit('missing ' + name)
    start = game.index('{', m.start())
    depth = 0
    for i in range(start, len(game)):
        if game[i] == '{':
            depth += 1
        elif game[i] == '}':
            depth -= 1
            if depth == 0:
                return game[start + 1:i]
    raise SystemExit('unbalanced ' + name)


# ── exports of slide-7 modules, used to rebuild the import header ────────────
exports = {}
for fn in sorted(os.listdir(ROOT)):
    if not fn.endswith('.ts') or fn == 'Game.ts':
        continue
    src = open(os.path.join(ROOT, fn)).read()
    for kind, name in re.findall(r'^export (?:abstract )?(class|function|const|interface|type) (\w+)', src, re.M):
        exports.setdefault(name, (fn[:-3], kind))

CONSTS = {}
for m in re.finditer(r"^const (PURPLES|ICE_COLS|SMOKERS|GREENS|MOON_COLS|BANANA_COLS|HONEY_C)[^=]*= [^;]*;", game, re.M | re.S):
    CONSTS[m.group(1)] = m.group(0)


def import_header(code: str, extra: str = '') -> str:
    used_new = set(re.findall(r'new ([A-Z]\w*)\(', code))
    plain = [n for n in re.findall(r'\b([A-Za-z_]\w*)\b', code) if n in exports]
    # names reached through the `S` namespace belong to the spawn modules only
    s_names = set(re.findall(r'\bS\.(\w+)', code))
    used_plain = {n for n in plain if not (n in s_names and n not in used_new)}
    imports, plain_used = {}, set()
    for name in sorted(used_new | used_plain):
        if name in exports:
            mod, kind = exports[name]
            imports.setdefault(mod, set()).add(name)
            plain_used.add(name)
    out = []
    for mod in sorted(imports):
        out.append("import { %s } from '../../../../games/game-4/src/game/%s';" % (', '.join(sorted(imports[mod])), mod))
    if extra:
        out.append(extra)
    return '\n'.join(out), plain_used


def local_consts(code: str) -> str:
    out = []
    for name, text in CONSTS.items():
        if re.search(r'\b%s\b' % name, code):
            out.append(text)
    return '\n'.join(out)


# ─────────────────────────────── fire recipes ───────────────────────────────
bodies = {wid: method_body(meth) for wid, meth in TARGETS.items()}
fire_code = '\n'.join(bodies.values())
fire_imports, _ = import_header(
    fire_code,
    "import * as S from '../../../../games/game-4/src/game/spawn7';",
)

fire_out = ['''/**
 * SET 2..7 fire recipes of slide 7 (`Weapon Hit 71 Senjata`), copied verbatim
 * from the real `games/game-4/src/game/Game.ts` by `scripts/gen-set-seven.py`
 * (run it again after slide 7 changes; never edit this file by hand).
 *
 * Every body is slide 7's own: same FX classes, same particle counts, same
 * screen shake/flash, same sounds and the same projectile classes (the real
 * `projectiles*.ts` constructors, collected in `host.shots`). Only the receiver
 * changed: slide 7's `this` (its game object) is now the slide-1 host of
 * `setSevenFx.ts`, which forwards particles, timers, shake, sound and wheel
 * paint to slide 1.
 */
''', fire_imports, "import type { SevenHost } from './setSevenFx';",
       "import type { SevenId } from './setSevenArt';", local_consts(fire_code), '']

for wid, meth in TARGETS.items():
    body = bodies[wid]
    if wid in GROW_FLAG:
        body = re.sub(r'\bgrow\b', GROW_FLAG[wid], body)
    body = body.replace('this.projectiles.push(new ', 'host.shots.push(new ')
    body = re.sub(r'new (\w+)\(this,', r'new \1(host.g,', body)
    body = re.sub(r'\bthis\.', 'host.', body)
    fire_out.append('export function fire_%s(host: SevenHost, mx: number, my: number) {%s}\n' % (wid, body))

fire_out.append('/** Slide-7 fire recipe per weapon (all 65 of SET 2..7). */')
fire_out.append('export const FIRE_RECIPES = {')
for wid in TARGETS:
    fire_out.append('  %s: fire_%s,' % (wid, wid))
fire_out.append('} as const satisfies Record<SevenId, (host: SevenHost, mx: number, my: number) => void>;\n')
open(os.path.join(OUT, 'setSevenFire.ts'), 'w').write('\n'.join(fire_out))
print('wrote setSevenFire.ts')

# ──────────────────────── animation springs + ambience ──────────────────────
start = next(i for i, l in enumerate(lines) if '// weapon animation state' in l)
switch_at = next(i for i in range(start, len(lines)) if 'switch (this.weaponId)' in lines[i])
depth, end = 0, None
for i in range(switch_at, len(lines)):
    depth += lines[i].count('{') - lines[i].count('}')
    if depth == 0 and i > switch_at:
        end = i
        break
assert end is not None

anim_part = lines[start:switch_at]
ambience = lines[switch_at:end + 1]

# keep only the cases of the 36 weapons we port
head, cases = ambience[0], []
text = '\n'.join(ambience[1:])
for chunk in re.split(r'(?=\n      case )', text):
    m = re.match(r"\n      case '(\w+)'", chunk)
    if m:
        if m.group(1) in TARGETS:
            cases.append(chunk.rstrip().rstrip('}').rstrip())
    elif 'default:' in chunk:
        continue
    else:
        cases.append(chunk.rstrip().rstrip('}').rstrip())
ambience_text = head + '\n' + '\n'.join(cases) + '\n    }'

anim_code = '\n'.join(anim_part) + '\n' + ambience_text
anim_code = re.sub(r'\bthis\.weaponId\b', 'host.weaponId', anim_code)
anim_code = re.sub(r'\bthis\.', 'host.', anim_code)
anim_code = anim_code.replace('GUN_X', 'host.gunX').replace('GUN_Y', 'host.gunY')
anim_imports, _ = import_header(anim_code, "import * as S from '../../../../games/game-4/src/game/spawn7';")

anim_out = ['''/**
 * Slide-7 weapon animation and idle ambience of SET 2..7, copied verbatim from
 * `games/game-4/src/game/Game.ts` by `scripts/gen-set-seven.py`.
 *
 * `updateSevenAnim` integrates the same springs slide 7 does (recoil, slide,
 * pump, bolt, heat, spin, charge, orb, pouch, tassel, gauge, fuse, fan) and then
 * spawns the same idle particles for the selected weapon — the snow drifting off
 * the SNOWBALL CANNON, the embers of the FLAMETHROWER, the dripping honey, the
 * storm's little lightning bolts, and so on. That is what makes the gun look
 * alive on slide 1 exactly as it does on slide 7.
 */''', anim_imports, "import type { SevenHost } from './setSevenFx';"]
anim_out.append(local_consts(anim_code))
anim_out.append('')
anim_out.append('/** Slide-7 frame update: springs first, then the idle ambience. */')
anim_out.append('export function updateSevenAnim(host: SevenHost, dt: number) {')
anim_out.append(anim_code)
anim_out.append('}\n')
open(os.path.join(OUT, 'setSevenAnim.ts'), 'w').write('\n'.join(anim_out))
print('wrote setSevenAnim.ts')
