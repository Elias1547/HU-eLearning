import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";
import { SettingsAppearanceCard } from "@/components/settings/settings-appearance-card";
import { User } from "lucide-react";

export default async function StudentSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "student") {
    redirect("/role");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-12">
      <div className="mb-8 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Account
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage preferences for your learner account. Course billing and enrollments are unchanged.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <SettingsAppearanceCard />

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Profile</CardTitle>
            <CardDescription>
              Update your name, bio, and profile photo from your student profile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="gap-2 font-medium">
              <Link href="/student/profile">
                <User className="h-4 w-4" />
                Open profile
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
