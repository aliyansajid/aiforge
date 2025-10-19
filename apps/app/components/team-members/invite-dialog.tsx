"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTransition, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { Form } from "@repo/ui/components/form";
import { SelectItem } from "@repo/ui/components/select";
import { Button } from "@repo/ui/components/button";
import { inviteMemberSchema } from "@/schema/index";
import { inviteTeamMember } from "@/actions/team-member-actions";
import { Spinner } from "@repo/ui/components/spinner";
import { TeamRole } from "@repo/db";
import z from "zod";
import {
  CustomFormField,
  FormFieldType,
} from "@repo/ui/components/CustomFormField";
import { PlusIcon } from "lucide-react";

interface InviteDialogProps {
  teamId: string;
}

export function InviteDialog({ teamId }: InviteDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof inviteMemberSchema>>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: "",
      role: TeamRole.MEMBER,
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  async function onSubmit(values: z.infer<typeof inviteMemberSchema>) {
    startTransition(async () => {
      const result = await inviteTeamMember({
        teamId,
        email: values.email,
        role: values.role,
      });

      if (result.success) {
        toast.success(result.message);
        form.reset();
        setOpen(false);
        // router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)}>
          <PlusIcon />
          Invite Member
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join your team. They&apos;ll receive an email
            with a link to accept.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <CustomFormField
              control={form.control}
              fieldType={FormFieldType.INPUT}
              inputType="email"
              name="email"
              label="Email"
              placeholder="e.g. m@example.com"
            />

            <CustomFormField
              control={form.control}
              fieldType={FormFieldType.SELECT}
              name="role"
              label="Role"
              placeholder="Select a role"
              className="w-full"
            >
              <SelectItem value={TeamRole.ADMIN}>Admin</SelectItem>
              <SelectItem value={TeamRole.MEMBER}>Member</SelectItem>
            </CustomFormField>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={isPending}>
                {isPending ? <Spinner /> : "Send Invitation"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
