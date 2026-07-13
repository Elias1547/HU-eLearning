import { getServerSession } from "next-auth"
import Chat from "@/components/Chat"
import { authOptions } from "@/lib/auth"

interface ChatPageProps {
  params: Promise<{
    role: "teacher" | "student"
    userId: string
  }>
}

export default async function StudentChatPage({ params }: ChatPageProps) {
  const { role, userId } = await params
  const session = await getServerSession(authOptions)

  if (!session?.user) return <div className="p-6">Please login to chat</div>

  return (
    <div className="px-4 pb-8 pt-6 md:px-6">
      <Chat
        userId={session.user.id}
        userRole={session.user.role as "teacher" | "student"}
        receiverId={userId}
        receiverRole={role}
      />
    </div>
  )
}
