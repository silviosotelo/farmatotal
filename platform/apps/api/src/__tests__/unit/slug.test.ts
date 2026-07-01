import { describe, it, expect } from "vitest";

function slug(s: string, separator = "-", fallback = ""): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`(^${separator}+|${separator}+$)`, "g"), "") || fallback;
}

describe("slug", () => {
  it("generates slug from text", () => {
    expect(slug("Mi Producto")).toBe("mi-producto");
  });
  it("handles accents", () => {
    expect(slug("Café Especial")).toBe("cafe-especial");
  });
  it("uses custom separator", () => {
    expect(slug("Hello World", "_")).toBe("hello_world");
  });
  it("returns fallback for empty input", () => {
    expect(slug("", "-", "default")).toBe("default");
  });
  it("trims leading/trailing separators", () => {
    expect(slug("---hello---")).toBe("hello");
  });
});
