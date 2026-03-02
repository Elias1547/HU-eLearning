import mongoose from "mongoose"
import { z } from "zod"

const quizQuestionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["multiple_choice", "true_false", "short_answer"],
      required: true,
      default: "multiple_choice",
    },
    prompt: { type: String, required: true },
    options: [{ type: String }], // used for multiple_choice (and optionally true_false)
    correctOptionIndex: { type: Number }, // multiple_choice
    correctBoolean: { type: Boolean }, // true_false
    correctText: { type: String }, // short_answer (optional if manual grading)
    points: { type: Number, default: 1, min: 0 },
    explanation: { type: String },
    requiresManualGrading: { type: Boolean, default: false }, // short_answer typically
  },
  { _id: true }
)

const quizSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    questions: { type: [quizQuestionSchema], default: [] },

    // Settings
    timeLimitSeconds: { type: Number }, // undefined/null => no limit
    passingScorePercent: { type: Number, default: 60, min: 0, max: 100 },
    attemptLimit: { type: Number }, // undefined/null => unlimited
    showAnswersAfterSubmission: { type: Boolean, default: false },
    instantResults: { type: Boolean, default: true },
    shuffleQuestions: { type: Boolean, default: false },
    published: { type: Boolean, default: false, index: true },
    requiredForCertificate: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const Quiz = mongoose.models?.Quiz ? mongoose.models.Quiz : mongoose.model("Quiz", quizSchema)

export const questionValidationSchema = z
  .object({
    type: z.enum(["multiple_choice", "true_false", "short_answer"]).default("multiple_choice"),
    prompt: z.string().min(3, "Question must be at least 3 characters"),
    options: z.array(z.string()).optional(),
    correctOptionIndex: z.number().int().min(0).optional(),
    correctBoolean: z.boolean().optional(),
    correctText: z.string().optional(),
    points: z.number().min(0).default(1),
    explanation: z.string().optional(),
    requiresManualGrading: z.boolean().default(false),
  })
  .superRefine((val, ctx) => {
    if (val.type === "multiple_choice") {
      if (!val.options || val.options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: "At least 2 options are required",
        })
      }
      if (typeof val.correctOptionIndex !== "number") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["correctOptionIndex"],
          message: "correctOptionIndex is required for multiple choice",
        })
      }
    }
    if (val.type === "true_false") {
      if (typeof val.correctBoolean !== "boolean") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["correctBoolean"],
          message: "correctBoolean is required for true/false",
        })
      }
    }
    if (val.type === "short_answer" && !val.requiresManualGrading) {
      if (!val.correctText || val.correctText.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["correctText"],
          message: "correctText is required for auto-graded short answer",
        })
      }
    }
  })

export const quizValidationSchema = z.object({
  course: z.string(),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  questions: z.array(questionValidationSchema).min(1, "At least one question is required"),
  timeLimitSeconds: z.number().int().positive().optional(),
  passingScorePercent: z.number().min(0).max(100).optional(),
  attemptLimit: z.number().int().positive().optional(),
  showAnswersAfterSubmission: z.boolean().optional(),
  instantResults: z.boolean().optional(),
  shuffleQuestions: z.boolean().optional(),
  published: z.boolean().optional(),
  requiredForCertificate: z.boolean().optional(),
})

export type QuizType = z.infer<typeof quizValidationSchema>
export type QuestionType = z.infer<typeof questionValidationSchema>
