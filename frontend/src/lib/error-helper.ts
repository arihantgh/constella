export function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("budget exceeded") || m.includes("over limit")) {
    return "Budget exceeded — the payment is larger than the agent's per-tx or daily limit.";
  }
  if (m.includes("agent inactive") || m.includes("not active")) {
    return "One of the agents is inactive. Register or reactivate the agent first.";
  }
  if (m.includes("insufficient balance")) {
    return "Insufficient balance — fund the source account and try again.";
  }
  if (m.includes("transaction failed")) {
    return "The transaction failed on-chain. Check the agent status and budget limits.";
  }
  if (m.includes("unable to simulate") || m.includes("simulation failed")) {
    return "The network could not simulate this transaction. Try again in a few seconds.";
  }
  return message;
}
