import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Anzeige } from './anzeige/Anzeige';
import './stil.css';

// Der Client ist nur noch die Anzeige im Zimmer (/anzeige). Die Handys nutzen die
// Companion, die der Server unter / ausliefert.
createRoot(document.getElementById('app')!).render(
  <StrictMode><Anzeige /></StrictMode>,
);
