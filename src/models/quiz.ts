import mongoose from "mongoose"
import { z } from "zod"

// --------------------
// Mongoose Schema
// --------------------
const quizSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true }, // Mongoose expects "course"
  title: { type: String, required: true },
  description: { type: String }, // optional
  questions: [
    {
      questionText: { type: String, required: true },
      options: [{ type: String, required: true }],
      correctAnswerIndex: { type: Number, required: true },
      points: { type: Number, required: true, default: 1 },
    },
  ],
  timeLimitSeconds: { type: Number },
  passingScorePercent: { type: Number, required: true, default: 60 },
  attemptLimit: { type: Number },
  published: { type: Boolean, default: false },
  instantResults: { type: Boolean, default: true },
  showAnswersAfterSubmission: { type: Boolean, default: false },
  shuffleQuestions: { type: Boolean, default: false },
  requiredForCertificate: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
})

export const Quiz = mongoose.models?.Quiz ? mongoose.models.Quiz : mongoose.model("Quiz", quizSchema)

// --------------------
// Zod Validation Schemas
// --------------------
export const questionValidationSchema = z.object({
  questionText: z.string().min(3, "Question must be at least 3 characters"),
  options: z
    .array(z.string().min(1, "Option cannot be empty"))
    .length(4, "Must have exactly 4 options"),
  correctAnswerIndex: z.number().min(0).max(3),
  points: z.number().min(1, "Points must be at least 1"),
})

export const quizValidationSchema = z.object({
  courseId: z.string().min(1, "Course is required"), // frontend uses courseId
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  questions: z
    .array(questionValidationSchema)
    .min(1, "At least one question is required"),
  timeLimitSeconds: z.number().optional(),
  passingScorePercent: z.number().min(0).max(100),
  attemptLimit: z.number().optional(),
  published: z.boolean(),
  instantResults: z.boolean(),
  showAnswersAfterSubmission: z.boolean(),
  shuffleQuestions: z.boolean(),
  requiredForCertificate: z.boolean(),
})

// --------------------
// Typescript Types
// --------------------
export type QuizType = z.infer<typeof quizValidationSchema>
export type QuestionType = z.infer<typeof questionValidationSchema>