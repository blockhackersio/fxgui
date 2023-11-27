import {
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputProps,
  InputRightAddon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Button,
  Stack,
} from "@chakra-ui/react";
import { Token } from "@fxgui/core";
import { ReactNode, useMemo, useState } from "react";
import { FiChevronDown } from "react-icons/fi";

function StyledInput(props: InputProps) {
  return <Input {...props} _placeholder={{ color: "gray.500" }} />;
}
type TokenDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  selected?: string;
  tokens: Token[];
  onSelect: (v: string) => void;
};

function useSearchTokens(tokens: Token[]) {
  const [term, onSearchInputChanged] = useState("");
  const filtered = useMemo(
    () =>
      term
        ? tokens.filter((token) =>
            token.id.toLowerCase().includes(term.toLowerCase()),
          )
        : tokens,
    [tokens, term],
  );
  return { filtered, term, onSearchInputChanged };
}

function TokenDialog(props: TokenDialogProps) {
  const { term, onSearchInputChanged, filtered } = useSearchTokens(
    props.tokens,
  );
  return (
    <Modal isOpen={props.isOpen} onClose={props.onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{props.title}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack w="full" pb="6" spacing={4}>
            <Input
              placeholder="Search name"
              value={term}
              onChange={(e) => onSearchInputChanged(e.target.value)}
            />
            {filtered.map((token) => (
              <Button
                justifyContent="flex-start"
                isDisabled={token.id === props.selected}
                onClick={() => {
                  props.onSelect(token.id);
                  onSearchInputChanged("");
                }}
                key={token.id}
              >
                {token.id}
              </Button>
            ))}
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export function TokenInput(props: {
  id: string;
  label: string;
  value: string;
  tokenId?: string;
  tokens: Token[];
  onChange: (v: string) => void;
  onSelect: (v: string) => void;
  onFocus: () => void;
}) {
  const [selectOpen, setSelectOpen] = useState(false);

  return (
    <FormControl id={props.id}>
      <FormLabel>{props.label}</FormLabel>
      <InputGroup>
        <StyledInput
          placeholder="0.0"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          onFocus={props.onFocus}
        />
        <InputRightAddon
          px="0"
          children={
            <Button onClick={() => setSelectOpen(true)}>
              <span>{props.tokenId ?? "Select token"} </span>
              <FiChevronDown />
            </Button>
          }
        />
        <TokenDialog
          isOpen={selectOpen}
          tokens={props.tokens}
          selected={props.tokenId}
          onClose={() => setSelectOpen(false)}
          onSelect={(id) => {
            props.onSelect(id);
            setSelectOpen(false);
          }}
          title="Select a token"
        />
      </InputGroup>
    </FormControl>
  );
}
