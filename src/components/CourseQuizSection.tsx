"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import TeacherQuizManager from "./TeacherQuizManager"
import TeacherQuizSubmissions from "./TeacherQuizSubmissions"
import StudentQuiz from "./StudentQuiz"

type QuizSummary = {
  _id: string
  title: string
  description?: string
  published: boolean
  requiredForCertificate: boolean
  timeLimitSeconds?: number
  passingScorePercent?: number
  attemptLimit?: number
}

export default function CourseQuizSection({ courseId }: { courseId: string }) {
  const { data: session, status } = useSession()
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null)
  const [mode, setMode] = useState<"take" | "submissions">("take")

  const role = session?.user?.role

  const canCreate = role === "teacher"
  const canViewSubmissions = role === "teacher" || role === "admin"

  const selectedQuiz = useMemo(() => quizzes.find((q) => q._id === selectedQuizId) || null, [quizzes, selectedQuizId])

  const refresh = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/quiz/course/${courseId}`)
      const data = await res.json()
      setQuizzes(data?.quizzes || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === "loading") return
    if (!session?.user) return
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, courseId])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-4">
          <span>Quizzes</span>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {canCreate && (
          <div className="space-y-3">
            <TeacherQuizManager courseId={courseId} />
            <div className="text-sm text-muted-foreground">
              After creating a quiz, hit Refresh to see it in the list.
            </div>
          </div>
        )}

        <div className="space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading quizzes…</div>
          ) : quizzes.length === 0 ? (
            <div className="text-sm text-muted-foreground">No quizzes yet.</div>
          ) : (
            quizzes.map((q) => (
              <div key={q._id} className="flex flex-col gap-2 rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium truncate">{q.title}</div>
                      {q.published ? <Badge>Published</Badge> : <Badge variant="secondary">Draft</Badge>}
                      {q.requiredForCertificate ? <Badge variant="outline">Required</Badge> : null}
                    </div>
                    {q.description ? <div className="text-sm text-muted-foreground">{q.description}</div> : null}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {typeof q.timeLimitSeconds === "number" ? `Time: ${Math.ceil(q.timeLimitSeconds / 60)}m` : "No time limit"}{" "}
                      • Pass: {q.passingScorePercent ?? 60}% • Attempts: {q.attemptLimit ?? "Unlimited"}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {role === "student" && q.published && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedQuizId(q._id)
                          setMode("take")
                        }}
                      >
                        Take quiz
                      </Button>
                    )}
                    {canViewSubmissions && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedQuizId(q._id)
                          setMode("submissions")
                        }}
                      >
                        Submissions
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {selectedQuizId && selectedQuiz && mode === "take" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium">Taking: {selectedQuiz.title}</div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedQuizId(null)}>
                Close
              </Button>
            </div>
            <StudentQuiz quizId={selectedQuizId} />
          </div>
        )}

        {selectedQuizId && selectedQuiz && mode === "submissions" && canViewSubmissions && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium">Submissions: {selectedQuiz.title}</div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedQuizId(null)}>
                Close
              </Button>
            </div>
            <TeacherQuizSubmissions quizId={selectedQuizId} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

