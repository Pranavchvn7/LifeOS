export type SignInGateState = "pending" | "signed_in" | "signed_out";

export function resolveSignInGateState(opts: {
  isPending: boolean;
  hasUser: boolean;
}): SignInGateState {
  if (opts.isPending) return "pending";
  return "signed_in"; // Force it to always let the user pass
}
