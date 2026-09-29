import { useEffect, useRef, useState } from 'react';
import type { BoardZustand, GezeigteKarte } from './typen';

type Nachricht =
  | { art: 'zustand'; zustand: BoardZustand }
  | { art: 'teilnehmer'; namen: string[] }
  | { art: 'gezeigt'; karte: GezeigteKarte | null };

/** Hält die Live-Verbindung der Anzeige zum Board, verbindet automatisch neu. */
export function useBoard({ query }: { query: string }) {
  const [zustand, setZustand] = useState<BoardZustand | null>(null);
  const [verbunden, setVerbunden] = useState(false);
  const [teilnehmer, setTeilnehmer] = useState<string[]>([]);
  const [gezeigt, setGezeigt] = useState<GezeigteKarte | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let beendet = false;
    let wartezeit = 500;
    let timer: number | undefined;

    const verbinden = () => {
      const protokoll = location.protocol === 'https:' ? 'wss' : 'ws';
      const socket = new WebSocket(`${protokoll}://${location.host}/ws?${query}`);
      socketRef.current = socket;

      socket.onopen = () => {
        setVerbunden(true);
        wartezeit = 500;
      };
      socket.onmessage = (e) => {
        const n = JSON.parse(e.data) as Nachricht;
        if (n.art === 'zustand') setZustand(n.zustand);
        else if (n.art === 'teilnehmer') setTeilnehmer(n.namen);
        else if (n.art === 'gezeigt') setGezeigt(n.karte);
      };
      socket.onclose = () => {
        setVerbunden(false);
        if (beendet) return;
        timer = window.setTimeout(verbinden, wartezeit);
        wartezeit = Math.min(wartezeit * 2, 8000);
      };
    };

    verbinden();
    // Gerät aus dem Standby zurück → sofort neu verbinden statt Backoff abzuwarten
    const sichtbar = () => {
      if (document.visibilityState === 'visible' && socketRef.current?.readyState === WebSocket.CLOSED) {
        clearTimeout(timer);
        verbinden();
      }
    };
    document.addEventListener('visibilitychange', sichtbar);

    return () => {
      beendet = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', sichtbar);
      socketRef.current?.close();
    };
  }, [query]);

  return { zustand, verbunden, teilnehmer, gezeigt };
}
