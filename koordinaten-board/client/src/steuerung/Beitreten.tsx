import { useState } from 'react';
import { Icon } from '../komponenten/Icon';
import { Gruppe } from '../komponenten/Eingaben';

export function Beitreten({ fertig }: { fertig: (token: string, name: string) => void }) {
  const parameter = new URLSearchParams(location.search);
  const [pin, setPin] = useState(parameter.get('pin') ?? '');
  const [name, setName] = useState(() => localStorage.getItem('kb-name') ?? '');
  const [fehler, setFehler] = useState('');
  const [laeuft, setLaeuft] = useState(false);

  const absenden = async (e: React.FormEvent) => {
    e.preventDefault();
    setFehler('');
    setLaeuft(true);
    try {
      const antwort = await fetch('/api/beitreten', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim(), name: name.trim() }),
      });
      const daten = await antwort.json();
      if (!antwort.ok) throw new Error(daten.fehler ?? 'Beitritt fehlgeschlagen');
      // PIN aus der Adresszeile entfernen, damit sie nicht im Verlauf landet
      history.replaceState(null, '', '/');
      fertig(daten.token, daten.name);
    } catch (err) {
      setFehler(err instanceof Error ? err.message : 'Board nicht erreichbar');
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <form className="beitreten" onSubmit={absenden}>
      <div className="title-row">
        <span className="compass"><Icon name="kompass" groesse={26} /></span>
        <h1>Koordinaten-Board</h1>
      </div>
      <p>Gib die PIN von der Anzeige ein und wie du heißen willst – dein Name steht dann bei deinen Einträgen.</p>
      <Gruppe label="PIN">
        <input
          className="eingabe pin-eingabe"
          inputMode="numeric"
          maxLength={4}
          autoComplete="one-time-code"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
        />
      </Gruppe>
      <Gruppe label="Dein Name">
        <input
          className="eingabe"
          maxLength={24}
          autoComplete="nickname"
          placeholder="z. B. Max"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus={pin.length === 4}
        />
      </Gruppe>
      {fehler && <div className="banner bad">{fehler}</div>}
      <button className="btn-primary" disabled={laeuft || pin.length !== 4 || !name.trim()}>
        {laeuft ? 'Verbinde …' : 'Beitreten'}
      </button>
    </form>
  );
}
