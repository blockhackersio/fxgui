import { Assets } from "@/types";
import { Button } from "@chakra-ui/react";
import { Token } from "@fxgui/core";
import { TokenLogo } from "@/ui/TokenLogo";

export function TokenButton({
  token,
  disabled,
  onClick,
  assets,
}: {
  token: Token;
  disabled?: boolean;
  onClick?: (v: string) => void;
  assets: Assets;
}) {
  return (
    <Button
      justifyContent="flex-start"
      isDisabled={disabled}
      onClick={() => {
        onClick && onClick(token.id);
      }}
      gap={2}
    >
      <TokenLogo tokenId={token.id} assets={assets.assets} />
      <span>{token.id}</span>
    </Button>
  );
}
