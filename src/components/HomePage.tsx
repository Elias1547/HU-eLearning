"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BookOpen,
  Users,
  Award,
  Clock,
  Globe,
  CheckCircle
} from "lucide-react";
import { useEffect, useState } from "react";
import { FadeIn } from "@/components/animations/fade-in";
import { SlideIn } from "@/components/animations/slide-in";
import { ScaleIn } from "@/components/animations/scale-in";
import { StaggerChildren } from "@/components/animations/stagger-children";
import { TextReveal } from "@/components/animations/text-reveal";
import { FeaturedReviews } from "@/components/featured-reviews";
import { SaleTimer, SalePriceBlock } from "@/components/courses/course-sales";

interface Teacher {
  name: string;
}

interface SaleData {
  _id: string;
  amount: number;
  saleTime: string;
  expiryTime?: string;
  notes?: string;
}

interface CourseType {
  _id: string;
  name: string;
  description: string;
  imageUrl?: string;
  price: number;
  teacher?: Teacher;
  sale?: SaleData | null;
}

export default function Home() {
  const [featuredCourses, setFeaturedCourses] = useState<CourseType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch("/api/courses?isPublished=true");
        const data = await response.json();
        const courses: CourseType[] = data.courses.slice(0, 3);

        // Fetch active sale for each course
        const coursesWithSales = await Promise.all(
          courses.map(async (course) => {
            try {
              const saleRes = await fetch(`/api/courses/${course._id}/sales`);
              if (!saleRes.ok) return { ...course, sale: null };
              const saleData: { sales?: SaleData[] } = await saleRes.json();
              const now = new Date();
              const activeSale =
                saleData.sales?.find(
                  (sale) =>
                    new Date(sale.saleTime) <= now &&
                    (!sale.expiryTime || new Date(sale.expiryTime) >= now)
                ) || null;
              return { ...course, sale: activeSale };
            } catch {
              return { ...course, sale: null };
            }
          })
        );
        setFeaturedCourses(coursesWithSales);
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border/60 bg-lms-mesh">
  
          <Image
            src="/image-10.jpg"
            alt="Modern LMS dashboard background"
            fill
            priority
            className="object-cover object-center"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/90 via-background/62 to-background/20" />
          <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.16]" />
          <div className="relative mx-auto flex min-h-[72vh] max-w-7xl flex-col items-center gap-12 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:px-8 lg:py-20">
            <div className="flex w-full max-w-xl flex-1 flex-col items-center gap-8 text-center lg:items-start lg:text-left">
              <FadeIn delay={0.1}>
                <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                  
                </span>
              </FadeIn>
              <TextReveal
                text="Learn with clarity. Teach with confidence."
                element="h1"
                className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-[2.75rem] lg:leading-[1.1]"
              />
             <FadeIn delay={0.25}>
              <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground dark:text-slate-200">
                A calm, focused workspace for online education—structured like the
                platforms you already trust, tuned for deep work and steady progress.
              </p>
             </FadeIn>
              <FadeIn delay={0.4}>
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                  <Link href="/courses" className="sm:w-auto sm:flex-initial">
                    <Button
                      size="lg"
                      className="h-12 w-full gap-2 px-8 text-base font-semibold shadow-md sm:w-auto"
                    >
                      Browse courses
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/role" className="sm:w-auto sm:flex-initial">
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-12 w-full border-border/80 bg-background/80 px-8 text-base font-semibold backdrop-blur-sm sm:w-auto"
                    >
                      Sign in or register
                    </Button>
                  </Link>
                </div>
              </FadeIn>
              <FadeIn delay={0.55}>
                <dl className="grid w-full max-w-md grid-cols-3 gap-4 border-t border-border/60 pt-6 text-center sm:max-w-lg lg:text-left">
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Courses
                    </dt>
                    <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                      Live
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Pace
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-foreground">Self-paced</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Access
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-foreground">Anywhere</dd>
                  </div>
                </dl>
              </FadeIn>
            </div>

            {/* <ScaleIn delay={0.2} className="flex w-full max-w-md flex-1 justify-center lg:max-w-lg lg:justify-end">
              <div className="relative w-full max-w-sm">
                <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-primary/15 via-transparent to-primary/5 blur-2xl" />
                <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/90 p-6 shadow-xl ring-1 ring-black/[0.04] backdrop-blur-md dark:ring-white/[0.06]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Spotlight
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">HU eLearning</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <BookOpen className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-6 overflow-hidden rounded-xl border border-border/60 bg-muted/40">
                    <Image
                      src="/edulearn-logo.png"
                      alt="HU eLearning"
                      width={320}
                      height={200}
                      className="h-auto w-full object-cover"
                      priority
                    />
                  </div>
                  <ul className="mt-5 space-y-2.5 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
                      Structured lessons with clear outcomes
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
                      Instructor tools that stay out of your way
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
                      Responsive UI for phone, tablet, and desktop
                    </li>
                  </ul>
                </div>
              </div>
            </ScaleIn> */}
          </div>
           <div className="absolute inset-x-0 bottom-0 h-50 bg-gradient-to-t from-background via-background/30 to-transparent" />
        </section>
        <section className="border-b border-border/60 bg-muted/25 py-16 dark:bg-muted/10 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="mx-auto mb-12 max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                  Explore by focus area
                </h2>
                <p className="mt-3 text-pretty text-lg text-muted-foreground">
                  Pick a path that matches your goals—each category is designed to feel
                  approachable from day one.
                </p>
              </div>
            </FadeIn>
            <StaggerChildren className="mx-auto grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
              {[
                { title: "Web development", desc: "Ship modern apps", icon: BookOpen },
                { title: "Business", desc: "Strategy & execution", icon: Users },
                { title: "Design", desc: "Craft clear visuals", icon: Award },
                { title: "Marketing", desc: "Grow with intention", icon: Globe },
              ].map((cat) => {
                const Icon = cat.icon;
                return (
                  <div
                    key={cat.title}
                    className="group flex flex-col rounded-2xl border border-border/70 bg-card/90 p-6 text-center shadow-sm ring-1 ring-black/[0.03] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md dark:ring-white/[0.04]"
                  >
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-foreground">{cat.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{cat.desc}</p>
                  </div>
                );
              })}
            </StaggerChildren>
          </div>
        </section>
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="mx-auto mb-12 max-w-2xl text-center">
                <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                  Built for serious learners
                </h2>
                <p className="mt-3 text-pretty text-lg text-muted-foreground">
                  Less noise, more signal—so you can stay oriented and make steady progress.
                </p>
              </div>
            </FadeIn>
            <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3 md:gap-8">
              <SlideIn direction="up" delay={0.1}>
                <div className="flex h-full flex-col rounded-2xl border border-border/70 bg-card p-8 shadow-sm ring-1 ring-black/[0.03] transition-shadow hover:shadow-md dark:ring-white/[0.04]">
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Quality-first lessons</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Clear structure, practical exercises, and outcomes you can verify—not
                    endless scrolling.
                  </p>
                </div>
              </SlideIn>
              <SlideIn direction="up" delay={0.2}>
                <div className="flex h-full flex-col rounded-2xl border border-border/70 bg-card p-8 shadow-sm ring-1 ring-black/[0.03] transition-shadow hover:shadow-md dark:ring-white/[0.04]">
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-700 dark:text-sky-400">
                    <Users className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Instructor-friendly</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Tools that help teachers publish, iterate, and support learners—without a
                    steep learning curve.
                  </p>
                </div>
              </SlideIn>
              <SlideIn direction="up" delay={0.3}>
                <div className="flex h-full flex-col rounded-2xl border border-border/70 bg-card p-8 shadow-sm ring-1 ring-black/[0.03] transition-shadow hover:shadow-md dark:ring-white/[0.04]">
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-700 dark:text-violet-300">
                    <Clock className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Flexible pacing</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Learn on your schedule with layouts that stay readable on every screen size.
                  </p>
                </div>
              </SlideIn>
            </div>
          </div>
        </section>
        <section className="border-t border-border/60 bg-muted/20 py-16 dark:bg-muted/10 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <FadeIn>
                <h2 className="text-3xl font-bold tracking-tight text-foreground">
                  Featured courses
                </h2>
                <p className="mt-2 max-w-xl text-muted-foreground">
                  Hand-picked highlights from the catalog—updated as new content goes live.
                </p>
              </FadeIn>
              <FadeIn delay={0.15}>
                <Link href="/courses">
                  <Button variant="outline" className="gap-2 font-semibold">
                    View courses
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </FadeIn>
            </div>

            {loading ? (
              <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="overflow-hidden rounded-2xl border border-border/70 bg-card animate-pulse shadow-sm"
                  >
                    <div className="aspect-video bg-muted" />
                    <div className="space-y-3 p-5">
                      <div className="h-5 rounded-md bg-muted" />
                      <div className="h-4 rounded-md bg-muted w-4/5" />
                      <div className="h-4 rounded-md bg-muted w-3/5" />
                      <div className="flex items-center justify-between pt-3">
                        <div className="h-5 w-20 rounded-md bg-muted" />
                        <div className="h-9 w-28 rounded-lg bg-muted" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : featuredCourses.length > 0 ? (
              <StaggerChildren className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {featuredCourses.map((course: CourseType) => (
                  <article
                    key={course._id}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm ring-1 ring-black/[0.03] transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md dark:ring-white/[0.04]"
                  >
                    <div className="relative aspect-video overflow-hidden bg-muted">
                      <Image
                        src={
                          course.imageUrl ||
                          "/placeholder.svg?height=200&width=400&text=Course" ||
                          "/placeholder.svg"
                        }
                        alt={course.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        sizes="(max-width: 768px) 100vw, 33vw"
                        priority
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-80" />
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="line-clamp-2 text-lg font-semibold tracking-tight text-foreground">
                        {course.name}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {course.description.length > 100
                          ? `${course.description.substring(0, 100)}…`
                          : course.description}
                      </p>
                      <p className="mt-3 text-xs font-medium text-muted-foreground">
                        Instructor ·{" "}
                        <span className="text-foreground">{course.teacher?.name || "Unknown"}</span>
                      </p>
                      <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-border/60 pt-4">
                        <div className="text-base font-semibold tabular-nums text-foreground">
                          {course.sale ? (
                            <div className="space-y-1">
                              <SalePriceBlock sale={course.sale} price={course.price} />
                              <SaleTimer expiryTime={course.sale.expiryTime} />
                            </div>
                          ) : course.price === 0 ? (
                            "Free"
                          ) : (
                            `₹${course.price}`
                          )}
                        </div>
                        <Link href={`/courses/${course._id}`}>
                          <Button size="sm" className="font-semibold">
                            View course
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </StaggerChildren>
            ) : (
              <FadeIn className="mx-auto max-w-md rounded-2xl border border-dashed border-border/70 bg-card/60 p-10 text-center">
                <h3 className="text-lg font-semibold text-foreground">No published courses yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Check back soon—or publish the first course to kick things off.
                </p>
                <Link href="/teacher/courses/create" className="mt-6 inline-block">
                  <Button>Create a course</Button>
                </Link>
              </FadeIn>
            )}
          </div>
        </section>
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <h2 className="mb-10 text-center text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                What learners say
              </h2>
            </FadeIn>
            <FeaturedReviews />
          </div>
        </section>
        <section className="border-t border-border/60 bg-primary py-16 text-primary-foreground sm:py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <FadeIn>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Ready when you are
              </h2>
            </FadeIn>
            <FadeIn delay={0.15}>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-primary-foreground/85 sm:text-lg">
                Create an account, pick a course, and pick up exactly where you left off—on any
                device.
              </p>
            </FadeIn>
            <ScaleIn delay={0.3}>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/role">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="h-12 gap-2 px-8 text-base font-semibold shadow-md"
                  >
                    Get started
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/courses">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 border-primary-foreground/35 bg-transparent px-8 text-base font-semibold text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  >
                    Browse courses
                  </Button>
                </Link>
              </div>
            </ScaleIn>
          </div>
        </section>
      </main>
    </div>
  );
}
