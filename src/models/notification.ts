import mongoose from "mongoose"

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userRole: { type: String, enum: ["teacher", "student", "admin"], required: true },
    type: { type: String },
    title: { type: String, required: true },
    body: { type: String },
    link: { type: String },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    data: { type: mongoose.Schema.Types.Mixed },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export const Notification =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema)
