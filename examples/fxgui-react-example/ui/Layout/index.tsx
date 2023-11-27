import {
  Button,
  Flex,
  Heading,
  Stack,
  useColorModeValue,
} from "@chakra-ui/react";
import { ReactNode } from "react";

type LayoutProps = {
  children?: ReactNode;
  title?: ReactNode;
  back?: ReactNode;
};
export function Layout(props: LayoutProps) {
  return (
    <Flex
      minH={"100vh"}
      align={"center"}
      justify={"center"}
      bg={useColorModeValue("gray.50", "gray.800")}
    >
      <Stack
        spacing={4}
        w={"full"}
        maxW={"md"}
        bg={useColorModeValue("white", "gray.700")}
        rounded={"xl"}
        boxShadow={"lg"}
        p={6}
        my={12}
      >
        {props.back}
        {props.title ? (
          <Heading lineHeight={1.1} fontSize={{ base: "2xl", md: "3xl" }}>
            {props.title}
          </Heading>
        ) : null}
        {props.children}
      </Stack>
    </Flex>
  );
}
