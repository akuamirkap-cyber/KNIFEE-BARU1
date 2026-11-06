import { createRoot } from 'react-dom/client';
import PerfectShotLite from './App';
import './fonts.css';

const container = document.getElementById('app');
if (!container) throw new Error('The #app container is missing.');
createRoot(container).render(<PerfectShotLite />);
