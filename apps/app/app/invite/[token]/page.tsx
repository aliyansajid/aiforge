import { acceptInvitation } from "@/actions/team-member-actions";
import { auth } from "@repo/auth";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

interface InvitePageProps {
  params: {
    token: string;
  };
}

const InvitePage = async ({ params }: InvitePageProps) => {
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/invite/${params.token}`);
  }

  // Auto-accept the invitation
  const result = await acceptInvitation(params.token);

  if (result.success && result.data?.teamSlug) {
    // Redirect to team page
    redirect(`/teams/${result.data.teamSlug}`);
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {result.success ? (
            <>
              <CheckCircle2 className="size-12 text-green-500 mx-auto mb-4" />
              <CardTitle>Invitation Accepted!</CardTitle>
              <CardDescription>{result.message}</CardDescription>
            </>
          ) : (
            <>
              <XCircle className="size-12 text-destructive mx-auto mb-4" />
              <CardTitle>Unable to Accept Invitation</CardTitle>
              <CardDescription>{result.message}</CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild>
            <Link href="/">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvitePage;
