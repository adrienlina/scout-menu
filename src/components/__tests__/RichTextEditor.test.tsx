import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RichTextEditor } from "../RichTextEditor";

describe("RichTextEditor heading toggle", () => {
  it("toggles H1 on and off", async () => {
    const onChange = vi.fn();
    render(
      <RichTextEditor content="<p>Hello world</p>" onChange={onChange} editable />
    );

    const h1Button = screen.getByTitle("Titre 1");

    // Click H1 — should wrap content in <h1>
    fireEvent.click(h1Button);
    await waitFor(() => {
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];
      expect(lastCall).toMatch(/<h1>.*Hello world.*<\/h1>/);
    });

    // Click H1 again — should revert to <p>
    fireEvent.click(h1Button);
    await waitFor(() => {
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];
      expect(lastCall).not.toMatch(/<h1>/);
      expect(lastCall).toMatch(/<p>.*Hello world.*<\/p>/);
    });
  });

  it("toggles H2 on and off", async () => {
    const onChange = vi.fn();
    render(
      <RichTextEditor content="<p>Some text</p>" onChange={onChange} editable />
    );

    const h2Button = screen.getByTitle("Titre 2");

    fireEvent.click(h2Button);
    await waitFor(() => {
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];
      expect(lastCall).toMatch(/<h2>.*Some text.*<\/h2>/);
    });

    fireEvent.click(h2Button);
    await waitFor(() => {
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];
      expect(lastCall).not.toMatch(/<h2>/);
    });
  });

  it("switches from H1 to H2 when clicking H2 while H1 is active", async () => {
    const onChange = vi.fn();
    render(
      <RichTextEditor content="<h1>Title</h1>" onChange={onChange} editable />
    );

    const h2Button = screen.getByTitle("Titre 2");
    fireEvent.click(h2Button);
    await waitFor(() => {
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];
      expect(lastCall).toMatch(/<h2>.*Title.*<\/h2>/);
      expect(lastCall).not.toMatch(/<h1>/);
    });
  });
});
