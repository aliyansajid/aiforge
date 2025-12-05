"use client";

import { useState, useTransition } from "react";
import { signIn } from "@repo/auth/client";
import { disconnectOAuthProvider } from "@/actions/account-actions";
import { toast } from "sonner";
import { ButtonVariant, CustomButton } from "@repo/ui/components/custom-button";

interface OAuthButtonProps {
  provider: "google" | "github";
  isConnected: boolean;
}

export default function OAuthButton({
  provider,
  isConnected,
}: OAuthButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await signIn(provider, {
        callbackUrl: "/account",
        redirect: true,
      });
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    startTransition(async () => {
      try {
        const response = await disconnectOAuthProvider(provider);

        if (response.success) {
          toast.success(response.message);
        } else {
          toast.error(response.error);
        }
      } catch (error) {
        toast.error("Something went wrong. Please try again.");
      }
    });
  };

  const loading = isConnecting || isPending;

  return (
    <CustomButton
      variant={isConnected ? ButtonVariant.OUTLINE : ButtonVariant.DEFAULT}
      text={isConnected ? "Disconnect" : "Connect"}
      size="sm"
      className="rounded-full"
      onClick={isConnected ? handleDisconnect : handleConnect}
      disabled={loading}
    />
  );
}
