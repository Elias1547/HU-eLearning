import mongoose from "mongoose"

const assignmentSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    title: String,
    description: String,
    dueDate: Date,
    fileUrl: String,

    submissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Submission",
      },
    ],
  },
  { timestamps: true }
)

export const Assignment =
  mongoose.models.Assignment ||
  mongoose.model("Assignment", assignmentSchema)