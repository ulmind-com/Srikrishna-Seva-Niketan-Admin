import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Ban, Home, ServerCrash, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

function ErrorShell({
  code,
  icon,
  title,
  description,
  action,
}: {
  code: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[70vh] place-items-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex max-w-md flex-col items-center text-center"
      >
        <div className="relative mb-6">
          <span className="select-none text-[120px] font-black leading-none brand-text-gradient">
            {code}
          </span>
          <div className="absolute inset-0 grid place-items-center [&_svg]:size-10 [&_svg]:text-primary/30">
            {icon}
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-6 flex gap-3">
          {action ?? (
            <Button asChild>
              <Link to="/">
                <Home /> Back to dashboard
              </Link>
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <ErrorShell
      code="404"
      icon={<Compass />}
      title="Page not found"
      description="The page you're looking for doesn't exist or has been moved."
    />
  );
}

export function ServerErrorPage() {
  return (
    <ErrorShell
      code="500"
      icon={<ServerCrash />}
      title="Something went wrong"
      description="An unexpected error occurred. Please try again in a moment."
      action={
        <Button onClick={() => window.location.reload()}>Reload page</Button>
      }
    />
  );
}

export function AccessDeniedPage() {
  return (
    <ErrorShell
      code="403"
      icon={<Ban />}
      title="Access denied"
      description="You don't have permission to view this page. Contact an administrator if you believe this is a mistake."
    />
  );
}
