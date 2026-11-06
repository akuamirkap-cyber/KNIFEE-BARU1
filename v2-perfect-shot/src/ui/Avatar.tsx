import player from '../assets/player.svg?raw';
/** Only the original player's map avatar, not a roster of other characters. */
export function Avatar({ className = '' }: { seed?: number; me?: boolean; bg?: boolean; className?: string }) {
  return <span className={`svg-asset block ${className}`} dangerouslySetInnerHTML={{ __html: player }} />;
}
