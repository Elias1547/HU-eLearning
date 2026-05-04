import mongoose, { type Model } from "mongoose"

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

export type SubmissionDoc = mongoose.InferSchemaType<typeof submissionSchema>

const existingModel = (
  mongoose.models as unknown as Record<string, Model<SubmissionDoc> | undefined>
)["Submission"]

export const Submission: Model<SubmissionDoc> =
  existingModel ?? mongoose.model<SubmissionDoc>("Submission", submissionSchema)