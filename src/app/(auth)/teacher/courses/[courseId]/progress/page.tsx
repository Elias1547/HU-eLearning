"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type StudentProgressRow = {
  studentId: string;
  name: string;
  email: string;
  completedVideos: number;
  totalVideos: number;
  percentageCompleted: number;
};

export default function TeacherCourseProgressPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;
  const [rows, setRows] = useState<StudentProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.name} ${r.email}`.toLowerCase().includes(q));
  }, [rows, query]);

  const fetchProgress = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/teacher/progress/${courseId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch progress");
      setRows(data.students || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch progress");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Student Progress</h1>
          <p className="text-muted-foreground">
            Track how students are progressing through course videos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchProgress} disabled={loading}>
            Refresh
          </Button>
          <Button asChild variant="outline">
            <Link href="/teacher/courses">Back</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search by student name or email.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3 flex-col md:flex-row md:items-center">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students…"
          />
          <Badge variant="secondary">{filtered.length} students</Badge>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Progress Overview</CardTitle>
          <CardDescription>Completion is based on watched videos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground">No students found.</div>
          ) : (
            filtered.map((row) => (
              <div key={row.studentId} className="rounded border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{row.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{row.email}</div>
                  </div>
                  <Badge variant="outline">{row.percentageCompleted.toFixed(1)}%</Badge>
                </div>
                <div className="mt-2">
                  <Progress value={row.percentageCompleted} />
                  <div className="mt-1 text-xs text-muted-foreground">
                    {row.completedVideos}/{row.totalVideos} videos completed
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

