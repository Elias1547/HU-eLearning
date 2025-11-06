"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="w-[400px] rounded-2xl border border-border bg-card shadow-lg">
          <CardContent className="flex flex-col items-center justify-center p-8 space-y-6">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <AlertTriangle className="h-14 w-14 text-primary" />
            </motion.div>

            <motion.h1
              className="text-2xl font-semibold text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Page Not Found
            </motion.h1>

            <motion.p
              className="text-sm text-muted-foreground text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              The page you’re looking for doesn’t exist or has been moved.  
              Try going back to your dashboard.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Button
                onClick={() => router.push("/dashboard")}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Back to Dashboard
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
