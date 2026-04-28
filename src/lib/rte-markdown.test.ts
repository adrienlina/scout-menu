import { describe, it, expect } from "vitest";
import { serializeToMarkdown, parseMarkdown } from "./rte-markdown";

function roundTrip(markdown: string): string {
  const doc = parseMarkdown(markdown);
  if (!doc) throw new Error("parse returned null");
  return serializeToMarkdown(doc).trim();
}

describe("rte-markdown round-trip", () => {
  it("preserves plain paragraph", () => {
    expect(roundTrip("Hello world")).toBe("Hello world");
  });

  it("preserves bold", () => {
    expect(roundTrip("**bold text**")).toBe("**bold text**");
  });

  it("preserves italic", () => {
    expect(roundTrip("*italic text*")).toBe("*italic text*");
  });

  it("preserves heading level 2", () => {
    expect(roundTrip("## Titre")).toBe("## Titre");
  });

  it("preserves bullet list items", () => {
    const result = roundTrip("* item one\n* item two\n* item three");
    expect(result).toContain("* item one");
    expect(result).toContain("* item two");
    expect(result).toContain("* item three");
  });

  it("preserves ordered list items", () => {
    const result = roundTrip("1. first\n2. second\n3. third");
    expect(result).toContain("1. first");
    expect(result).toContain("2. second");
    expect(result).toContain("3. third");
  });

  it("preserves blockquote", () => {
    expect(roundTrip("> a quote")).toBe("> a quote");
  });

  it("preserves inline code", () => {
    expect(roundTrip("use `code` here")).toBe("use `code` here");
  });

  it("parses markdown to a ProseMirror doc node", () => {
    const doc = parseMarkdown("* foo\n* bar");
    expect(doc).not.toBeNull();
    expect(doc?.type.name).toBe("doc");
  });

  it("serialized bullet list contains markdown list syntax", () => {
    const doc = parseMarkdown("* apple\n* banana");
    if (!doc) throw new Error("parse returned null");
    const result = serializeToMarkdown(doc);
    expect(result).toContain("* apple");
    expect(result).toContain("* banana");
  });

  it("plain text (legacy descriptions) parses without throwing", () => {
    expect(() => roundTrip("Simple description without formatting")).not.toThrow();
  });
});
