import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBreakpoint } from "../shared/hooks/useBreakpoint";

type Listener = () => void;

function installMatchMedia() {
  const listeners = new Set<Listener>();
  const mql = (query: string) => {
    const min = Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0);
    return {
      get matches() {
        return window.innerWidth >= min;
      },
      media: query,
      addEventListener: (_: string, cb: Listener) => listeners.add(cb),
      removeEventListener: (_: string, cb: Listener) => listeners.delete(cb),
    } as unknown as MediaQueryList;
  };
  vi.stubGlobal("matchMedia", mql);
  return {
    resize(width: number) {
      Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
      listeners.forEach((cb) => cb());
    },
    listenerCount: () => listeners.size,
  };
}

describe("useBreakpoint", () => {
  let media: ReturnType<typeof installMatchMedia>;
  let originalWidth: number;

  beforeEach(() => {
    originalWidth = window.innerWidth;
    media = installMatchMedia();
  });

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
    vi.unstubAllGlobals();
  });

  it("reports the breakpoint for the initial viewport width", () => {
    media.resize(1280);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.name).toBe("desktop");
  });

  it("updates when the viewport crosses a breakpoint", () => {
    media.resize(1280);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.name).toBe("desktop");

    act(() => media.resize(800));
    expect(result.current.name).toBe("tablet");

    act(() => media.resize(375));
    expect(result.current.name).toBe("mobile");
  });

  it("cleans up media query listeners on unmount", () => {
    media.resize(1280);
    const { unmount } = renderHook(() => useBreakpoint());
    expect(media.listenerCount()).toBeGreaterThan(0);
    unmount();
    expect(media.listenerCount()).toBe(0);
  });
});
