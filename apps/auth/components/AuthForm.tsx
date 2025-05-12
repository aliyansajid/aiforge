"use client";

import { cn } from "@repo/ui/lib/utils";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form } from "@repo/ui/components/form";
import CustomFormField from "@repo/ui/components/CustomFormField";
import { FormFieldType } from "@repo/ui/lib/types";
import Link from "next/link";
import { authSchema } from "@repo/auth/validation";
import { signIn } from "@repo/auth";
import { createUser } from "../actions/auth";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface AuthFormProps {
  type: "login" | "sign-up";
  className?: string;
  props?: React.ComponentProps<"div">;
}

const AuthForm = ({ type, className, ...props }: AuthFormProps) => {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<z.infer<typeof authSchema>>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof authSchema>) {
    setError(null);

    if (type === "sign-up") {
      startTransition(async () => {
        const result = await createUser(values);
        if (result.success) {
          router.push("/login");
        } else {
          setError(result.error || "Failed to create user");
        }
      });
    } else {
      startTransition(async () => {
        try {
          const response = await signIn("credentials", {
            email: values.email,
            password: values.password,
            redirect: false,
          });
          if (response?.error) {
            setError(response.error);
          } else {
            router.push("/");
          }
        } catch (err) {
          setError("Failed to log in");
        }
      });
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {type === "login" ? "Welcome back" : "Create an account"}
          </CardTitle>
          <CardDescription>
            {type === "login"
              ? "Log in with your email or use Apple/Google"
              : "Sign up with your email or use Apple/Google"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="grid gap-6">
                <div className="flex flex-col gap-4">
                  <Button
                    variant="outline"
                    type="button"
                    className="w-full"
                    onClick={() => signIn("github", { callbackUrl: "/" })}
                    disabled={isPending}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="w-5 h-5 mr-2"
                    >
                      <path
                        d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.13-1.47-1.13-1.47-.92-.63.07-.62.07-.62 1.02.07 1.56 1.04 1.56 1.04.91 1.56 2.39 1.11 2.97.85.09-.66.36-1.11.66-1.37-2.31-.26-4.74-1.16-4.74-5.16 0-1.14.41-2.07 1.08-2.8-.11-.26-.47-1.31.1-2.73 0 0 .87-.28 2.85 1.06A9.92 9.92 0 0 1 12 6.77c.88 0 1.77.12 2.61.35 1.98-1.34 2.85-1.06 2.85-1.06.57 1.42.21 2.47.1 2.73.67.73 1.08 1.66 1.08 2.8 0 4.01-2.43 4.9-4.74 5.16.37.32.7.94.7 1.9v2.81c0 .27.16.58.66.5A10 10 0 0 0 22 12 10 10 0 0 0 12 2z"
                        fill="currentColor"
                      />
                    </svg>
                    Continue with GitHub
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    className="w-full"
                    onClick={() => signIn("google", { callbackUrl: "/" })}
                    disabled={isPending}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 256 262"
                      className="mr-2"
                    >
                      <path
                        fill="#4285F4"
                        d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
                      />
                      <path
                        fill="#34A853"
                        d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
                      />
                      <path
                        fill="#FBBC05"
                        d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
                      />
                      <path
                        fill="#EB4335"
                        d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
                      />
                    </svg>
                    Continue with Google
                  </Button>
                </div>
                <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                  <span className="bg-card text-muted-foreground relative z-10 px-2">
                    Or continue with
                  </span>
                </div>
                <div className="grid gap-6">
                  <CustomFormField
                    control={form.control}
                    fieldType={FormFieldType.INPUT}
                    name="email"
                    placeholder="john@email.com"
                  />
                  <div className="grid gap-2">
                    <CustomFormField
                      control={form.control}
                      fieldType={FormFieldType.INPUT}
                      inputType="password"
                      name="password"
                      placeholder="********"
                    />
                    {type === "login" && (
                      <Link
                        href="/forgot-password"
                        className="text-sm underline-offset-4 hover:underline"
                      >
                        Forgot your password?
                      </Link>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={isPending}>
                    {type === "login" ? "Log in" : "Sign up"}
                  </Button>
                </div>
                <div className="text-center text-sm">
                  {type === "login"
                    ? "Don't have an account?"
                    : "Already have an account?"}
                  &nbsp;
                  <Link
                    href={type === "login" ? "/sign-up" : "/login"}
                    className="underline underline-offset-4"
                  >
                    {type === "login" ? "Sign up" : "Log in"}
                  </Link>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
};

export default AuthForm;
