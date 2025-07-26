"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form } from "@repo/ui/components/form";
import {
  CustomFormField,
  FormFieldType,
} from "@repo/ui/components/CustomFormField";
import { ButtonVariant, CustomButton } from "@repo/ui/components/CustomButton";
import { startTransition, useState, useEffect } from "react";
import { Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { loginSchema, registerSchema } from "@/schemas/auth";
import { registerUser } from "@/actions/auth";
import { signIn } from "@repo/auth";

interface AuthFormProps {
  type: "login" | "sign-up";
}

// Helper function to capture session info
async function captureSessionInfo() {
  try {
    await fetch("/api/session-info", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Failed to capture session info:", error);
    // Don't show error to user as login was successful
  }
}

const AuthForm = ({ type }: AuthFormProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const showEmailForm = searchParams.get("email") === "true";

  // Check if user just logged in via OAuth and capture session info
  useEffect(() => {
    const justLoggedIn =
      searchParams.get("callbackUrl") || searchParams.get("from") === "oauth";
    if (justLoggedIn) {
      // Small delay to ensure session is fully established
      setTimeout(captureSessionInfo, 1000);
    }
  }, [searchParams]);

  const handleEmailClick = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("email", "true");
    router.push(`?${params.toString()}`);
  };

  const handleBackClick = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("email");
    router.push(`?${params.toString()}`);
  };

  const handleOAuthLogin = async (provider: "google" | "github") => {
    try {
      await signIn(provider, {
        callbackUrl: "/?from=oauth",
      });
    } catch (error) {
      toast.error("Failed to sign in with " + provider);
    }
  };

  const formSchema = type === "login" ? loginSchema : registerSchema;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("email", values.email);
        formData.append("password", values.password);

        if (type === "sign-up") {
          const result = await registerUser(formData);

          if (!result.success) {
            toast.error(result.error);
            return;
          }

          toast.success(result.message);
          router.push("/login");
        } else {
          const result = await signIn("credentials", {
            email: values.email,
            password: values.password,
            redirect: false,
          });

          if (result?.error) {
            toast.error("Invalid credentials");
            return;
          }

          // Capture session info after successful credential login
          await captureSessionInfo();

          router.push("/");
        }
      } catch (error) {
        toast.error("Something went wrong. Please try again.");
      } finally {
        setIsLoading(false);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {!showEmailForm ? (
          <>
            <h1 className="text-2xl font-bold text-center mb-10">
              {type == "login"
                ? "Login to your account"
                : "Create your account"}
            </h1>
            <div className="grid gap-4">
              <CustomButton
                variant={ButtonVariant.DEFAULT}
                type="button"
                icon={<Mail />}
                text="Continue with Email"
                className="rounded-full"
                onClick={handleEmailClick}
              />

              <hr className="border-border w-full h-px border-b-0 border-x-0 border-t-[1px]" />

              <CustomButton
                variant={ButtonVariant.OUTLINE}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
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
                }
                text="Continue with Google"
                className="rounded-full"
                onClick={() => handleOAuthLogin("google")}
              />

              <CustomButton
                variant={ButtonVariant.OUTLINE}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                      fill="currentColor"
                    />
                  </svg>
                }
                text="Continue with GitHub"
                className="rounded-full"
                onClick={() => handleOAuthLogin("github")}
              />

              <p className="text-center text-sm text-muted-foreground">
                {type == "login"
                  ? "Don't have an account?"
                  : "Already have an account?"}
                &nbsp;
                <Link
                  href={type == "login" ? "sign-up" : "login"}
                  className="text-primary hover:underline"
                >
                  {type == "login" ? "Sign up" : "Login"}
                </Link>
              </p>
            </div>
          </>
        ) : (
          <div className="grid gap-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl font-bold">
                {type === "login"
                  ? "Login to your account"
                  : "Create your account"}
              </h1>
              <p className="text-muted-foreground text-sm text-balance">
                {type === "login"
                  ? "Enter your email below to login to your account"
                  : "Enter your email below to create your account"}
              </p>
            </div>

            <CustomFormField
              control={form.control}
              fieldType={FormFieldType.INPUT}
              inputType="email"
              name="email"
              label="Email"
              placeholder="m@example.com"
            />

            <div className="grid gap-3">
              <CustomFormField
                control={form.control}
                fieldType={FormFieldType.INPUT}
                inputType="password"
                name="password"
                label="Password"
                placeholder="********"
              />
              {type == "login" && (
                <Link
                  href="forgot-password"
                  className="text-sm underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </Link>
              )}
            </div>

            <div className="grid gap-3">
              <CustomButton
                variant={ButtonVariant.DEFAULT}
                text={type == "login" ? "Login" : "Sign up"}
                isLoading={isLoading}
              />

              <CustomButton
                variant={ButtonVariant.OUTLINE}
                text="Go Back"
                type="button"
                onClick={handleBackClick}
              />
            </div>
          </div>
        )}
      </form>
    </Form>
  );
};

export default AuthForm;
