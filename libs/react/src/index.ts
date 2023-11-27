import { FxGui } from "@fxgui/core";
import { useSignal } from "@msig/react";

export function useFxGui<R, B>(e: FxGui<R, B>) {
  const {
    setTokenAFocus,
    setTokenBFocus,
    setTokenAInput,
    setTokenAId,
    setTokenBInput,
    setTokenBId,
  } = e;

  const tokenAInput = useSignal(e.tokenAInput);
  const tokenAId = useSignal(e.tokenAId);
  const tokenBInput = useSignal(e.tokenBInput);
  const tokenBId = useSignal(e.tokenBId);
  const breakdown = useSignal(e.breakdown);

  return {
    setTokenAInput,
    setTokenBInput,
    setTokenAId,
    setTokenBId,
    setTokenAFocus,
    setTokenBFocus,
    tokenAInput,
    tokenAId,
    tokenBInput,
    tokenBId,
    breakdown,
  };
}
