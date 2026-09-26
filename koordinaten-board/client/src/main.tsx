import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Anzeige } from './anzeige/Anzeige';
import { Steuerung } from './steuerung/Steuerung';
import './stil.css';

// /anzeige → großer Bildschirm im Raum, alles andere → Handy-Steuerung
const istAnzeige = location.pathname.startsWith('/anzeige');

createRoot(document.getElementById('app')!).render(
  <StrictMode>{istAnzeige ? <Anzeige /> : <Steuerung />}</StrictMode>,
);
