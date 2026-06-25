import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BudgetForm } from "@/components/BudgetForm";

describe("BudgetForm", () => {
  it("renders form fields and submit button", () => {
    render(<BudgetForm onSetBudget={vi.fn()} />);
    expect(screen.getByText("Per-Tx Limit")).toBeInTheDocument();
    expect(screen.getByText("Daily Limit")).toBeInTheDocument();
    expect(screen.getByText("Set Budget")).toBeDisabled();
  });

  it("enables submit when all fields filled", () => {
    render(<BudgetForm onSetBudget={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("G..."), {
      target: { value: "GA7Q3B7V6QV4" },
    });
    const numberInputs = screen.getAllByPlaceholderText(/100/);
    fireEvent.change(numberInputs[0], { target: { value: "1000" } });
    fireEvent.change(numberInputs[1], { target: { value: "10000" } });
    expect(screen.getByText("Set Budget")).not.toBeDisabled();
  });

  it("calls onSetBudget with correct values", async () => {
    const onSetBudget = vi.fn().mockResolvedValue(undefined);
    render(<BudgetForm onSetBudget={onSetBudget} />);
    fireEvent.change(screen.getByPlaceholderText("G..."), {
      target: { value: "GA7Q3B7V6QV4" },
    });
    const numberInputs = screen.getAllByPlaceholderText(/100/);
    fireEvent.change(numberInputs[0], { target: { value: "1000" } });
    fireEvent.change(numberInputs[1], { target: { value: "10000" } });

    fireEvent.click(screen.getByText("Set Budget"));
    expect(onSetBudget).toHaveBeenCalledWith("GA7Q3B7V6QV4", "1000", "10000");
  });

  it("shows error on failure", async () => {
    const onSetBudget = vi.fn().mockRejectedValue(new Error("RPC error"));
    render(<BudgetForm onSetBudget={onSetBudget} />);
    fireEvent.change(screen.getByPlaceholderText("G..."), {
      target: { value: "GA7Q3B7V6QV4" },
    });
    const numberInputs = screen.getAllByPlaceholderText(/100/);
    fireEvent.change(numberInputs[0], { target: { value: "1000" } });
    fireEvent.change(numberInputs[1], { target: { value: "10000" } });

    fireEvent.click(screen.getByText("Set Budget"));
    expect(await screen.findByText(/RPC error/)).toBeInTheDocument();
  });
});
