import "@testing-library/jest-dom";

if (typeof window !== "undefined") {
  const storage: Record<string, string> = {};
  const mockStorage = {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, value: string) => {
      storage[key] = String(value);
    },
    removeItem: (key: string) => {
      delete storage[key];
    },
    clear: () => {
      for (const k of Object.keys(storage)) {
        delete storage[k];
      }
    },
    get length() {
      return Object.keys(storage).length;
    },
    key: (index: number) => Object.keys(storage)[index] ?? null,
  };

  Object.defineProperty(window, "localStorage", {
    value: mockStorage,
    writable: true,
  });
  Object.defineProperty(globalThis, "localStorage", {
    value: mockStorage,
    writable: true,
  });
}
