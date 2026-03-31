import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RichTextEditor } from "../RichTextEditor";

describe("RichTextEditor heading toggle", () => {
  it("applies H1 to the current paragraph", async () => {
    const onChange = vi.fn();
    render(
      <RichTextEditor content="<p>Hello world</p>" onChange={onChange} editable />
    );

    fireEvent.click(screen.getByTitle("Titre 1"));
    await waitFor(() => {
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];
      expect(lastCall).toMatch(/<h1>.*Hello world.*<\/h1>/);
    });
  });

  it("removes H1 when clicking H1 on an existing H1 (toggle off)", async () => {
    const onChange = vi.fn();
    render(
      <RichTextEditor content="<h1>Already a title</h1>" onChange={onChange} editable />
    );

    // Content starts as h1, clicking H1 should toggle it back to paragraph
    fireEvent.click(screen.getByTitle("Titre 1"));
    await waitFor(() => {
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];
      expect(lastCall).not.toMatch(/<h1>/);
      expect(lastCall).toMatch(/<p>.*Already a title.*<\/p>/);
    });
  });

  it("toggles H2 on", async () => {
    const onChange = vi.fn();
    render(
      <RichTextEditor content="<p>Some text</p>" onChange={onChange} editable />
    );

    fireEvent.click(screen.getByTitle("Titre 2"));
    await waitFor(() => {
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];
      expect(lastCall).toMatch(/<h2>.*Some text.*<\/h2>/);
    });
  });

  it("toggles H2 off when already H2", async () => {
    const onChange = vi.fn();
    render(
      <RichTextEditor content="<h2>Subtitle</h2>" onChange={onChange} editable />
    );

    fireEvent.click(screen.getByTitle("Titre 2"));
    await waitFor(() => {
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];
      expect(lastCall).not.toMatch(/<h2>/);
      expect(lastCall).toMatch(/<p>.*Subtitle.*<\/p>/);
    });
  });

  it("switches from H1 to H2 when clicking H2 while H1 is active", async () => {
    const onChange = vi.fn();
    render(
      <RichTextEditor content="<h1>Title</h1>" onChange={onChange} editable />
    );

    fireEvent.click(screen.getByTitle("Titre 2"));
    await waitFor(() => {
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];
      expect(lastCall).toMatch(/<h2>.*Title.*<\/h2>/);
      expect(lastCall).not.toMatch(/<h1>/);
    });
  });
});
