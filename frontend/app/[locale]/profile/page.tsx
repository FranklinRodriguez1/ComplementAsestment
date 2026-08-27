import { MobileBackLink } from "@/components/layout/mobile-back-link";
import { ProfileForm } from "@/components/profile/profile-form";

export default function ProfilePage() {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <MobileBackLink />
      <ProfileForm />
    </div>
  );
}
