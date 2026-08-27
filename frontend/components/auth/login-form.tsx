"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { login } from "@/lib/api/api";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/auth-store";

type LoginFormValues = {
  email: string;
  password: string;
};

export function LoginForm() {
  const t = useTranslations("auth");
  const tApp = useTranslations("app");
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [serverError, setServerError] = useState<"credentials" | "network" | null>(null);

  // Built inside the component so validation messages follow the active
  // locale, same as ProfileForm.
  const schema = z.object({
    email: z.email(t("validation.emailInvalid")),
    password: z.string().min(1, t("validation.passwordRequired")),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      const user = await login(values.email, values.password);
      setSession(user);
      router.replace("/channels");
    } catch (error) {
      // 401 -> wrong credentials; anything else -> generic failure. Both
      // deliberately vague: a login form should never confirm whether the
      // email exists.
      setServerError(error instanceof ApiError && error.status === 401 ? "credentials" : "network");
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand/15 text-brand-text">
            <MessageSquare className="h-icon-xl w-icon-xl" aria-hidden="true" />
          </span>
          <h1 className="text-lg font-semibold text-foreground">{tApp("name")}</h1>
          <p className="text-sm text-foreground-secondary">{t("subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              {t("emailLabel")}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
              aria-invalid={Boolean(errors.email)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
            />
            {errors.email ? <p className="text-xs text-status-error-text">{errors.email.message}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              {t("passwordLabel")}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
              aria-invalid={Boolean(errors.password)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
            />
            {errors.password ? (
              <p className="text-xs text-status-error-text">{errors.password.message}</p>
            ) : null}
          </div>

          {serverError ? (
            <p className="rounded-lg bg-status-error/10 px-3 py-2 text-sm text-status-error-text">
              {serverError === "credentials" ? t("invalidCredentials") : t("networkError")}
            </p>
          ) : null}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? t("signingIn") : t("signIn")}
          </Button>
        </form>
      </div>
    </div>
  );
}
