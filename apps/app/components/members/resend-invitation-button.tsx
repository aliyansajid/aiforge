"use client";

import { useState } from "react";
import { Button } from "@repo/ui/components/button";
import { MailPlus } from "lucide-react";
import { inviteTeamMember } from "@/app/actions/member-actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ResendInvitationButtonProps {
  teamSlug: string;
  email: string;
  role: "MEMBER" | "ADMIN";
}

export function ResendInvitationButton({
  teamSlug,
  email,
  role,
}: ResendInvitationButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleResend = async () => {
    setIsLoading(true);

    // First cancel the existing invitation, then send a new one
    const result = await inviteTeamMember(teamSlug, email, role);

    setIsLoading(false);

    if (result.success) {
      toast.success("Invitation resent successfully");
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleResend}
      disabled={isLoading}
    >
      <MailPlus className="mr-2 h-4 w-4" />
      {isLoading ? "Resending..." : "Resend"}
    </Button>
  );
}
