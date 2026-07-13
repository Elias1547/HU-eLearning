export interface SharedCourseSummary {
  _id: string
  name: string
}

export interface ConversationContact {
  _id: string
  name: string
  email: string
  role: "teacher" | "student"
  sharedCourses: SharedCourseSummary[]
  lastMessage: string | null
  lastMessageAt: string | null
}

export interface ChatMessage {
  _id: string
  text: string
  senderId: string
  receiverId: string
  createdAt: string
}
