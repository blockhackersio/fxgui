import { Layout } from "@/ui/Layout";
import { Button, ButtonProps } from "@chakra-ui/react";
import Link, { LinkProps } from "next/link";

function LinkButton(props: ButtonProps & LinkProps) {
  return <Button variant="outline" as={Link} {...props} />;
}

export default function Home() {
  return (
    <Layout title="FXGui Examples">
      <LinkButton href="/crypto">Crypto</LinkButton>
      <LinkButton href="/forex">Forex</LinkButton>
    </Layout>
  );
}
