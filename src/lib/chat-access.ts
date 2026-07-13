import { Course } from "@/models/course"
import { Message } from "@/models/message"
import { Student } from "@/models/student"
import { Teacher } from "@/models/teacher"
import type { ConversationContact, SharedCourseSummary } from "@/lib/chat-types"

type SerializableId = { toString(): string }

function sortConversations(a: ConversationContact, b: ConversationContact) {
  if (!a.lastMessageAt && !b.lastMessageAt) return a.name.localeCompare(b.name)
  if (!a.lastMessageAt) return 1
  if (!b.lastMessageAt) return -1
  return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
}

function dedupeCourses(courses: SharedCourseSummary[]) {
  const uniqueCourses = new Map<string, SharedCourseSummary>()
  for (const course of courses) {
    uniqueCourses.set(course._id, course)
  }

  return [...uniqueCourses.values()]
}

export async function getConversationContacts(
  userId: string,
  userRole: "teacher" | "student"
) {
  let contacts: ConversationContact[] = []

  if (userRole === "teacher") {
    const teacherCourses = await Course.find({ teacher: userId })
      .select("_id name studentsPurchased")
      .lean<
        {
          _id: SerializableId
          name: string
          studentsPurchased?: SerializableId[]
        }[]
      >()

    const studentCourseMap = new Map<string, SharedCourseSummary[]>()
    for (const course of teacherCourses) {
      for (const studentId of course.studentsPurchased || []) {
        const key = studentId.toString()
        const existingCourses = studentCourseMap.get(key) || []
        existingCourses.push({ _id: course._id.toString(), name: course.name })
        studentCourseMap.set(key, existingCourses)
      }
    }

    const studentIds = [...studentCourseMap.keys()]
    if (studentIds.length > 0) {
      const students = await Student.find({ _id: { $in: studentIds } })
        .select("name email")
        .lean<
          {
            _id: SerializableId
            name: string
            email: string
          }[]
        >()

      contacts = students.map((student) => ({
        _id: student._id.toString(),
        name: student.name,
        email: student.email,
        role: "student",
        sharedCourses: dedupeCourses(studentCourseMap.get(student._id.toString()) || []),
        lastMessage: null,
        lastMessageAt: null,
      }))
    }
  }

  if (userRole === "student") {
    const student = await Student.findById(userId)
      .select("purchasedCourses")
      .lean<{ purchasedCourses?: SerializableId[] } | null>()

    const purchasedCourseIds = student?.purchasedCourses || []
    if (purchasedCourseIds.length > 0) {
      const courses = await Course.find({ _id: { $in: purchasedCourseIds } })
        .select("_id name teacher")
        .lean<
          {
            _id: SerializableId
            name: string
            teacher: SerializableId
          }[]
        >()

      const teacherCourseMap = new Map<string, SharedCourseSummary[]>()
      for (const course of courses) {
        const teacherId = course.teacher.toString()
        const existingCourses = teacherCourseMap.get(teacherId) || []
        existingCourses.push({ _id: course._id.toString(), name: course.name })
        teacherCourseMap.set(teacherId, existingCourses)
      }

      const teacherIds = [...teacherCourseMap.keys()]
      if (teacherIds.length > 0) {
        const teachers = await Teacher.find({ _id: { $in: teacherIds } })
          .select("name email")
          .lean<
            {
              _id: SerializableId
              name: string
              email: string
            }[]
          >()

        contacts = teachers.map((teacher) => ({
          _id: teacher._id.toString(),
          name: teacher.name,
          email: teacher.email,
          role: "teacher",
          sharedCourses: dedupeCourses(teacherCourseMap.get(teacher._id.toString()) || []),
          lastMessage: null,
          lastMessageAt: null,
        }))
      }
    }
  }

  if (contacts.length === 0) {
    return []
  }

  const contactIds = contacts.map((contact) => contact._id)
  const recentMessages = await Message.find({
    $or: [
      { senderId: userId, receiverId: { $in: contactIds } },
      { senderId: { $in: contactIds }, receiverId: userId },
    ],
  })
    .sort({ createdAt: -1 })
    .lean<
      {
        senderId: SerializableId
        receiverId: SerializableId
        text: string
        createdAt: Date
      }[]
    >()

  const latestByContact = new Map<string, { text: string; createdAt: string }>()
  for (const message of recentMessages) {
    const otherUserId =
      message.senderId.toString() === userId
        ? message.receiverId.toString()
        : message.senderId.toString()

    if (!latestByContact.has(otherUserId)) {
      latestByContact.set(otherUserId, {
        text: message.text,
        createdAt: message.createdAt.toISOString(),
      })
    }
  }

  return contacts
    .map((contact) => {
      const latestMessage = latestByContact.get(contact._id)
      return {
        ...contact,
        lastMessage: latestMessage?.text || null,
        lastMessageAt: latestMessage?.createdAt || null,
      }
    })
    .sort(sortConversations)
}

export async function getConversationContact(
  userId: string,
  userRole: "teacher" | "student",
  contactId: string
) {
  const contacts = await getConversationContacts(userId, userRole)
  return contacts.find((contact) => contact._id === contactId) || null
}
