"use client";

import z from "zod";
import { toast } from "sonner";
import { signOut } from "@repo/auth";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { Form } from "@repo/ui/components/form";
import {
  CustomFormField,
  FormFieldType,
} from "@repo/ui/components/custom-form-field";
import { ButtonVariant, CustomButton } from "@repo/ui/components/custom-button";
import { emailSchema, otpSchema } from "@/schemas/auth";
import {
  sendEmailChangeOtp,
  verifyEmailChangeOtp,
} from "@/actions/account-actions";

const EditEmailDialog = ({ email }: { email: string | null | undefined }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<"email" | "otp">("email");
  const [newEmail, setNewEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  // Email form
  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  // OTP form
  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  });

  // Handle back button in OTP step
  const handleBackClick = () => {
    if (!isPending) {
      setCurrentStep("email");
      otpForm.reset({ otp: "" });
    }
  };

  // Submit new email and request OTP
  const handleEmailSubmit = (values: z.infer<typeof emailSchema>) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("email", values.email);

        const response = await sendEmailChangeOtp(formData);

        if (response.success) {
          setNewEmail(values.email);
          setCurrentStep("otp");
        } else {
          toast.error(response.error);
        }
      } catch (error) {
        toast.error("Something went wrong. Please try again.");
      }
    });
  };

  // Verify OTP and update email
  const handleOtpSubmit = (values: z.infer<typeof otpSchema>) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("email", newEmail);
        formData.append("otp", values.otp);

        const response = await verifyEmailChangeOtp(formData);

        if (response.success) {
          setOpen(false);
          toast.success(response.message);
          await signOut({ redirect: false });
          router.push("/login");
        } else {
          toast.error(response.error);
        }
      } catch (error) {
        toast.error("Something went wrong. Please try again.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <CustomButton
          variant={ButtonVariant.OUTLINE}
          text="Update email"
          size="sm"
          className="rounded-full"
        />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {currentStep === "email" && (
          <Form {...emailForm}>
            <form
              onSubmit={emailForm.handleSubmit(handleEmailSubmit)}
              className="space-y-6"
            >
              <DialogHeader>
                <DialogTitle>Edit email</DialogTitle>
                <DialogDescription>
                  Enter your new email address.
                </DialogDescription>
              </DialogHeader>

              <CustomFormField
                control={emailForm.control}
                fieldType={FormFieldType.INPUT}
                inputType="email"
                name="email"
                placeholder={email ?? ""}
              />

              <DialogFooter>
                <DialogClose asChild>
                  <CustomButton
                    variant={ButtonVariant.OUTLINE}
                    text="Cancel"
                    disabled={isPending}
                  />
                </DialogClose>
                <CustomButton
                  variant={ButtonVariant.DEFAULT}
                  text="Continue"
                  type="submit"
                  isLoading={isPending}
                />
              </DialogFooter>
            </form>
          </Form>
        )}

        {currentStep === "otp" && (
          <Form {...otpForm}>
            <form
              onSubmit={otpForm.handleSubmit(handleOtpSubmit)}
              className="space-y-6"
            >
              <DialogHeader>
                <DialogTitle>Verify your new email</DialogTitle>
                <DialogDescription>
                  We've sent a verification code to {newEmail}. Please enter it
                  below to complete the email change.
                </DialogDescription>
              </DialogHeader>

              <div className="flex justify-center">
                <CustomFormField
                  control={otpForm.control}
                  fieldType={FormFieldType.OTP}
                  name="otp"
                />
              </div>

              <DialogFooter>
                <CustomButton
                  variant={ButtonVariant.OUTLINE}
                  text="Go back"
                  type="button"
                  disabled={isPending}
                  onClick={handleBackClick}
                />

                <CustomButton
                  variant={ButtonVariant.DEFAULT}
                  text="Verify OTP"
                  type="submit"
                  isLoading={isPending}
                />
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditEmailDialog;
