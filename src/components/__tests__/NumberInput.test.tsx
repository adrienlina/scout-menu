import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
// @ts-expect-error -- component import
import { NumberInput } from "../NumberInput";

describe("NumberInput", () => {
  it("renders with the given value", () => {
    render(<NumberInput value={42} onChange={() => {}} />);
    expect(screen.getByRole("spinbutton")).toHaveValue(42);
  });

  it("allows a value of 0", () => {
    const onChange = vi.fn();
    render(<NumberInput value={5} onChange={onChange} min={0} />);
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "0" } });
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it("calls onChange with parsed integer", () => {
    const onChange = vi.fn();
    render(<NumberInput value={1} onChange={onChange} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "7" } });
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it("calls onChange with parsed float when allowDecimals", () => {
    const onChange = vi.fn();
    render(<NumberInput value={1} onChange={onChange} allowDecimals />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "0.001" } });
    expect(onChange).toHaveBeenCalledWith(0.001);
  });

  it("does not call onChange for values below min", () => {
    const onChange = vi.fn();
    render(<NumberInput value={5} onChange={onChange} min={0} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "-1" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("resets display to canonical value on blur", () => {
    render(<NumberInput value={10} onChange={() => {}} />);
    const input = screen.getByRole("spinbutton");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "abc" } });
    fireEvent.blur(input);
    expect(input).toHaveValue(10);
  });

  it("renders suffix text", () => {
    render(<NumberInput value={1} onChange={() => {}} suffix="g / kg" />);
    expect(screen.getByText("g / kg")).toBeInTheDocument();
  });
});
