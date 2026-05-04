import mongoose from "mongoose"
import { z } from "zod"

const announcementSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: false }, // optional for global
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // teacher/admin creating it
  title: { type: String, required: true },
  message: { type: String, required: true },
  scope: { type: String, enum: ["global", "course"], required: true },
  createdAt: { type: Date, default: Date.now },
})

export const Announcement = mongoose.models?.Announcement
  ? mongoose.models.Announcement
  : mongoose.model("Announcement", announcementSchema)

export const announcementValidationSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  message: z.string().min(3, "Message must be at least 3 characters"),
  scope: z.enum(["global", "course"]),
  course: z.string().optional(),
})

export type AnnouncementType = z.infer<typeof announcementValidationSchema>