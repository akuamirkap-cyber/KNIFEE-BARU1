import App from './App';
import './index.css';

/** The standalone Perfect Shot game mounted inside the SGA side-by-side stage. */
export default function EmbeddedApp() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <App />
    </div>
  );
}
