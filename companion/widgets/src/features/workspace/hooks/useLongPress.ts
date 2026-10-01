import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";

export interface LongPressOptions {
  /** Dauer in Millisekunden, die gedrückt gehalten werden muss. */
  delay?: number;
  /** Bewegung in Pixeln, ab der der Vorgang als Verschieben/Scrollen gilt und abbricht. */
  moveThreshold?: number;
}

export const LONG_PRESS_DELAY = 500;
export const LONG_PRESS_MOVE_THRESHOLD = 8;

interface Pending {
  pointerId: number;
  startX: number;
  startY: number;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Erkennt „lange gedrückt halten ohne zu verschieben“.
 *
 * `start(e, id)` wird im `onPointerDown` aufgerufen. Bewegt sich der Zeiger
 * vor Ablauf der Zeit über die Schwelle hinaus oder wird losgelassen, passiert
 * nichts. Bleibt er ruhig, feuert `onLongPress(id)` genau einmal.
 *
 * Es wird bewusst kein Pointer-Capture gesetzt und kein `touch-action: none`
 * verlangt, damit auf Touch-Geräten weiterhin gescrollt werden kann: Ein
 * beginnender Scroll löst `pointercancel` aus und bricht den Vorgang ab.
 */
export function useLongPress<T>(
  onLongPress: (payload: T) => void,
  { delay = LONG_PRESS_DELAY, moveThreshold = LONG_PRESS_MOVE_THRESHOLD }: LongPressOptions = {},
) {
  const pendingRef = useRef<Pending | null>(null);
  const callbackRef = useRef(onLongPress);
  callbackRef.current = onLongPress;

  const cancel = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingRef.current = null;
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const pending = pendingRef.current;
      if (!pending || e.pointerId !== pending.pointerId) return;
      const dx = e.clientX - pending.startX;
      const dy = e.clientY - pending.startY;
      if (Math.hypot(dx, dy) > moveThreshold) cancel();
    };
    const onEnd = (e: PointerEvent) => {
      const pending = pendingRef.current;
      if (!pending || e.pointerId !== pending.pointerId) return;
      cancel();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      cancel();
    };
  }, [cancel, moveThreshold]);

  const start = useCallback(
    (e: ReactPointerEvent, payload: T) => {
      // Nur Primärtaste bzw. erster Finger.
      if (e.button !== 0) return;
      cancel();
      const timer = setTimeout(() => {
        pendingRef.current = null;
        callbackRef.current(payload);
      }, delay);
      pendingRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        timer,
      };
    },
    [cancel, delay],
  );

  return { start, cancel };
}
