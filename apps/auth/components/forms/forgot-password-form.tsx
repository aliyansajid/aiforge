"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form } from "@repo/ui/components/form";
import {
  CustomFormField,
  FormFieldType,
} from "@repo/ui/components/custom-form-field";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { emailSchema } from "@/schemas/auth";
import { sendPasswordResetOtp } from "@/actions/auth-actions";
import { toast } from "sonner";
import { Button } from "@repo/ui/components/button";
import { Spinner } from "@repo/ui/components/spinner";

const ForgotPasswordForm = () => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Initialize the form with schema validation using Zod
  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  /**
   * Handle form submission for sending password reset OTP
   * On success: redirects user to the OTP verification screen
   */
  const onSubmit = (values: z.infer<typeof emailSchema>) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("email", values.email);

        const response = await sendPasswordResetOtp(formData);

        if (response.success) {
          router.replace(`/reset-password?email=${values.email}`);
        } else {
          toast.error(response.error || "Failed to send OTP");
        }
      } catch (error) {
        toast.error("An unexpected error occurred. Please try again later.");
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Trouble Logging In?</h1>
          <p className="text-muted-foreground text-sm text-balance">
            No worries — enter your registered email to receive reset
            instructions
          </p>
        </div>

        <CustomFormField
          control={form.control}
          fieldType={FormFieldType.INPUT}
          inputType="email"
          name="email"
          label="Email"
          placeholder="e.g. m@example.com"
        />

        <div className="grid gap-2">
          <Button disabled={isPending}>
            {isPending ? <Spinner /> : "Continue"}
          </Button>

          <Button
            variant="outline"
            type="button"
            disabled={isPending}
            onClick={() => router.push("/login")}
          >
            Back to Login
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ForgotPasswordForm;
