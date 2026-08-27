"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/state-views";
import { useProfile, useUpdateProfile } from "@/lib/query/profile";

type ProfileFormValues = {
  fullName: string;
  jobTitle: string;
};

export function ProfileForm() {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const { data: profile, isPending, isError, refetch } = useProfile();
  const updateProfile = useUpdateProfile();
  const [justSaved, setJustSaved] = useState(false);

  // Built inside the component (not module scope) so validation messages
  // re-render in the active locale when the user switches language.
  const schema = z.object({
    fullName: z.string().trim().min(1, t("validation.fullNameRequired")),
    jobTitle: z.string().trim().min(1, t("validation.jobTitleRequired")),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    values: profile ? { fullName: profile.fullName, jobTitle: profile.jobTitle } : undefined,
  });

  if (isPending) {
    return <LoadingState title={tCommon("loading")} />;
  }

  if (isError || !profile) {
    return (
      <ErrorState
        title={t("saveError")}
        action={
          <Button variant="outline" onClick={() => refetch()}>
            {tCommon("retry")}
          </Button>
        }
      />
    );
  }

  function onSubmit(values: ProfileFormValues) {
    setJustSaved(false);
    updateProfile.mutate(values, {
      onSuccess: () => {
        setJustSaved(true);
        reset(values);
      },
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Avatar name={profile.fullName} />
        <div>
          <h1 className="text-base font-semibold text-foreground">{t("title")}</h1>
          <p className="text-sm text-foreground-secondary">{t("subtitle")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fullName" className="text-sm font-medium text-foreground">
            {t("fullNameLabel")}
          </label>
          <input
            id="fullName"
            {...register("fullName")}
            aria-invalid={Boolean(errors.fullName)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
          />
          {errors.fullName ? (
            <p className="text-xs text-status-error-text">{errors.fullName.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="jobTitle" className="text-sm font-medium text-foreground">
            {t("jobTitleLabel")}
          </label>
          <input
            id="jobTitle"
            {...register("jobTitle")}
            aria-invalid={Boolean(errors.jobTitle)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
          />
          {errors.jobTitle ? (
            <p className="text-xs text-status-error-text">{errors.jobTitle.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            {t("emailLabel")}
          </label>
          <input
            id="email"
            value={profile.email}
            disabled
            className="rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-foreground-secondary"
          />
          <p className="text-xs text-foreground-secondary">{t("emailReadOnlyHint")}</p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={!isDirty || isSubmitting || updateProfile.isPending}>
            {updateProfile.isPending ? t("saving") : t("save")}
          </Button>
          {justSaved && !updateProfile.isPending ? (
            <span className="text-sm text-status-success-text">{t("saveSuccess")}</span>
          ) : null}
          {updateProfile.isError ? (
            <span className="text-sm text-status-error-text">{t("saveError")}</span>
          ) : null}
        </div>
      </form>
    </div>
  );
}
