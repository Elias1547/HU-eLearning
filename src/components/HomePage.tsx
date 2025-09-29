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
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 bg-gradient-to-br from-background via-background/95 to-primary/5 dark:from-background dark:via-background/90 dark:to-primary/10">
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.03]"></div>
          <div className="relative container mx-auto px-4 flex flex-col items-center justify-center gap-8 min-h-[70vh]">
            <ScaleIn
              delay={0.2}
              className="flex-1 flex justify-center items-center"
            >
              <div className="relative group">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full blur-lg group-hover:blur-xl transition-all duration-300"></div>
                <Image
                  src="/edulearn-logo.png"
                  alt="EduLearn Platform"
                  width={80}
                  height={60}
                  className="relative rounded-lg shadow-xl drop-shadow-2xl transition-transform group-hover:scale-105"
                  priority
                />
              </div>
            </ScaleIn>
            <div className="flex-1 space-y-6 text-center flex flex-col justify-center items-center">
              <TextReveal
                text="Learn Without Limits"
                element="h1"
                className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text"
              />
              <FadeIn delay={0.3}>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  Transform your career with thousands of expertly crafted courses. 
                  Learn at your own pace with interactive content, live sessions, and 
                  personalized learning paths tailored to your goals.
                </p>
              </FadeIn>
              <FadeIn delay={0.5}>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/courses">
                    <Button size="lg" className="gap-2 px-8 py-3 text-base font-medium hover:shadow-lg transition-all duration-200">
                      Explore Courses <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/role">
                    <Button size="lg" variant="outline" className="px-8 py-3 text-base font-medium hover:bg-primary/5 hover:border-primary/30">
                      Start Free Trial
                    </Button>
                  </Link>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>
        {/* Featured Categories */}
        <section className="py-20 bg-muted/30 dark:bg-muted/10">
          <div className="container mx-auto px-4">
            <FadeIn>
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Popular Categories
                </h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Discover courses across diverse fields and master skills that matter in today's world
                </p>
              </div>
            </FadeIn>
            <StaggerChildren className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
              <div className="group flex flex-col items-center text-center p-8 rounded-xl border bg-card hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1">
                <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors mb-4">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Web Development</h3>
                <p className="text-sm text-muted-foreground">Build modern web applications</p>
              </div>
              <div className="group flex flex-col items-center text-center p-8 rounded-xl border bg-card hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1">
                <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Business</h3>
                <p className="text-sm text-muted-foreground">Master business strategies</p>
              </div>
              <div className="group flex flex-col items-center text-center p-8 rounded-xl border bg-card hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1">
                <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors mb-4">
                  <Award className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Design</h3>
                <p className="text-sm text-muted-foreground">Create stunning visuals</p>
              </div>
              <div className="group flex flex-col items-center text-center p-8 rounded-xl border bg-card hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1">
                <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors mb-4">
                  <Globe className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Marketing</h3>
                <p className="text-sm text-muted-foreground">Grow your audience</p>
              </div>
            </StaggerChildren>
          </div>
        </section>
        {/* Why Choose Us */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <FadeIn>
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Why Choose EduLearn?
                </h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  We provide everything you need to succeed in your learning journey
                </p>
              </div>
            </FadeIn>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <SlideIn direction="up" delay={0.1}>
                <div className="group flex flex-col items-center text-center p-8 rounded-xl bg-card border hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
                  <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/20 mb-6">
                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">Quality Content</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Expertly crafted courses designed to help you master new
                    skills quickly and effectively with hands-on projects.
                  </p>
                </div>
              </SlideIn>
              <SlideIn direction="up" delay={0.2}>
                <div className="group flex flex-col items-center text-center p-8 rounded-xl bg-card border hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/20 mb-6">
                    <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">Expert Instructors</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Learn from industry professionals with years of experience
                    and proven track records in their respective fields.
                  </p>
                </div>
              </SlideIn>
              <SlideIn direction="up" delay={0.3}>
                <div className="group flex flex-col items-center text-center p-8 rounded-xl bg-card border hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
                  <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/20 mb-6">
                    <Clock className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">Flexible Learning</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Study at your own pace, on your own schedule, from anywhere
                    in the world with lifetime access to courses.
                  </p>
                </div>
              </SlideIn>
            </div>
          </div>
        </section>
        {/* Featured Courses */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
              <FadeIn>
                <h2 className="text-3xl font-bold">Featured Courses</h2>
              </FadeIn>
              <FadeIn delay={0.2}>
                <Link href="/courses">
                  <Button variant="outline" className="gap-2 w-full md:w-auto">
                    View All <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </FadeIn>
            </div>

            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="border rounded-lg overflow-hidden bg-card animate-pulse"
                  >
                    <div className="aspect-video bg-muted" />
                    <div className="p-4 space-y-3">
                      <div className="h-6 bg-muted rounded" />
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                      <div className="flex justify-between items-center pt-2">
                        <div className="h-5 bg-muted rounded w-1/4" />
                        <div className="h-8 bg-muted rounded w-1/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : featuredCourses.length > 0 ? (
              <StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {featuredCourses.map((course: CourseType) => (
                  <div
                    key={course._id}
                    className="border rounded-lg overflow-hidden bg-card hover:shadow-md transition-shadow flex flex-col"
                  >
                    <div className="aspect-video relative bg-muted">
                      <Image
                        src={
                          course.imageUrl ||
                          "/placeholder.svg?height=200&width=400&text=Course" ||
                          "/placeholder.svg"
                        }
                        alt={course.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                        priority
                      />
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-bold text-lg mb-2">{course.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {course.description.length > 100
                          ? `${course.description.substring(0, 100)}...`
                          : course.description}
                      </p>
                      <p className="text-sm mb-2">
                        <span className="font-medium">Instructor:</span>{" "}
                        {course.teacher?.name || "Unknown"}
                      </p>
                      <div className="flex justify-between items-center mt-auto pt-4 gap-2 flex-wrap">
                        <span className="font-bold text-base">
                          {course.sale ? (
                            <>
                              <span>
                                <SalePriceBlock
                                  sale={course.sale}
                                  price={course.price}
                                />
                              </span>
                              <span>
                                <SaleTimer
                                  expiryTime={course.sale.expiryTime}
                                />
                              </span>
                            </>
                          ) : course.price === 0 ? (
                            "Free"
                          ) : (
                            `₹${course.price}`
                          )}
                        </span>
                        <Link href={`/courses/${course._id}`}>
                          <Button
                            size="sm"
                            className="w-full sm:w-auto mt-2 sm:mt-0"
                          >
                            View Course
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </StaggerChildren>
            ) : (
              <FadeIn className="text-center py-10 max-w-md mx-auto">
                <h3 className="text-lg font-medium mb-2">
                  No courses available yet
                </h3>
                <p className="text-muted-foreground mb-6">
                  Be the first to create a course or check back later
                </p>
                <Link href="/teacher/courses/create">
                  <Button>Create a Course</Button>
                </Link>
              </FadeIn>
            )}
          </div>
        </section>
        {/* Student Reviews */}
        <section className="py-16 bg-muted">
          <div className="container mx-auto px-4">
            <FadeIn>
              <h2 className="text-3xl font-bold text-center mb-12">
                What Our Students Say
              </h2>
            </FadeIn>
            <FeaturedReviews />
          </div>
        </section>
        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <FadeIn>
              <h2 className="text-3xl font-bold mb-4">
                Ready to Start Learning?
              </h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="text-lg mb-8 max-w-2xl mx-auto">
                Join thousands of students who are already learning on our
                platform. Start your journey today!
              </p>
            </FadeIn>
            <ScaleIn delay={0.4}>
              <Link href="/role">
                <Button size="lg" variant="secondary" className="gap-2">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </ScaleIn>
          </div>
        </section>
      </main>
    </div>
  );
}
