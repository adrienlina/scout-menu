import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CampShareDialog } from "../CampShareDialog";

const mockMutate = vi.fn();
const mockRemoveMutate = vi.fn();

vi.mock("@/hooks/useCampShares", () => ({
  useCampShares: () => ({
    data: [
      { id: "s1", camp_id: "camp1", invited_email: "alice@test.com", shared_by_user_id: "u1", created_at: "" },
    ],
  }),
  useAddCampShare: () => ({ mutate: mockMutate, isPending: false }),
  useRemoveCampShare: () => ({ mutate: mockRemoveMutate }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "owner1", email: "owner@test.com" } }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe("CampShareDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders share button with count badge", () => {
    render(<CampShareDialog campId="camp1" isOwner={true} />);
    expect(screen.getByText("Partager")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows shared emails when dialog is opened", async () => {
    render(<CampShareDialog campId="camp1" isOwner={true} />);
    fireEvent.click(screen.getByText("Partager"));
    await waitFor(() => {
      expect(screen.getByText("alice@test.com")).toBeInTheDocument();
    });
  });

  it("shows add form for owner", async () => {
    render(<CampShareDialog campId="camp1" isOwner={true} />);
    fireEvent.click(screen.getByText("Partager"));
    await waitFor(() => {
      expect(screen.getByPlaceholderText("email@exemple.com")).toBeInTheDocument();
      expect(screen.getByText("Ajouter")).toBeInTheDocument();
    });
  });

  it("hides add form for non-owner", async () => {
    render(<CampShareDialog campId="camp1" isOwner={false} />);
    fireEvent.click(screen.getByText("Partager"));
    await waitFor(() => {
      expect(screen.queryByPlaceholderText("email@exemple.com")).not.toBeInTheDocument();
    });
  });

  it("calls addShare on form submit", async () => {
    render(<CampShareDialog campId="camp1" isOwner={true} />);
    fireEvent.click(screen.getByText("Partager"));
    await waitFor(() => {
      expect(screen.getByPlaceholderText("email@exemple.com")).toBeInTheDocument();
    });
    const input = screen.getByPlaceholderText("email@exemple.com");
    fireEvent.change(input, { target: { value: "bob@test.com" } });
    fireEvent.click(screen.getByText("Ajouter"));
    expect(mockMutate).toHaveBeenCalledWith(
      { campId: "camp1", email: "bob@test.com", sharedByUserId: "owner1" },
      expect.any(Object),
    );
  });

  it("does not submit empty email", async () => {
    render(<CampShareDialog campId="camp1" isOwner={true} />);
    fireEvent.click(screen.getByText("Partager"));
    await waitFor(() => {
      expect(screen.getByText("Ajouter")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Ajouter"));
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("hides remove button for non-owner", async () => {
    render(<CampShareDialog campId="camp1" isOwner={false} />);
    fireEvent.click(screen.getByText("Partager"));
    await waitFor(() => {
      expect(screen.getByText("alice@test.com")).toBeInTheDocument();
    });
    // The shared email row should not have a remove button
    const emailRow = screen.getByText("alice@test.com").closest("div");
    const removeBtn = emailRow?.querySelector("button");
    expect(removeBtn).toBeNull();
  });
});
