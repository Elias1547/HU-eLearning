import Link from "next/link";
import { BookOpen, Facebook, Instagram, Twitter, GraduationCap } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card text-card-foreground">
      <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <Link
              href="/"
              className="group inline-flex items-center gap-2.5 rounded-lg outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20">
                <GraduationCap className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-base font-semibold tracking-tight">HU eLearning</span>
            </Link>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
              A modern learning platform for students and instructors. Browse courses,
              track progress, and teach with tools designed for clarity and focus.
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
              >
                <Facebook className="h-4 w-4" />
                <span className="sr-only">Facebook</span>
              </Link>
              <Link
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
              >
                <Twitter className="h-4 w-4" />
                <span className="sr-only">Twitter</span>
              </Link>
              <Link
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
              >
                <Instagram className="h-4 w-4" />
                <span className="sr-only">Instagram</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                For students
              </h3>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <Link
                    href="/courses"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Browse courses
                  </Link>
                </li>
                <li>
                  <Link
                    href="/student/signin"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Student sign in
                  </Link>
                </li>
                <li>
                  <Link
                    href="/student/signup"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Create account
                  </Link>
                </li>
                <li>
                  <Link
                    href="/student/dashboard"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    My learning
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                For instructors
              </h3>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <Link
                    href="/teacher/signin"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Instructor sign in
                  </Link>
                </li>
                <li>
                  <Link
                    href="/teacher/signup"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Become an instructor
                  </Link>
                </li>
                <li>
                  <Link
                    href="/teacher/dashboard"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Instructor home
                  </Link>
                </li>
                <li>
                  <Link
                    href="/teacher/courses/create"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Create a course
                  </Link>
                </li>
              </ul>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Support
              </h3>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <Link
                    href="/help"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Help center
                  </Link>
                </li>
                <li>
                  <Link
                    href="/faq"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-8 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
          <p>&copy; {new Date().getFullYear()} HU eLearning. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            Built for focused online education
          </p>
        </div>
      </div>
    </footer>
  );
}
