import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { UserCircle, Save, KeyRound, ShieldCheck, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { authService } from "@/services/auth.service";
import { normalizeError } from "@/services/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { env } from "@/config/env";
import { humanize, initials } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface ProfileForm {
  name: string;
  phone: string;
}
interface PasswordForm {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export function ProfilePage() {
  const { user, setUser } = useAuth();

  const profileForm = useForm<ProfileForm>({
    values: { name: user?.name ?? "", phone: user?.phone ?? "" },
  });
  const passwordForm = useForm<PasswordForm>({
    defaultValues: { current_password: "", new_password: "", confirm_password: "" },
  });

  const updateProfile = useMutation({
    mutationFn: (values: ProfileForm) => authService.updateProfile(values),
    onSuccess: (updated) => {
      setUser(updated);
      toast.success("Profile updated");
    },
    onError: (err) => toast.error(normalizeError(err).message),
  });

  const changePassword = useMutation({
    mutationFn: (values: PasswordForm) =>
      authService.changePassword(values.current_password, values.new_password),
    onSuccess: () => {
      toast.success("Password changed");
      passwordForm.reset();
    },
    onError: (err) => toast.error(normalizeError(err).message),
  });

  if (!user) return null;

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Profile · {env.APP_NAME}</title>
      </Helmet>
      <PageHeader
        title="My Profile"
        description="Manage your personal details and account security."
        icon={<UserCircle />}
      />

      {/* Identity card */}
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:items-center">
          <Avatar className="h-20 w-20 border-2 border-border">
            {user.avatar?.url && <AvatarImage src={user.avatar.url} />}
            <AvatarFallback className="text-xl">{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-bold">{user.name}</h2>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> {user.email}
              </span>
              {user.phone && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" /> {user.phone}
                </span>
              )}
            </div>
            <div className="mt-2.5 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Badge>{humanize(user.role)}</Badge>
              {user.is_superuser && (
                <Badge variant="success">
                  <ShieldCheck className="h-3 w-3" /> Super Admin
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile details */}
        <form onSubmit={profileForm.handleSubmit((v) => updateProfile.mutate(v))}>
          <Card>
            <CardHeader>
              <CardTitle>Personal details</CardTitle>
              <CardDescription>Update your name and contact number.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input {...profileForm.register("name", { required: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={user.email} disabled />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input {...profileForm.register("phone")} placeholder="Phone number" />
              </div>
            </CardContent>
            <div className="flex justify-end border-t border-border bg-muted/30 px-6 py-4">
              <Button type="submit" loading={updateProfile.isPending}>
                <Save /> Save
              </Button>
            </div>
          </Card>
        </form>

        {/* Change password */}
        <form
          onSubmit={passwordForm.handleSubmit((v) => {
            if (v.new_password !== v.confirm_password) {
              toast.error("New passwords do not match");
              return;
            }
            changePassword.mutate(v);
          })}
        >
          <Card>
            <CardHeader>
              <CardTitle>Change password</CardTitle>
              <CardDescription>
                Choose a strong password. You'll stay signed in on this device.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Current password</Label>
                <Input type="password" {...passwordForm.register("current_password", { required: true })} />
              </div>
              <Separator />
              <div className="space-y-1.5">
                <Label>New password</Label>
                <Input type="password" {...passwordForm.register("new_password", { required: true, minLength: 8 })} />
              </div>
              <div className="space-y-1.5">
                <Label>Confirm new password</Label>
                <Input type="password" {...passwordForm.register("confirm_password", { required: true })} />
              </div>
            </CardContent>
            <div className="flex justify-end border-t border-border bg-muted/30 px-6 py-4">
              <Button type="submit" variant="outline" loading={changePassword.isPending}>
                <KeyRound /> Update password
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </div>
  );
}
