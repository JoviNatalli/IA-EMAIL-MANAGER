import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { avatarColorFor, initials } from "@/lib/emails/format";
import { cn } from "@/lib/utils";

export function SenderAvatar({
  name,
  email,
  className,
}: {
  name: string | null;
  email: string;
  className?: string;
}) {
  return (
    <Avatar className={cn("size-9", className)}>
      <AvatarFallback className={cn("font-medium", avatarColorFor(email))}>
        {initials(name, email)}
      </AvatarFallback>
    </Avatar>
  );
}
