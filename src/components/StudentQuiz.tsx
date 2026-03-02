"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"

export default function StudentQuiz({ quizId }: { quizId: string }) {
  const [quiz, setQuiz] = useState<any>(null)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    fetch(`/api/quiz/${quizId}`)
      .then((res) => res.json())
      .then((data) => {
        setQuiz(data)
        const initial: Record<string, any> = {}
        ;(data.questions || []).forEach((q: any) => {
          initial[q._id] = null
        })
        setAnswers(initial)
        setTimeLeft(typeof data.timeLimitSeconds === "number" ? data.timeLimitSeconds : 0)
      })
  }, [quizId])

  // ⏳ TIMER
  useEffect(() => {
    if (!timeLeft || submitted) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [timeLeft, submitted])

  const setAnswer = (questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleSubmit = async () => {
    if (submitted) return

    const res = await fetch(`/api/quiz/${quizId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId,
          answer,
        })),
      }),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      alert(data?.message || "Failed to submit quiz")
      return
    }

    setSubmitted(true)
    setResult(data)
  }

  if (!quiz || !quiz.questions) {
    return <p>Loading quiz...</p>
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* HEADER */}
      <Card>
        <CardHeader>
          <CardTitle>{quiz.title}</CardTitle>
          {typeof quiz.timeLimitSeconds === "number" ? (
            <>
              <div className="text-sm text-muted-foreground">
                Time Left: {minutes}:{seconds.toString().padStart(2, "0")}
              </div>
              <Progress value={(timeLeft / quiz.timeLimitSeconds) * 100} />
            </>
          ) : (
            <div className="text-sm text-muted-foreground">No time limit</div>
          )}
        </CardHeader>
      </Card>

      {/* QUESTIONS */}
      {quiz.questions.map((q: any, index: number) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle>
              Question {index + 1}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <p>{q.prompt}</p>

            {q.type === "multiple_choice" && (
              <RadioGroup
                onValueChange={(value) => setAnswer(q._id, Number(value))}
                disabled={submitted}
                value={answers[q._id] !== null ? String(answers[q._id]) : undefined}
              >
                {(q.options || []).map((opt: string, i: number) => (
                  <div key={i} className="flex items-center space-x-2">
                    <RadioGroupItem value={i.toString()} id={`${q._id}-${i}`} />
                    <Label htmlFor={`${q._id}-${i}`}>{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {q.type === "true_false" && (
              <RadioGroup
                onValueChange={(value) => setAnswer(q._id, value === "true")}
                disabled={submitted}
                value={typeof answers[q._id] === "boolean" ? String(answers[q._id]) : undefined}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id={`${q._id}-true`} />
                  <Label htmlFor={`${q._id}-true`}>True</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id={`${q._id}-false`} />
                  <Label htmlFor={`${q._id}-false`}>False</Label>
                </div>
              </RadioGroup>
            )}

            {q.type === "short_answer" && (
              <Input
                disabled={submitted}
                value={typeof answers[q._id] === "string" ? answers[q._id] : ""}
                placeholder="Your answer"
                onChange={(e) => setAnswer(q._id, e.target.value)}
              />
            )}
          </CardContent>
        </Card>
      ))}

      {/* SUBMIT */}
      {!submitted && (
        <Button onClick={handleSubmit} className="w-full">
          Submit Quiz
        </Button>
      )}

      {submitted && (
        <Card>
          <CardContent className="text-center p-6">
            ✅ Quiz submitted
            {result?.attempt && (
              <div className="mt-3 text-sm text-muted-foreground">
                Score: {result.attempt.scorePercent}% ({result.attempt.earnedPoints}/{result.attempt.maxPoints}){" "}
                {result.attempt.passed ? "• Passed" : "• Not passed"}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}