"use client"

import { useEffect, useState } from "react"
import { Card,CardHeader,CardTitle,CardContent } from "./ui/card"

type QuizSubmission = {
  _id: string
  student?: { name?: string }
  scorePercent?: number
  earnedPoints?: number
  maxPoints?: number
  passed?: boolean
}

export default function TeacherQuizSubmissions({ quizId }: { quizId: string }) {
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([])

  useEffect(() => {
    fetch(`/api/quiz/${quizId}/submissions`)
      .then((res) => res.json())
      .then((data) => setSubmissions(data.submissions || []))
  }, [quizId])

  return (
    <div>
      <h2>Student Submissions</h2>

      {submissions.map((sub) => (
       <Card key={sub._id}>
  <CardHeader>
    <CardTitle>{sub.student?.name || "Unknown student"}</CardTitle>
  </CardHeader>
  <CardContent>
    Score: {sub.scorePercent ?? 0}% ({sub.earnedPoints ?? 0}/{sub.maxPoints ?? 0}) {sub.passed ? "• Passed" : ""}
  </CardContent>
</Card>
      ))}
    </div>
  )
}