import { TargetArt } from "../play/TargetArt";
import { NEW_KINDS, NEW_NAMES } from "../play/TargetArt2";
import { HEAD_INFO, HEAD_KINDS } from "../play/HeadArt";

/** open the app with ?roda to see every wheel design */
export function TargetGallery() {
  return (
    <div className="min-h-full overflow-auto bg-[radial-gradient(circle_at_center,#24424a,#0b1519)] p-5">
      <h1 className="font-title mb-4 text-center text-2xl text-white">10 RODA BARU</h1>
      <div className="mx-auto grid max-w-[460px] grid-cols-2 gap-4">
        {NEW_KINDS.map((k) => (
          <div key={k} className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-black/25 p-3">
            <TargetArt kind={k} className="spin-slow h-36 w-36 drop-shadow-[0_10px_14px_rgba(0,0,0,.5)]" />
            <span className="font-title text-sm text-white">{NEW_NAMES[k].toUpperCase()}</span>
          </div>
        ))}
      </div>
      <h1 className="font-title mb-4 mt-8 text-center text-2xl text-white">10 KEPALA BOS</h1>
      <div className="mx-auto grid max-w-[460px] grid-cols-2 gap-4">
        {HEAD_KINDS.map((h) => (
          <div key={h} className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-black/25 p-3">
            <TargetArt kind="boss" head={h} className="h-36 w-36 drop-shadow-[0_10px_14px_rgba(0,0,0,.5)]" />
            <span className="font-title text-sm text-white">{HEAD_INFO[h].name.toUpperCase()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
