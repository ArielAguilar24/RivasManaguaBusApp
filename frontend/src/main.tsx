import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables & custom MD3 tokens */
import './theme/variables.css';

/* Leaflet Map Styles */
import 'leaflet/dist/leaflet.css';

import { setupIonicReact } from '@ionic/react';

setupIonicReact();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
