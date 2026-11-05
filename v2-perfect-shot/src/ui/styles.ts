/** Scoped to .ps-v2: embedding it must not restyle a single v1 element. */
export const STYLES = `
.ps-v2{--ps-mint:#86f5cf;--ps-ink:#e9f1e8;--ps-muted:#92abb9;position:relative;width:100%;height:100%;overflow:hidden;isolation:isolate;background:#070e1b;color:var(--ps-ink);font-family:Arial,"DejaVu Sans",sans-serif;user-select:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation;color-scheme:dark}
.ps-v2 *{box-sizing:border-box}
.ps-v2 [hidden]{display:none!important}
.ps-v2 button,.ps-v2 a{font:inherit;color:inherit;-webkit-tap-highlight-color:transparent}
.ps-v2 button{appearance:none;cursor:pointer;touch-action:manipulation}
.ps-v2 button:disabled{cursor:default}
.ps-v2 button:focus-visible,.ps-v2 a:focus-visible{outline:3px solid #c1ffe8;outline-offset:4px}
.ps-v2 button:not(:disabled):active{transform:translateY(2px)}
.ps-v2 h1,.ps-v2 h2,.ps-v2 h3,.ps-v2 p{margin:0}
.ps-stage{position:absolute;left:50%;top:50%;width:480px;height:960px;transform-origin:center;overflow:hidden;background:#0a1322}
.ps-board{position:absolute;inset:0;display:block;width:480px;height:960px;touch-action:none}
.ps-icon{display:inline-block;width:21px;height:21px;flex-shrink:0;vertical-align:middle}
.ps-topbar{position:absolute;z-index:6;inset:23px 24px auto;display:flex;align-items:center;gap:9px;height:42px}
.ps-brand{display:flex;gap:10px;align-items:center;margin-right:auto;line-height:1.15}
.ps-brand-mark{display:grid;place-items:center;width:36px;height:36px;border-radius:12px;border:1px solid #81efd34a;background:#82f3d00b;color:var(--ps-mint);box-shadow:0 0 24px #8affd00b}
.ps-brand-mark .ps-icon{width:23px;height:23px}
.ps-brand strong{display:block;font-size:12px;font-weight:900;letter-spacing:.8px}
.ps-brand small{display:block;margin-top:4px;color:#89a7b5;font-size:8px;letter-spacing:2.2px;font-weight:700}
.ps-wallet{height:34px;display:flex;align-items:center;gap:6px;background:#f7ce7920;color:#ffe09b;border:1px solid #eec27835;border-radius:10px;padding:0 10px;font-size:13px;font-weight:800;font-variant-numeric:tabular-nums}
.ps-wallet .ps-icon{width:17px;height:17px}
.ps-icon-button{display:grid;place-items:center;width:35px;height:35px;flex-shrink:0;padding:0;border:1px solid #8bafbf2d;border-radius:11px;background:#142639a6;color:#c0d4d8}
.ps-icon-button .ps-icon{width:18px;height:18px}
.ps-home{position:absolute;inset:0;pointer-events:none}
.ps-home button{pointer-events:auto}
.ps-hero{position:absolute;top:99px;left:24px;right:24px;text-align:center}
.ps-eyebrow{color:#a7c8c8;font-size:9px;font-weight:800;letter-spacing:3px;line-height:1.4;text-transform:uppercase}
.ps-hero h1{font-size:62px;font-weight:950;letter-spacing:-3.6px;line-height:.88;margin:13px 0 10px;text-shadow:0 4px 0 #030d1b66}
.ps-hero h1 span{display:block;color:var(--ps-mint);letter-spacing:0}
.ps-hero p{font-size:12px;color:#b3c7c9;letter-spacing:.4px}
.ps-home-bottom{position:absolute;top:604px;left:31px;right:31px;text-align:center}
.ps-stat-row{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:18px}
.ps-mini-stat{padding:11px 5px 10px;border:1px solid #96c5c81e;background:linear-gradient(160deg,#182c3c7d,#0d1a2c7a);border-radius:13px}
.ps-mini-stat small{display:block;font-size:8px;letter-spacing:1.6px;color:#8da9b7;font-weight:800;margin-bottom:5px}
.ps-mini-stat strong{font-size:19px;font-weight:800;color:#e6f0e6;line-height:1.1;font-variant-numeric:tabular-nums}
.ps-mini-stat em{font-size:11px;font-style:normal;color:#94adb6;margin-left:3px}
.ps-primary{display:flex;align-items:center;justify-content:center;gap:12px;width:100%;min-height:61px;padding:15px 21px;border:1px solid #c9ffdf7a;border-radius:15px;color:#0c312e!important;background:linear-gradient(120deg,#a2ffda,#6bdfba);box-shadow:0 5px 0 #245f55,0 12px 33px #69d7ad16;font-size:14px!important;font-weight:900!important;letter-spacing:.7px;text-align:left}
.ps-primary .ps-icon{width:22px;height:22px}
.ps-primary .ps-arrow{margin-left:auto}
.ps-primary span{flex:1}
.ps-primary small{display:block;font-size:10px;letter-spacing:.3px;font-weight:600;opacity:.66;margin-top:4px}
.ps-primary:disabled{box-shadow:none;background:#1e3242;border-color:#a8d3d320;color:#7c96a5!important}
.ps-secondary{display:flex;align-items:center;justify-content:center;gap:8px;min-height:49px;padding:12px 17px;border:1px solid #93c2ca2b;border-radius:12px;background:linear-gradient(140deg,#20384b95,#14273b95);color:#c3dbdc;font-size:11px!important;font-weight:800!important;letter-spacing:1px}
.ps-secondary .ps-icon{width:19px;height:19px;color:#9dc6c5}
.ps-home-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}
.ps-home-links{display:flex;gap:25px;justify-content:center;align-items:center;margin-top:24px}
.ps-text-button{border:0;background:transparent;padding:5px 0;font-size:10px!important;letter-spacing:.4px;font-weight:700!important;color:#a4bec1!important;display:inline-flex;gap:7px;align-items:center}
.ps-text-button .ps-icon{width:15px;height:15px}
.ps-home-foot{margin-top:23px;font-size:8px;letter-spacing:1.4px;color:#688a99;text-transform:uppercase;line-height:1.7}
.ps-play-ui{position:absolute;inset:auto 35px 17px;display:flex;justify-content:center;pointer-events:none}
.ps-fire-button{pointer-events:auto;display:flex;flex-direction:column;align-items:center;gap:5px;min-height:43px;min-width:200px;border:0;background:transparent;padding:8px 12px;color:#a6c2c5;font-size:10px!important;font-weight:800!important;letter-spacing:1.7px}
.ps-fire-button small{font-size:8px;letter-spacing:1px;color:#6d8e9f;font-weight:500}
.ps-fire-button kbd{font-family:inherit;font-size:8px;background:#162c3d;padding:2px 5px;border-radius:3px;border:1px solid #567c8b50;box-shadow:0 1px 0 #6b8f9950;margin:0 3px}
.ps-overlay{position:absolute;z-index:5;inset:77px 0 0;padding:20px 23px 37px;display:flex;align-items:center;justify-content:center;background:linear-gradient(#08132683,#050c18ec 40%,#050b17f5);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}
.ps-panel{position:relative;width:100%;max-height:100%;display:flex;flex-direction:column;border:1px solid #a3c4cf26;border-radius:24px;background:linear-gradient(150deg,#172c3e,#0c1b30 65%);box-shadow:0 20px 80px #0006;overflow:hidden;animation:ps-enter .22s ease-out}
.ps-panel-tall{height:100%}
.ps-sheet-head{display:flex;align-items:center;justify-content:space-between;padding:24px 23px 19px;gap:12px;border-bottom:1px solid #9bbdcb16;flex-shrink:0}
.ps-sheet-head h2{font-size:25px;font-weight:900;letter-spacing:-.7px;margin-top:5px}
.ps-sheet-head .ps-eyebrow{font-size:8px;letter-spacing:2px;color:#93c3bd}
.ps-sheet-head .ps-icon-button{width:34px;height:34px}
.ps-scroll{overflow:auto;overscroll-behavior:contain;touch-action:pan-y;scrollbar-width:thin;scrollbar-color:#496778 #0b1a2c;min-height:0;flex:1;padding:20px 22px}
.ps-panel-foot{padding:17px 22px 21px;border-top:1px solid #9bbdcb16;background:#08182770;flex-shrink:0}
.ps-result-body{padding:29px 26px 25px;text-align:center}
.ps-medal{display:grid;place-items:center;width:73px;height:73px;border-radius:24px;background:linear-gradient(135deg,#8df5c52b,#8df5c509);border:1px solid #8df5c547;margin:0 auto 20px;color:var(--ps-mint);transform:rotate(-8deg)}
.ps-medal .ps-icon{width:36px;height:36px;transform:rotate(8deg)}
.ps-result-body.ps-failed .ps-medal{background:#ff94a016;border-color:#ff94a047;color:#ff9cad}
.ps-result-body .ps-eyebrow{font-size:9px;color:#9fc7be;letter-spacing:2px}
.ps-result-body h2{font-size:34px;font-weight:900;letter-spacing:-1.2px;line-height:1.08;margin-top:9px}
.ps-result-body>p{font-size:12px;line-height:1.6;color:#9bb5c1;margin-top:10px}
.ps-stars{color:#ffd483;letter-spacing:8px;font-size:27px;margin:16px 0 21px;text-indent:8px}
.ps-stars .ps-empty-star{color:#42596b}
.ps-reward-strip{display:flex;justify-content:center;gap:18px;align-items:center;padding:11px;border-radius:11px;background:#f4cd7910;border:1px solid #f4cd7925;color:#ffe0a1;font-size:12px;font-weight:800;margin-bottom:18px}
.ps-reward-strip span{display:flex;align-items:center;gap:6px}
.ps-reward-strip .ps-icon{width:16px;height:16px}
.ps-result-stats{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:0 0 21px}
.ps-result-stats>div{padding:13px 10px;background:#07162680;border:1px solid #a5d3da17;border-radius:12px}
.ps-result-stats small{display:block;font-size:8px;letter-spacing:1.2px;color:#829fad;font-weight:700;margin-bottom:6px}
.ps-result-stats strong{font-size:22px;font-weight:800;color:#deeee7;font-variant-numeric:tabular-nums}
.ps-inline-actions{display:flex;justify-content:center;gap:24px;margin-top:19px}
.ps-new-best{display:inline-block;margin-top:12px;border-radius:6px;padding:5px 8px;background:#ffdb8117;color:#ffdc91;font-size:9px;letter-spacing:1px;font-weight:800}
.ps-pause-body{padding:30px 27px;text-align:center}
.ps-pause-body .ps-medal{margin-bottom:18px}
.ps-pause-body h2{font-size:34px;font-weight:900;letter-spacing:-1px;margin-bottom:9px}
.ps-pause-body>p{font-size:12px;line-height:1.6;color:#a3bcc3;margin:0 0 26px}
.ps-pause-actions{display:grid;gap:13px}
.ps-pause-actions .ps-secondary{width:100%}
.ps-armory-hero{display:flex;align-items:center;min-height:174px;margin-bottom:19px;background:radial-gradient(ellipse at 20% 40%,#89dfdf16,transparent 75%);border:1px solid #a4c9d21e;border-radius:17px;padding:8px}
.ps-armory-hero canvas{width:145px;height:165px;object-fit:contain;flex-shrink:0}
.ps-armory-info{padding:9px 12px 9px 2px}
.ps-rarity{display:inline-block;font-size:8px;font-weight:800;letter-spacing:1.5px;border:1px solid #b8c9d53d;padding:4px 6px;border-radius:5px;color:#b8c9d5}
.ps-rarity[data-rarity="RARE"]{color:#8fdaf3;border-color:#8fdaf33d}
.ps-rarity[data-rarity="EPIC"]{color:#bfabff;border-color:#bfabff3d}
.ps-rarity[data-rarity="LEGENDARY"]{color:#ffdf99;border-color:#ffdf993d}
.ps-armory-info h3{font-size:20px;font-weight:800;letter-spacing:-.4px;line-height:1.1;margin:9px 0}
.ps-armory-info p{font-size:10px;line-height:1.6;color:#95afbe}
.ps-armory-info small{display:block;color:#c0d5d2;font-size:9px;margin-top:10px}
.ps-section-label{display:flex;justify-content:space-between;font-size:8px;letter-spacing:1.3px;font-weight:700;color:#8eacbb;margin-bottom:12px}
.ps-shop-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ps-item{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;height:169px;padding:9px;border:1px solid #9dbbd329;border-radius:15px;background:linear-gradient(145deg,#20394d80,#102338aa);overflow:hidden}
.ps-item[aria-pressed="true"]{border-color:#8af6d4aa;box-shadow:inset 0 0 20px #8af6d40a;background:linear-gradient(145deg,#28514f60,#102839aa)}
.ps-item canvas{width:111px;height:112px;object-fit:contain;filter:drop-shadow(0 4px 6px #0005)}
.ps-item strong{font-size:11px;font-weight:800;letter-spacing:.1px}
.ps-item small{display:flex;align-items:center;gap:4px;font-size:9px;color:#91b1b8;font-weight:700}
.ps-item small .ps-icon{width:11px;height:11px}
.ps-item.ps-locked canvas{opacity:.6}
.ps-item.ps-locked small{color:#e4c788}
.ps-item.ps-equipped::after{content:'✓';position:absolute;top:9px;right:10px;font-size:12px;font-weight:800;color:var(--ps-mint)}
.ps-shop-note{color:#7695a5;font-size:9px;text-align:center;line-height:1.7;margin-top:17px!important}
.ps-world{margin-bottom:19px}
.ps-world-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:11px;font-size:9px;font-weight:800;letter-spacing:1.2px;color:#a1c1c4}
.ps-world-head small{font-size:8px;color:#698c9c;letter-spacing:.8px}
.ps-map-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:5px}
.ps-node{position:relative;min-width:0;padding:6px 0 7px;border:1px solid #8fa9ca2a;border-radius:11px;background:#1d354783;display:flex;flex-direction:column;align-items:center;gap:4px}
.ps-node canvas{width:43px;height:43px;object-fit:contain}
.ps-node strong{font-size:10px;line-height:1;color:#d6e4df}
.ps-node small{color:#f0cd82;font-size:7px;letter-spacing:1px;min-height:8px;line-height:1}
.ps-node:disabled{opacity:.38}
.ps-node:disabled canvas{filter:grayscale(1)}
.ps-node.ps-boss{border-color:#b4a0fa62;background:#7e62b51a}
.ps-node.ps-current{border-color:#81f4d4;box-shadow:0 0 13px #8af6d415}
.ps-node .ps-lock-mark{position:absolute;top:17px;right:16px;color:#e5edf1;filter:drop-shadow(0 1px 2px #000)}
.ps-node .ps-lock-mark .ps-icon{width:14px;height:14px}
.ps-map-progress{margin-bottom:19px;border-radius:12px;background:#97e9cf0a;border:1px solid #97e9cf1f;padding:13px 14px}
.ps-map-progress>div:first-child{display:flex;justify-content:space-between;font-size:9px;font-weight:800;color:#b6d7d0;letter-spacing:.6px}
.ps-progress-track{height:4px;margin-top:11px;background:#b6e4dc16;border-radius:3px;overflow:hidden}
.ps-progress-track span{display:block;height:100%;background:#80e9c6;border-radius:3px}
.ps-map-foot{font-size:10px;color:#90acb9;line-height:1.7;text-align:center}
.ps-howto-lead{text-align:center;font-size:14px!important;line-height:1.65;color:#c6dbd8;margin:0 0 21px!important}
.ps-rule{display:flex;gap:14px;margin-bottom:19px;padding:15px;border-radius:13px;background:#07182861;border:1px solid #98bac91c}
.ps-rule>.ps-icon{width:25px;height:25px;margin-top:3px;color:var(--ps-mint)}
.ps-rule h3{font-size:12px;font-weight:800;margin-bottom:6px}
.ps-rule p{font-size:11px;color:#95aebc;line-height:1.7}
.ps-control-help{display:flex;flex-wrap:wrap;justify-content:center;gap:10px 16px;margin:22px 0;color:#9fb6c1;font-size:10px}
.ps-control-help kbd{font:700 10px Arial,sans-serif;display:inline-block;background:#233e51;border:1px solid #71909c45;border-radius:5px;padding:5px 7px;margin-right:4px;color:#e1eee6}
.ps-record-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-bottom:25px}
.ps-record{border:1px solid #93c4ce20;border-radius:14px;background:#0b1e306b;padding:17px 12px}
.ps-record small{display:block;color:#8cabb9;font-size:8px;letter-spacing:1px;font-weight:700;margin-bottom:7px}
.ps-record strong{font-size:25px;font-weight:800;font-variant-numeric:tabular-nums}
.ps-badge-row{display:flex;gap:12px;align-items:center;padding:14px 0;border-bottom:1px solid #98b8c718}
.ps-badge-row>.ps-icon{width:28px;height:28px;color:#f2cf8c}
.ps-badge-row.ps-badge-locked{opacity:.38}
.ps-badge-row div{flex:1}
.ps-badge-row strong{display:block;font-size:12px;margin-bottom:4px}
.ps-badge-row small{font-size:10px;color:#98b4bd}
.ps-badge-row>.ps-icon:last-child{width:17px;height:17px;color:var(--ps-mint)}
.ps-toast{position:absolute;z-index:10;left:50%;bottom:72px;transform:translateX(-50%);width:max-content;max-width:370px;padding:12px 18px;background:#173e3ded;border:1px solid #8cf2c76b;border-radius:12px;color:#d8ffee;font-size:12px;font-weight:700;text-align:center;box-shadow:0 6px 25px #0006;pointer-events:none;animation:ps-enter .15s ease-out}
.ps-sr-only{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important}
@keyframes ps-enter{from{opacity:0;translate:0 9px}to{opacity:1;translate:0 0}}
@media(hover:hover){.ps-v2 .ps-secondary:hover,.ps-v2 .ps-icon-button:hover{border-color:#a3dedb66;background-color:#284f5e99}.ps-v2 .ps-item:hover{border-color:#a8d7cf88}.ps-v2 .ps-primary:not(:disabled):hover{filter:brightness(1.07)}}
@media(prefers-reduced-motion:reduce){.ps-v2 *{animation:none!important;transition:none!important}.ps-v2 button:not(:disabled):active{transform:none}}
`;
