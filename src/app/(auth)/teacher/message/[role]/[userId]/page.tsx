import { getServerSession } from "next-auth"
import Chat from "@/components/Chat"
import { authOptions } from "@/lib/auth"

interface ChatPageProps {
  params: {
    role: "teacher" | "student"
    userId: string
  }
}

export default async function ChatPage({ params }: ChatPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user) return <p>Please login to chat</p>

  return (
    <div className="px-4 pb-8 pt-6 md:px-6">
      <Chat
        userId={session.user.id}
        userRole={session.user.role as "teacher" | "student"}
        receiverId={params.userId}
      />
    </div>
  )
}
