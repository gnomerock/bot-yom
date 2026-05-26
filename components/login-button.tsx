"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function LoginButton() {
  return (
    <Button
      variant="outline"
      size="lg"
      onClick={() =>
        authClient.signIn.social({
          provider: "discord",
          callbackURL: "/dashboard",
        })
      }
    >
      Login with Discord
    </Button>
  );
}
