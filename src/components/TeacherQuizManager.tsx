"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { quizValidationSchema } from "@/models/quiz"

type MultipleChoiceQuestionDraft = {
  type: "multiple_choice"
  questionText: string
  options: [string, string, string, string]
  correctAnswerIndex: 0 | 1 | 2 | 3
  points: number
}

export default function TeacherQuizManager({ courseId }: { courseId: string }) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | "">("")
  const [passingScorePercent, setPassingScorePercent] = useState<number>(60)
  const [attemptLimit, setAttemptLimit] = useState<number | "">("")
  const [published, setPublished] = useState(false)
  const [questions, setQuestions] = useState<MultipleChoiceQuestionDraft[]>([])

  // Add a new question
  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        type: "multiple_choice",
        questionText: "",
        options: ["", "", "", ""] as [string, string, string, string],
        correctAnswerIndex: 0,
        points: 1,
      },
    ])
  }

  // Remove the last question
  const cancelLastQuestion = () => {
    setQuestions((prev) => prev.slice(0, -1))
  }

  // Update question fields
  const updateQuestion = <K extends keyof MultipleChoiceQuestionDraft>(
    index: number,
    field: K,
    value: MultipleChoiceQuestionDraft[K]
  ) => {
    setQuestions((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  // Update question option
  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    setQuestions((prev) => {
      const updated = [...prev]
      const opts = [...updated[qIndex].options] as [string, string, string, string]
      opts[optIndex as 0 | 1 | 2 | 3] = value
      updated[qIndex] = { ...updated[qIndex], options: opts }
      return updated
    })
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Quiz title is required")
      return
    }

    if (questions.length === 0) {
      toast.error("Add at least one question")
      return
    }

    // Prepare payload
    const payload = {
      courseId,
      title,
      description: description || undefined,
      questions,
      timeLimitSeconds: timeLimitMinutes === "" ? undefined : Number(timeLimitMinutes) * 60,
      passingScorePercent,
      attemptLimit: attemptLimit === "" ? undefined : Number(attemptLimit),
      published,
      instantResults: true,
      showAnswersAfterSubmission: false,
      shuffleQuestions: false,
      requiredForCertificate: true,
    }

    // Frontend validation
    const validation = quizValidationSchema.safeParse({ ...payload, course: courseId })

    if (!validation.success) {
     
      toast.error("All feilds are must be required")
      return
    }

    try {
      const res = await fetch("/api/quiz/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.error || err?.message || "Failed to create quiz")
        return
      }

      // Reset form
      setTitle("")
      setDescription("")
      setTimeLimitMinutes("")
      setAttemptLimit("")
      setPassingScorePercent(60)
      setPublished(false)
      setQuestions([])

      toast.success("Quiz created successfully!")
    } catch (error) {
      console.error("Submit error:", error)
      toast.error("Server error while creating quiz")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Quiz</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quiz title" />
        </div>

        <div className="space-y-2">
          <Label>Description (optional)</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Time limit (minutes)</Label>
            <Input
              type="number"
              min={1}
              value={timeLimitMinutes}
              onChange={(e) => setTimeLimitMinutes(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="e.g. 15"
            />
          </div>
          <div className="space-y-2">
            <Label>Passing score (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={passingScorePercent}
              onChange={(e) => setPassingScorePercent(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Attempt limit</Label>
            <Input
              type="number"
              min={1}
              value={attemptLimit}
              onChange={(e) => setAttemptLimit(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Unlimited"
            />
          </div>
          <div className="space-y-2">
            <Label>Published</Label>
            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4" />
              <span className="text-sm text-muted-foreground">{published ? "Visible to students" : "Draft"}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {questions.map((q, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-base">Question {index + 1}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  value={q.questionText}
                  placeholder="Question prompt"
                  onChange={(e) => updateQuestion(index, "questionText", e.target.value)}
                />

                <div className="grid gap-2 md:grid-cols-2">
                  {q.options.map((opt, i) => (
                    <Input
                      key={i}
                      value={opt}
                      placeholder={`Option ${i + 1}`}
                      onChange={(e) => updateOption(index, i, e.target.value)}
                    />
                  ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Correct option</Label>
                    <select
                      className="w-full border rounded-md h-10 px-3 bg-background"
                      value={q.correctAnswerIndex}
                      onChange={(e) => updateQuestion(index, "correctAnswerIndex", Number(e.target.value) as 0 | 1 | 2 | 3)}
                    >
                      <option value={0}>Option 1</option>
                      <option value={1}>Option 2</option>
                      <option value={2}>Option 3</option>
                      <option value={3}>Option 4</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Points</Label>
                    <Input type="number" min={0} value={q.points} onChange={(e) => updateQuestion(index, "points", Number(e.target.value))} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={addQuestion}>Add question</Button>
          <Button type="button" variant="outline" onClick={cancelLastQuestion} disabled={questions.length === 0}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} disabled={!title || questions.length === 0}>Save quiz</Button>
        </div>
      </CardContent>
    </Card>
  )
}