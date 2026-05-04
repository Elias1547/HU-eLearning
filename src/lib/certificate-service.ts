import crypto from "crypto"
import { Certificate } from "@/models/certificate"
import { Course } from "@/models/course"
import { CourseProgress } from "@/models/course-progress"
import { Student } from "@/models/student"
import { generateCertificatePdfBuffer } from "@/lib/certificate-pdf"
import { notifyUser } from "@/lib/notifications"

function generateCertificateId() {
  const rand = crypto.randomBytes(6).toString("hex").toUpperCase()
  return `CERT-${Date.now()}-${rand}`
}

function getAppBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
}

export async function ensureCertificateIssued(studentId: string, courseId: string) {
  const existing = await Certificate.findOne({ student: studentId, course: courseId, status: { $ne: "revoked" } }).lean()
  if (existing) return existing

  const progress = await CourseProgress.findOne({ student: studentId, course: courseId }).lean()
  if (!progress || !progress.isComplete || (progress.percentageCompleted ?? 0) < 100) return null

  const [student, course] = await Promise.all([
    Student.findById(studentId).lean(),
    Course.findById(courseId).lean(),
  ])
  if (!student) throw new Error("Student not found")
  if (!course) throw new Error("Course not found")

  const certificateId = generateCertificateId()
  const verificationUrl = `${getAppBaseUrl()}/certificates/verify/${encodeURIComponent(certificateId)}`

  const pdfBuffer = await generateCertificatePdfBuffer({
    studentName: student.name || student.email || "Student",
    courseName: course.name || "Course",
    certificateId,
    issueDate: new Date(),
    verificationUrl,
  })

  const created = await Certificate.create({
    student: studentId,
    course: courseId,
    certificateId,
    issueDate: new Date(),
    status: "issued",
    adminValidated: true,
    pdfBase64: pdfBuffer.toString("base64"),
  })

  // Attach to student profile if schema supports it
  await Student.updateOne({ _id: studentId }, { $addToSet: { certificates: created._id } }).catch(() => {})

  await notifyUser({
    userId: studentId,
    userRole: "student",
    type: "certificate_eligible",
    title: "Certificate available",
    body: `Your certificate for "${course.name}" is now available.`,
    link: `/certificates/verify/${encodeURIComponent(certificateId)}`,
    courseId,
    data: { certificateId },
  }).catch(() => {})

  return created.toJSON()
}

