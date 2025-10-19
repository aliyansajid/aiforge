"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form } from "@repo/ui/components/form";
import {
  CustomFormField,
  FormFieldType,
} from "@repo/ui/components/CustomFormField";
import { ButtonVariant, CustomButton } from "@repo/ui/components/CustomButton";
import { createTeamSchema } from "@/schema/index";
import { createTeam } from "@/actions/team-actions";
import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PlusCircle } from "lucide-react";
import { IconPicker } from "@/components/icon-picker";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/components/form";
import z from "zod";

interface TeamFormProps {
  onSuccess?: () => void;
}

const TeamForm = ({ onSuccess }: TeamFormProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof createTeamSchema>>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: "",
      icon: "Building2",
    },
  });

  async function onSubmit(values: z.infer<typeof createTeamSchema>) {
    startTransition(async () => {
      const response = await createTeam(values);

      if (response.success) {
        toast.success(response.message);
        form.reset();
        onSuccess?.();
        router.refresh();

        if (response.data?.slug) {
          // Redirect to team general page
          router.push(`/teams/${response.data.slug}`);
        }
      } else {
        toast.error(response.message);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <CustomFormField
          control={form.control}
          fieldType={FormFieldType.INPUT}
          inputType="text"
          name="name"
          label="Team Name"
          placeholder="e.g. My Awesome Team"
        />

        <FormField
          control={form.control}
          name="icon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Icon</FormLabel>
              <FormControl>
                <IconPicker value={field.value} onSelect={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <CustomButton
          type="submit"
          variant={ButtonVariant.DEFAULT}
          icon={<PlusCircle />}
          text="Create Team"
          isLoading={isPending}
          className="w-full"
        />
      </form>
    </Form>
  );
};

export default TeamForm;
