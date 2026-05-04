import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/dbConnect";
import { Student } from "@/models/student";
import { Teacher } from "@/models/teacher";
import { Course } from "@/models/course";
import { Payment } from "@/models/payment";
import { Review } from "@/models/review";
import AnalyticsClient from "./analytics-client";

export default async function AdminAnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    redirect("/admin/signin");
  }

  await dbConnect();

  const [studentsRaw, teachersRaw, coursesRaw, paymentsRaw, reviewsRaw] =
    await Promise.all([
      Student.find({}, "createdAt").lean(),
      Teacher.find({}, "createdAt").lean(),
      Course.find({}, "createdAt category level price isPublished studentsPurchased")
        .lean(),
      Payment.find({}, "createdAt amount status paymentOption").lean(),
      Review.find({}, "createdAt rating").lean(),
    ]);

  const students = (studentsRaw as Array<{ createdAt?: Date | string }>).map((item) => ({
    createdAt: new Date(item.createdAt ?? Date.now()).toISOString(),
  }));
  const teachers = (teachersRaw as Array<{ createdAt?: Date | string }>).map((item) => ({
    createdAt: new Date(item.createdAt ?? Date.now()).toISOString(),
  }));
  const courses = (
    coursesRaw as Array<{
      createdAt?: Date | string;
      category?: string;
      level?: string;
      isPublished?: boolean;
      price?: number;
      studentsPurchased?: unknown[];
    }>
  ).map((item) => ({
    createdAt: new Date(item.createdAt ?? Date.now()).toISOString(),
    category: item.category,
    level: item.level,
    isPublished: item.isPublished,
    price: item.price ?? 0,
    studentsPurchased: item.studentsPurchased?.length ?? 0,
  }));
  const payments = (
    paymentsRaw as Array<{
      createdAt?: Date | string;
      amount?: number;
      status?: "pending" | "completed" | "failed";
      paymentOption?: string;
    }>
  ).map((item) => ({
    createdAt: new Date(item.createdAt ?? Date.now()).toISOString(),
    amount: item.amount ?? 0,
    status: item.status ?? "pending",
    paymentOption: item.paymentOption,
  }));
  const reviews = (
    reviewsRaw as Array<{
      createdAt?: Date | string;
      rating?: number;
    }>
  ).map((item) => ({
    createdAt: new Date(item.createdAt ?? Date.now()).toISOString(),
    rating: item.rating ?? 0,
  }));

  return (
    <AnalyticsClient
      students={students}
      teachers={teachers}
      courses={courses}
      payments={payments}
      reviews={reviews}
    />
  );
}
