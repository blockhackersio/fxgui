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
  Divider,
} from "@chakra-ui/react";
import { Token } from "@fxgui/core";
import { ReactNode, useMemo, useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import { TokenLogo } from "@/ui/TokenLogo";
import { Assets } from "@/types";
import { TokenButton } from "@/ui/TokenButton";

function StyledInput(props: InputProps) {
  return <Input {...props} _placeholder={{ color: "gray.500" }} />;
}

type TokenDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  selected?: string;
  bestTokens: Token[];
  assets: Assets;
  onSelect: (v: string) => void;
};

// Move this to fxgui
function useSearchTokens(tokens: Token[], favorites: Token[] = []) {
  const [term, onSearchInputChanged] = useState("");

  const favoritesIds = useMemo(
    () => favorites.map((f) => f.id.toLowerCase()),
    [favorites],
  );

  const filtered = useMemo(
    () =>
      tokens.filter((token) => {
        const tokenId = token.id.toLowerCase();
        const normalizedInput = term.toLowerCase();
        const tokenInFavorites = favoritesIds.includes(tokenId);
        if (!term) {
          return !tokenInFavorites;
        }
        const tokenHasSearchTerm =
          tokenId.startsWith(normalizedInput) ||
          token.name?.toLowerCase().startsWith(normalizedInput);
        return tokenHasSearchTerm;
      }),
    [tokens, term, favorites, term],
  );

  return {
    filtered,
    favorites: term ? [] : favorites,
    term,
    onSearchInputChanged,
  };
}

function TokenDialog(props: TokenDialogProps) {
  const { term, onSearchInputChanged, filtered, favorites } = useSearchTokens(
    props.assets.tokens,
    props.assets.shortlist,
  );

  const onTokenClick = (tokenId: string) => {
    onSearchInputChanged("");
    props.onSelect(tokenId);
  };

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
            {favorites.length && (
              <>
                {favorites.map((token) => (
                  <TokenButton
                    assets={props.assets}
                    token={token}
                    key={token.id}
                    onClick={onTokenClick}
                    disabled={token.id === props.selected}
                  />
                ))}
                <br />
                <Divider />
                <br />
              </>
            )}
            {filtered.map((token) => (
              <TokenButton
                assets={props.assets}
                token={token}
                disabled={token.id === props.selected}
                onClick={onTokenClick}
                key={token.id}
              />
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
  assets: Assets;
  onChange: (v: string) => void;
  onSelect: (v: string) => void;
  onFocus: () => void;
  selectPlaceholder?: ReactNode;
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
            <Button gap={2} onClick={() => setSelectOpen(true)}>
              {props.tokenId ? (
                <>
                  <TokenLogo
                    tokenId={props.tokenId}
                    assets={props.assets.assets}
                  />
                  <span>{props.tokenId}</span>
                </>
              ) : (
                <span>{props.selectPlaceholder ?? "Select Token"}</span>
              )}
              <FiChevronDown />
            </Button>
          }
        />
        <TokenDialog
          isOpen={selectOpen}
          assets={props.assets}
          bestTokens={props.assets.shortlist}
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
