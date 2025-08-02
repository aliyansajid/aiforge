import { Card, CardContent } from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { auth } from "@repo/auth";
import { Mail } from "lucide-react";
import EditNameDialog from "@/components/EditNameDialog";
import EditEmailDialog from "@/components/EditEmailDialog";
import OAuthButton from "@/components/OauthButton";
import PasswordSetupDialog from "@/components/PasswordSetupDialog";
import { disableCredentials, getUserAccountStatus } from "@/actions/account";

const Account = async () => {
  const session = await auth();

  const accountStatus = await getUserAccountStatus();

  if (!accountStatus) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col text-center gap-2">
          <h1 className="text-2xl font-medium">Unable to load account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Please refresh the page or try again later.
          </p>
        </div>
      </div>
    );
  }

  const { isGoogleConnected, isGithubConnected, hasCredentials, userEmail } =
    accountStatus;

  // Create a wrapper function that handles the form action properly
  const handleDisableCredentials = async (
    formData: FormData
  ): Promise<void> => {
    const result = await disableCredentials();
    // Handle the result here if needed (e.g., show toast, redirect, etc.)
    if (result?.error) {
      console.error("Error disabling credentials:", result.error);
      // You could add toast notification here
    }
    // Note: Form actions should not return values, so we handle success/error internally
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium">Your account</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Manage your account information.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1.5 text-sm">
              <Label className="text-muted-foreground">Full name</Label>
              <span>{session?.user.name || "N/A"}</span>
            </div>
            <EditNameDialog
              firstName={session?.user.firstName}
              lastName={session?.user.lastName}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1.5 text-sm">
              <Label className="text-muted-foreground">Email</Label>
              <span>{session?.user.email || "N/A"}</span>
            </div>
            <EditEmailDialog email={session?.user.email} />
          </div>
          <div className="flex flex-col gap-1.5 text-sm">
            <Label className="text-muted-foreground">Account created</Label>
            <span>
              {session?.user.createdAt
                ? new Date(session?.user.createdAt).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "2-digit",
                      year: "numeric",
                    }
                  )
                : "N/A"}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <p className="text-base font-medium">Sign-in methods</p>
        <p className="text-muted-foreground text-sm text-balance">
          Manage your ways of logging into AIForge.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-6">
          {/* Email and Password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center bg-background p-2 border size-10 rounded-full">
                <Mail size={20} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-sm">Email and password</Label>
                <span className="text-muted-foreground text-xs">
                  {hasCredentials
                    ? userEmail || "Connected"
                    : "No password set"}
                </span>
              </div>
            </div>
            {hasCredentials ? (
              <form action={handleDisableCredentials}>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  type="submit"
                  disabled={!isGoogleConnected && !isGithubConnected}
                >
                  Disable
                </Button>
              </form>
            ) : (
              <PasswordSetupDialog />
            )}
          </div>

          {/* Google Account */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center bg-background p-2 border size-10 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="size-5"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-sm">Google</Label>
                <span className="text-muted-foreground text-xs">
                  {isGoogleConnected
                    ? userEmail || "Connected"
                    : "Connect your Google account"}
                </span>
              </div>
            </div>
            <OAuthButton provider="google" isConnected={isGoogleConnected} />
          </div>

          {/* GitHub Account */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center bg-background p-2 border size-10 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="size-5"
                >
                  <path
                    d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-sm">GitHub</Label>
                <span className="text-muted-foreground text-xs">
                  {isGithubConnected
                    ? userEmail || "Connected"
                    : "Connect your GitHub account"}
                </span>
              </div>
            </div>
            <OAuthButton provider="github" isConnected={isGithubConnected} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Account;
