"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@repo/ui/components/button";
import { Alert, AlertDescription } from "@repo/ui/components/alert";
import { Badge } from "@repo/ui/components/badge";
import {
  Shield,
  ShieldCheck,
  Crown,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Building2,
  Mail,
  Calendar,
  User
} from "lucide-react";
import {
  validateInvitationToken,
  acceptInvitation,
  declineInvitation,
} from "@/app/actions/member-actions";
import { toast } from "sonner";
import { format } from "date-fns";

interface InvitationData {
  id: string;
  email: string;
  role: string;
  team: {
    id: string;
    name: string;
    slug: string;
  };
  invitedBy: string;
  expiresAt: Date;
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case "OWNER":
      return <Crown className="h-4 w-4" />;
    case "ADMIN":
      return <ShieldCheck className="h-4 w-4" />;
    default:
      return <Shield className="h-4 w-4" />;
  }
};

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case "OWNER":
      return "default";
    case "ADMIN":
      return "secondary";
    default:
      return "outline";
  }
};

export function InviteAcceptContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link - missing token");
      setLoading(false);
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) return;

    setLoading(true);
    const result = await validateInvitationToken(token);

    if (result.success && result.data) {
      setInvitation(result.data);
      setError(null);
    } else {
      setError(result.message);
      setInvitation(null);
    }

    setLoading(false);
  };

  const handleAccept = async () => {
    if (!token) return;

    setProcessing(true);
    const result = await acceptInvitation(token);

    if (result.success) {
      setSuccess(result.message);
      toast.success(result.message);

      // Redirect to team page after 2 seconds
      setTimeout(() => {
        if (result.teamSlug) {
          router.push(`/${result.teamSlug}`);
        } else {
          router.push("/");
        }
      }, 2000);
    } else {
      setError(result.message);
      toast.error(result.message);

      // If already a member, redirect to team
      if (result.teamSlug) {
        setTimeout(() => {
          router.push(`/${result.teamSlug}`);
        }, 2000);
      }
    }

    setProcessing(false);
  };

  const handleDecline = async () => {
    if (!token) return;

    setProcessing(true);
    const result = await declineInvitation(token);

    if (result.success) {
      setSuccess("Invitation declined");
      toast.success(result.message);

      // Redirect to home after 2 seconds
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } else {
      setError(result.message);
      toast.error(result.message);
    }

    setProcessing(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Validating invitation...</p>
      </div>
    );
  }

  if (success) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          {success}
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button
          onClick={() => router.push("/")}
          variant="outline"
          className="w-full"
        >
          Go to Home
        </Button>
      </div>
    );
  }

  if (!invitation) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No invitation data available</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border p-4">
          <Building2 className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">Team</p>
            <p className="text-sm text-muted-foreground">{invitation.team.name}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border p-4">
          <Mail className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">Invited Email</p>
            <p className="text-sm text-muted-foreground">{invitation.email}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border p-4">
          <div className="mt-0.5">
            {getRoleIcon(invitation.role)}
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">Role</p>
            <Badge variant={getRoleBadgeVariant(invitation.role)} className="gap-1">
              {invitation.role}
            </Badge>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border p-4">
          <User className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">Invited By</p>
            <p className="text-sm text-muted-foreground">{invitation.invitedBy}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border p-4">
          <Calendar className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">Expires</p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(invitation.expiresAt), "MMMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          Make sure you're signed in with <strong>{invitation.email}</strong> to accept this invitation.
        </AlertDescription>
      </Alert>

      <div className="flex gap-3">
        <Button
          onClick={handleAccept}
          disabled={processing}
          className="flex-1"
        >
          {processing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Accept Invitation
            </>
          )}
        </Button>
        <Button
          onClick={handleDecline}
          disabled={processing}
          variant="outline"
          className="flex-1"
        >
          <XCircle className="mr-2 h-4 w-4" />
          Decline
        </Button>
      </div>
    </div>
  );
}
