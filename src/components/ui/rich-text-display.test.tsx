import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RichTextDisplay } from "./rich-text-display";

describe("RichTextDisplay", () => {
  it("renders nothing when content is null", () => {
    const { container } = render(<RichTextDisplay content={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when content is empty string", () => {
    const { container } = render(<RichTextDisplay content="" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders plain text", () => {
    render(<RichTextDisplay content="Hello world" />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders bold markdown as <strong>", () => {
    const { container } = render(<RichTextDisplay content="**bold**" />);
    expect(container.querySelector("strong")).not.toBeNull();
  });

  it("renders italic markdown as <em>", () => {
    const { container } = render(<RichTextDisplay content="*italic*" />);
    expect(container.querySelector("em")).not.toBeNull();
  });

  it("renders bullet list as <ul> with list items", () => {
    const { container } = render(<RichTextDisplay content={"* one\n* two"} />);
    expect(container.querySelector("ul")).not.toBeNull();
    const items = container.querySelectorAll("li");
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(container.textContent).toContain("one");
    expect(container.textContent).toContain("two");
  });

  it("renders ordered list as <ol> with list items", () => {
    const { container } = render(<RichTextDisplay content={"1. first\n2. second"} />);
    expect(container.querySelector("ol")).not.toBeNull();
    const items = container.querySelectorAll("li");
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(container.textContent).toContain("first");
    expect(container.textContent).toContain("second");
  });

  it("renders heading as <h2>", () => {
    const { container } = render(<RichTextDisplay content="## Section" />);
    expect(container.querySelector("h2")).not.toBeNull();
  });

  it("applies clamp class when clamp prop is true", () => {
    const { container } = render(<RichTextDisplay content="text" clamp />);
    expect(container.firstChild).toHaveClass("line-clamp-3");
  });

  it("does not apply clamp class by default", () => {
    const { container } = render(<RichTextDisplay content="text" />);
    expect(container.firstChild).not.toHaveClass("line-clamp-3");
  });

  it("forwards extra className", () => {
    const { container } = render(<RichTextDisplay content="text" className="mb-3" />);
    expect(container.firstChild).toHaveClass("mb-3");
  });
});
