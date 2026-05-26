export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SignOutButton } from "@/components/sign-out-button";
import { Construction } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) redirect("/");

  const { user } = session;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between h-16 px-6">
          <span className="font-semibold">Yom Bot</span>
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={user.image ?? undefined} alt={user.name} />
              <AvatarFallback>{user.name[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user.name}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-8">Raid Schedule</h1>

        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Construction className="w-5 h-5 text-yellow-500" />
              <CardTitle>Under Maintenance</CardTitle>
            </div>
            <CardDescription>
              The raid schedule feature is currently being built. Check back soon!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We&apos;re working hard to bring you a seamless raid scheduling experience.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
