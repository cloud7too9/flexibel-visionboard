import { useCallback, useEffect, useRef, useState } from 'react';
import type { BoardZustand, Operation } from './typen';

type Nachricht =
  | { art: 'zustand'; zustand: BoardZustand }
  | { art: 'teilnehmer'; namen: string[] }
  | { art: 'ok'; anfrage?: number }
  | { art: 'fehler'; text: string; anfrage?: number };

interface Optionen {
  /** Query-Teil für /ws, z. B. "rolle=anzeige" oder "token=…" */
  query: string | null;
  /** Wird aufgerufen, wenn der Server das Token ablehnt */
  beiAbgelehnt?: (code: number) => void;
}

/** Hält die Live-Verbindung zum Board, verbindet automatisch neu. */
export function useBoard({ query, beiAbgelehnt }: Optionen) {
  const [zustand, setZustand] = useState<BoardZustand | null>(null);
  const [verbunden, setVerbunden] = useState(false);
  const [teilnehmer, setTeilnehmer] = useState<string[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const offen = useRef(new Map<number, { ok: () => void; fehler: (t: string) => void }>());
  const zaehler = useRef(0);
  const abgelehntRef = useRef(beiAbgelehnt);
  abgelehntRef.current = beiAbgelehnt;

  useEffect(() => {
    if (!query) return;
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
        else if (n.art === 'ok' && n.anfrage) {
          offen.current.get(n.anfrage)?.ok();
          offen.current.delete(n.anfrage);
        } else if (n.art === 'fehler' && n.anfrage) {
          offen.current.get(n.anfrage)?.fehler(n.text);
          offen.current.delete(n.anfrage);
        }
      };
      socket.onclose = (e) => {
        setVerbunden(false);
        for (const w of offen.current.values()) w.fehler('Verbindung unterbrochen');
        offen.current.clear();
        if (beendet) return;
        if (e.code === 4001 || e.code === 4003) {
          abgelehntRef.current?.(e.code);
          return;
        }
        timer = window.setTimeout(verbinden, wartezeit);
        wartezeit = Math.min(wartezeit * 2, 8000);
      };
    };

    verbinden();
    // Handy aus dem Standby zurück → sofort neu verbinden statt Backoff abzuwarten
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

  const senden = useCallback((op: Operation) => {
    return new Promise<void>((ok, fehler) => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) return fehler('Keine Verbindung');
      const anfrage = ++zaehler.current;
      offen.current.set(anfrage, { ok, fehler });
      socket.send(JSON.stringify({ ...op, anfrage }));
      window.setTimeout(() => {
        if (offen.current.delete(anfrage)) fehler('Zeitüberschreitung');
      }, 8000);
    });
  }, []);

  return { zustand, verbunden, teilnehmer, senden };
}
