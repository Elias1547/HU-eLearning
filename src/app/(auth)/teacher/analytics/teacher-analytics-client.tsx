"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, GraduationCap, BarChart3, CheckCircle2, CircleDashed } from "lucide-react"

type CourseOption = { id: string; name: string; isPublished: boolean }

type AnalyticsPayload = {
  courseId: string
  courseName: string
  totalEnrolled: number
  completedStudents: number
  incompleteStudents: number
  students: {
    studentId: string
    name: string
    email: string
    progressPercent: number
    isCourseComplete: boolean
    updatedAt: string | null
  }[]
  quizzes: {
    quizId: string
    title: string
    totalAttempts: number
    uniqueStudents: number
    averageScorePercent: number
    passRatePercent: number
  }[]
}

export function TeacherAnalyticsClient({ courses }: { courses: CourseOption[] }) {
  const defaultId = courses[0]?.id ?? ""
  const [courseId, setCourseId] = useState(defaultId)
  const [data, setData] = useState<AnalyticsPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (id: string) => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/teacher/analytics/${id}`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || "Failed to load")
      }
      setData(await res.json())
    } catch (e) {
      setData(null)
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (courseId) load(courseId)
  }, [courseId, load])

  const selectedCourse = useMemo(() => courses.find((c) => c.id === courseId), [courses, courseId])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2 sm:max-w-md">
          <label className="text-sm font-medium">Course</label>
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {!c.isPublished ? " (draft)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedCourse && !selectedCourse.isPublished && (
          <Badge variant="secondary">Draft — analytics still available</Badge>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {!loading && data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Enrolled
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums">{data.totalEnrolled}</p>
                <p className="mt-1 text-xs text-muted-foreground">{data.courseName}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Course complete
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums">{data.completedStudents}</p>
                <p className="mt-1 text-xs text-muted-foreground">Met all completion requirements</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <CircleDashed className="h-4 w-4 text-amber-600" />
                  In progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums">{data.incompleteStudents}</p>
                <p className="mt-1 text-xs text-muted-foreground">Still working through the course</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <GraduationCap className="h-4 w-4" />
                  Completion rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums">
                  {data.totalEnrolled > 0
                    ? Math.round((data.completedStudents / data.totalEnrolled) * 1000) / 10
                    : 0}
                  %
                </p>
                <Progress
                  className="mt-3 h-2"
                  value={data.totalEnrolled > 0 ? (data.completedStudents / data.totalEnrolled) * 100 : 0}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Student progress
              </CardTitle>
              <CardDescription>Overall course progress percentage per enrolled student</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {data.students.length === 0 ? (
                <p className="text-sm text-muted-foreground">No students enrolled yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="w-[200px]">Progress</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.students.map((s) => (
                      <TableRow key={s.studentId}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-muted-foreground">{s.email}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={Math.min(100, s.progressPercent)} className="h-2 flex-1" />
                            <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
                              {s.progressPercent}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {s.isCourseComplete ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600">Complete</Badge>
                          ) : (
                            <Badge variant="secondary">Incomplete</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quiz performance</CardTitle>
              <CardDescription>Attempts, averages, and pass rates across published quizzes</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {data.quizzes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No published quizzes in this course.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quiz</TableHead>
                      <TableHead className="text-right">Attempts</TableHead>
                      <TableHead className="text-right">Students</TableHead>
                      <TableHead className="text-right">Avg score</TableHead>
                      <TableHead className="text-right">Pass rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.quizzes.map((q) => (
                      <TableRow key={q.quizId}>
                        <TableCell className="font-medium">{q.title}</TableCell>
                        <TableCell className="text-right tabular-nums">{q.totalAttempts}</TableCell>
                        <TableCell className="text-right tabular-nums">{q.uniqueStudents}</TableCell>
                        <TableCell className="text-right tabular-nums">{q.averageScorePercent}%</TableCell>
                        <TableCell className="text-right tabular-nums">{q.passRatePercent}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
