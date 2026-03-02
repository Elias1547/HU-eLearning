import mongoose from "mongoose"

const QuizAttemptAnswerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    answer: { type: mongoose.Schema.Types.Mixed }, // number | boolean | string | null
  },
  { _id: false }
)

const AttemptSchema = new mongoose.Schema(
  {
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },

    attemptNumber: { type: Number, required: true, default: 1 },
    status: {
      type: String,
      enum: ["submitted", "pending_manual_grading", "graded"],
      default: "submitted",
      index: true,
    },

    answers: { type: [QuizAttemptAnswerSchema], default: [] },

    earnedPoints: { type: Number, required: true, default: 0 },
    maxPoints: { type: Number, required: true, default: 0 },
    scorePercent: { type: Number, required: true, default: 0 },
    passed: { type: Boolean, required: true, default: false, index: true },

    startedAt: { type: Date },
    submittedAt: { type: Date, default: Date.now },
    durationSeconds: { type: Number },

    gradedAt: { type: Date },
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
  },
  { timestamps: true }
)

// prevent duplicate attempt numbers per (student, quiz)
AttemptSchema.index({ quiz: 1, student: 1, attemptNumber: 1 }, { unique: true })

export const QuizAttempt =
  mongoose.models.QuizAttempt ||
  mongoose.model("QuizAttempt", AttemptSchema)