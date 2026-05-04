import mongoose from "mongoose";
import { z } from "zod";

const videoProgressSchema = new mongoose.Schema(
  {
    video: { type: mongoose.Schema.Types.ObjectId, ref: "Video", required: true },
    lastWatchedSeconds: { type: Number, default: 0, min: 0 },
    durationSeconds: { type: Number, default: 0, min: 0 },
    watchedPercentage: { type: Number, default: 0, min: 0, max: 100 },
    isCompleted: { type: Boolean, default: false },
    firstWatchedAt: { type: Date },
    lastWatchedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { _id: false }
);

const courseProgressSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    completedVideos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Video" }],
    videoProgress: [videoProgressSchema],
    lastAccessedVideo: { type: mongoose.Schema.Types.ObjectId, ref: "Video" },
    percentageCompleted: { type: Number, default: 0, min: 0, max: 100 },
    totalWatchTimeSeconds: { type: Number, default: 0, min: 0 },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

courseProgressSchema.index({ student: 1, course: 1 }, { unique: true });

export const CourseProgress =
  mongoose.models?.CourseProgress ||
  mongoose.model("CourseProgress", courseProgressSchema);

const videoProgressValidationSchema = z.object({
  video: z.string(),
  lastWatchedSeconds: z.number().min(0),
  durationSeconds: z.number().min(0),
  watchedPercentage: z.number().min(0).max(100),
  isCompleted: z.boolean(),
});

export const courseProgressValidationSchema = z.object({
  student: z.string(),
  course: z.string(),
  completedVideos: z.array(z.string()),
  videoProgress: z.array(videoProgressValidationSchema).default([]),
  lastAccessedVideo: z.string().optional(),
  percentageCompleted: z.number().min(0).max(100),
  totalWatchTimeSeconds: z.number().min(0).default(0),
});

export type CourseProgressType = z.infer<typeof courseProgressValidationSchema>;
