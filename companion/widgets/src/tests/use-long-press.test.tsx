import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  LONG_PRESS_DELAY,
  LONG_PRESS_MOVE_THRESHOLD,
  useLongPress,
} from "../features/workspace/hooks/useLongPress";

function reactPointerDown(x = 100, y = 100, pointerId = 1, button = 0) {
  return { pointerId, clientX: x, clientY: y, button } as unknown as ReactPointerEvent;
}

function dispatch(type: string, x: number, y: number, pointerId = 1) {
  const ev = new Event(type, { bubbles: true });
  Object.assign(ev, { pointerId, clientX: x, clientY: y });
  window.dispatchEvent(ev);
}

describe("useLongPress", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("fires once after the delay when the pointer stays still", () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useLongPress<string>(cb));
    result.current.start(reactPointerDown(), "panel-a");
    vi.advanceTimersByTime(LONG_PRESS_DELAY - 1);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith("panel-a");
    vi.advanceTimersByTime(LONG_PRESS_DELAY);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("does not fire when the pointer is released early", () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useLongPress<string>(cb));
    result.current.start(reactPointerDown(), "a");
    vi.advanceTimersByTime(200);
    dispatch("pointerup", 100, 100);
    vi.advanceTimersByTime(LONG_PRESS_DELAY);
    expect(cb).not.toHaveBeenCalled();
  });

  it("does not fire when the pointer moves beyond the threshold", () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useLongPress<string>(cb));
    result.current.start(reactPointerDown(), "a");
    dispatch("pointermove", 100 + LONG_PRESS_MOVE_THRESHOLD + 1, 100);
    vi.advanceTimersByTime(LONG_PRESS_DELAY);
    expect(cb).not.toHaveBeenCalled();
  });

  it("tolerates small jitter below the threshold", () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useLongPress<string>(cb));
    result.current.start(reactPointerDown(), "a");
    dispatch("pointermove", 103, 102);
    vi.advanceTimersByTime(LONG_PRESS_DELAY);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("is cancelled by pointercancel (e.g. scroll start on touch)", () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useLongPress<string>(cb));
    result.current.start(reactPointerDown(), "a");
    dispatch("pointercancel", 100, 100);
    vi.advanceTimersByTime(LONG_PRESS_DELAY);
    expect(cb).not.toHaveBeenCalled();
  });

  it("ignores events from other pointers", () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useLongPress<string>(cb));
    result.current.start(reactPointerDown(100, 100, 1), "a");
    dispatch("pointerup", 100, 100, 2);
    dispatch("pointermove", 500, 500, 2);
    vi.advanceTimersByTime(LONG_PRESS_DELAY);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("ignores secondary mouse buttons", () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useLongPress<string>(cb));
    result.current.start(reactPointerDown(100, 100, 1, 2), "a");
    vi.advanceTimersByTime(LONG_PRESS_DELAY);
    expect(cb).not.toHaveBeenCalled();
  });

  it("does not fire after unmount", () => {
    const cb = vi.fn();
    const { result, unmount } = renderHook(() => useLongPress<string>(cb));
    result.current.start(reactPointerDown(), "a");
    unmount();
    vi.advanceTimersByTime(LONG_PRESS_DELAY);
    expect(cb).not.toHaveBeenCalled();
  });
});
