"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ArrowUpRight,
  CheckCircle2,
  Download,
  IndianRupee,
  TrendingUp,
  Users,
} from "lucide-react";

type AnalyticsEvent = {
  createdAt: string;
  amount?: number;
  status?: "pending" | "completed" | "failed";
  paymentOption?: string;
  rating?: number;
};

type CourseEvent = {
  createdAt: string;
  category?: string;
  level?: string;
  isPublished?: boolean;
  price?: number;
  studentsPurchased?: number;
};

type RangePreset = "7d" | "30d" | "90d" | "1y" | "custom";
type ChartMetric = "users" | "revenue" | "courses";

function monthLabel(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short" });
}

function csvEscape(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export default function AnalyticsClient({
  students,
  teachers,
  payments,
  reviews,
  courses,
}: {
  students: AnalyticsEvent[];
  teachers: AnalyticsEvent[];
  payments: AnalyticsEvent[];
  reviews: AnalyticsEvent[];
  courses: CourseEvent[];
}) {
  const [preset, setPreset] = useState<RangePreset>("30d");
  const [metric, setMetric] = useState<ChartMetric>("users");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const range = useMemo(() => {
    const now = new Date();
    const end = new Date(now);
    let start = new Date(now);
    if (preset === "7d") start.setDate(now.getDate() - 7);
    if (preset === "30d") start.setDate(now.getDate() - 30);
    if (preset === "90d") start.setDate(now.getDate() - 90);
    if (preset === "1y") start.setFullYear(now.getFullYear() - 1);
    if (preset === "custom" && customStart && customEnd) {
      start = new Date(customStart);
      end.setTime(new Date(customEnd).getTime());
      end.setHours(23, 59, 59, 999);
    }
    return { start, end };
  }, [preset, customStart, customEnd]);

  const inRange = useCallback(
    (value: string) => {
      const d = new Date(value);
      return d >= range.start && d <= range.end;
    },
    [range.end, range.start]
  );

  const filtered = useMemo(() => {
    const filteredStudents = students.filter((s) => inRange(s.createdAt));
    const filteredTeachers = teachers.filter((t) => inRange(t.createdAt));
    const filteredCourses = courses.filter((c) => inRange(c.createdAt));
    const filteredPayments = payments.filter((p) => inRange(p.createdAt));
    const filteredReviews = reviews.filter((r) => inRange(r.createdAt));
    return {
      students: filteredStudents,
      teachers: filteredTeachers,
      courses: filteredCourses,
      payments: filteredPayments,
      reviews: filteredReviews,
    };
  }, [students, teachers, courses, payments, reviews, inRange]);

  const completedPayments = filtered.payments.filter((p) => p.status === "completed");
  const totalRevenue = completedPayments.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const successRate =
    filtered.payments.length > 0
      ? (completedPayments.length / filtered.payments.length) * 100
      : 0;
  const avgRating =
    filtered.reviews.length > 0
      ? filtered.reviews.reduce((s, r) => s + (r.rating ?? 0), 0) /
        filtered.reviews.length
      : 0;

  const monthKeys = useMemo(() => {
    const arr: { key: string; label: string }[] = [];
    const start = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
    const end = new Date(range.end.getFullYear(), range.end.getMonth(), 1);
    const cursor = new Date(start);
    while (cursor <= end) {
      arr.push({
        key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
        label: monthLabel(cursor),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return arr;
  }, [range]);

  const chartData = useMemo(() => {
    const base = new Map(
      monthKeys.map((m) => [
        m.key,
        { label: m.label, users: 0, revenue: 0, courses: 0 },
      ])
    );

    [...filtered.students, ...filtered.teachers].forEach((u) => {
      const d = new Date(u.createdAt);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      const point = base.get(k);
      if (point) point.users += 1;
    });

    filtered.courses.forEach((c) => {
      const d = new Date(c.createdAt);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      const point = base.get(k);
      if (point) point.courses += 1;
    });

    completedPayments.forEach((p) => {
      const d = new Date(p.createdAt);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      const point = base.get(k);
      if (point) point.revenue += p.amount ?? 0;
    });

    return Array.from(base.values());
  }, [monthKeys, filtered, completedPayments]);

  const maxValue = Math.max(...chartData.map((d) => d[metric]), 1);

  const exportCsv = () => {
    const rows = [
      ["metric", "value"],
      ["range_start", range.start.toISOString()],
      ["range_end", range.end.toISOString()],
      ["students", filtered.students.length],
      ["teachers", filtered.teachers.length],
      ["courses", filtered.courses.length],
      ["revenue", totalRevenue],
      ["payments_total", filtered.payments.length],
      ["payments_success_rate", successRate.toFixed(2)],
      ["avg_rating", avgRating.toFixed(2)],
    ];
    const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "admin-analytics-report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Interactive analytics with date filtering and exports.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/dashboard">Back</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Date Range Filter</CardTitle>
          <CardDescription>Choose a preset or custom date range.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          {(["7d", "30d", "90d", "1y", "custom"] as RangePreset[]).map((p) => (
            <Button
              key={p}
              variant={preset === p ? "default" : "outline"}
              onClick={() => setPreset(p)}
            >
              {p.toUpperCase()}
            </Button>
          ))}
          {preset === "custom" && (
            <>
              <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Revenue</CardDescription>
            <CardTitle>₹{Math.round(totalRevenue).toLocaleString("en-IN")}</CardTitle>
          </CardHeader>
          <CardContent><IndianRupee className="h-5 w-5 text-primary" /></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>New Users</CardDescription>
            <CardTitle>{filtered.students.length + filtered.teachers.length}</CardTitle>
          </CardHeader>
          <CardContent><Users className="h-5 w-5 text-blue-600" /></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Payment Success</CardDescription>
            <CardTitle>{successRate.toFixed(1)}%</CardTitle>
          </CardHeader>
          <CardContent><CheckCircle2 className="h-5 w-5 text-emerald-600" /></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Rating</CardDescription>
            <CardTitle>{avgRating.toFixed(1)}</CardTitle>
          </CardHeader>
          <CardContent><TrendingUp className="h-5 w-5 text-violet-600" /></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Interactive Trend Chart</CardTitle>
          <CardDescription>Switch metric to compare growth visually.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            {(["users", "revenue", "courses"] as ChartMetric[]).map((m) => (
              <Button
                key={m}
                variant={metric === m ? "default" : "outline"}
                onClick={() => setMetric(m)}
              >
                {m}
              </Button>
            ))}
          </div>
          <div className="grid gap-3">
            {chartData.map((d) => {
              const width = Math.max((d[metric] / maxValue) * 100, 4);
              return (
                <div key={d.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{d.label}</span>
                    <span className="text-muted-foreground">
                      {metric === "revenue"
                        ? `₹${Math.round(d.revenue).toLocaleString("en-IN")}`
                        : d[metric]}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Key Actions <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Button asChild variant="outline"><Link href="/admin/users">Manage Users</Link></Button>
          <Button asChild variant="outline"><Link href="/admin/courses">Review Courses</Link></Button>
          <Button asChild variant="outline"><Link href="/admin/payments">Check Payments</Link></Button>
        </CardContent>
      </Card>
      <div className="flex gap-2 flex-wrap">
        <Badge variant="secondary">Students: {filtered.students.length}</Badge>
        <Badge variant="secondary">Teachers: {filtered.teachers.length}</Badge>
        <Badge variant="secondary">Courses: {filtered.courses.length}</Badge>
      </div>
    </div>
  );
}
