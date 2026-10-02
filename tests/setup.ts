import { afterEach } from "vitest";

// Los tests de componentes usan jsdom (ver `// @vitest-environment jsdom` en cada archivo).
if (typeof window !== "undefined") {
  await import("@testing-library/jest-dom/vitest");
  const { cleanup } = await import("@testing-library/react");
  afterEach(() => cleanup());
}

// jsdom no implementa scrollTo.
if (typeof window !== "undefined") window.scrollTo = () => {};
