import { Button, Stack } from "@chakra-ui/react";
import { ReactNode } from "react";

export function SwapButton(props: { children: ReactNode }) {
  return (
    <Stack spacing={6}>
      <Button
        size="lg"
        bg={"blue.400"}
        color={"white"}
        _hover={{
          bg: "blue.500",
        }}
      >
        {props.children}
      </Button>
    </Stack>
  );
}
