import mongoose from "mongoose"
import { z } from "zod"

const quizProgressEntrySchema = new mongoose.Schema(
  {
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
    bestScorePercent: { type: Number, default: 0 },
    latestScorePercent: { type: Number, default: 0 },
    attemptCount: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    /** True once the student has a recorded submission for this quiz */
    completed: { type: Boolean, default: false },
    lastSubmittedAt: { type: Date },
  },
  { _id: false }
)

const courseProgressSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  completedVideos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Video" }], // Which videos completed
  lastAccessedVideo: { type: mongoose.Schema.Types.ObjectId, ref: "Video" },
  submittedAssignments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Assignment" }],
  passedQuizzes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Quiz" }],
  /** Per-quiz rollup: updated on each submission */
  quizProgress: { type: [quizProgressEntrySchema], default: [] },
  videoProgress: {
    type: Map,
    of: Number, // seconds watched per video
    default: {},
  },
  /** Per-videoId string key: { percentWatched, watchDurationSeconds, lastWatchedAt, completed } */
  videoWatchDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
  breakdown: {
    lessons: {
      completed: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      weight: { type: Number, default: 0 },
      percent: { type: Number, default: 0 },
    },
    assignments: {
      completed: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      weight: { type: Number, default: 0 },
      percent: { type: Number, default: 0 },
    },
    quizzes: {
      completed: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      weight: { type: Number, default: 0 },
      percent: { type: Number, default: 0 },
    },
  },
  isComplete: { type: Boolean, default: false },
  percentageCompleted: { type: Number, default: 0 }, // Example: 25%, 50%
  updatedAt: { type: Date, default: Date.now },
})

export const CourseProgress = mongoose.models?.CourseProgress ? mongoose.models.CourseProgress : mongoose.model("CourseProgress", courseProgressSchema)

export const courseProgressValidationSchema = z.object({
  student: z.string(),
  course: z.string(),
  completedVideos: z.array(z.string()),
  percentageCompleted: z.number().min(0).max(100, "Percentage must be between 0 and 100"),
})

export type CourseProgressType = z.infer<typeof courseProgressValidationSchema>
