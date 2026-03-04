import mongoose from "mongoose"
import { z } from "zod"

/* =========================
   MONGOOSE MODEL
========================= */

const announcementSchema = new mongoose.Schema(
  {
    scope: {
      type: String,
      enum: ["global", "course"],
      required: true,
      default: "course",
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: false,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    createdByRole: {
      type: String,
      enum: ["admin", "teacher"],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
)

export const Announcement =
  mongoose.models.Announcement ||
  mongoose.model("Announcement", announcementSchema)

/* =========================
   ZOD VALIDATION (API)
========================= */

export const announcementValidationSchema = z
  .object({
    scope: z.enum(["global", "course"]),
    course: z.string().optional(),
    title: z.string().min(1, "Title is required"),
    message: z.string().min(1, "Message is required"),
  })
  .superRefine((data, ctx) => {
    if (data.scope === "course" && !data.course) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Course is required for course announcements",
        path: ["course"],
      })
    }
  })

export type AnnouncementType = z.infer<typeof announcementValidationSchema>