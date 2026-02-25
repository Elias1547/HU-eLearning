import mongoose from "mongoose"

const submissionSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
    },
    fileUrl: String,
    graded: {
      type: Boolean,
      default: false,
    },
    grade: Number,
  },
  { timestamps: true }
)

export const Submission =
  mongoose.models.Submission ||
  mongoose.model("Submission", submissionSchema)