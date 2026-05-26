import { Button } from "@/components/ui/button";
import { LoginButton } from "@/components/login-button";
import { Swords } from "lucide-react";

const BOT_INVITE_URL =
  "https://discord.com/oauth2/authorize?client_id=1508522662652018828&permissions=3136&integration_type=0&scope=bot+applications.commands";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-8 text-center max-w-xl px-6">
        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-secondary border border-border">
          <Swords className="w-10 h-10 text-foreground" />
        </div>

        <div className="space-y-3">
          <h1 className="text-5xl font-bold tracking-tight">Yom Bot</h1>
          <p className="text-lg text-muted-foreground">
            Organize and manage your guild&apos;s raid schedules on Discord.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button asChild size="lg" className="sm:flex-1">
            <a href={BOT_INVITE_URL} target="_blank" rel="noopener noreferrer">
              Add to Server
            </a>
          </Button>
          <LoginButton />
        </div>
      </div>
    </main>
  );
}
