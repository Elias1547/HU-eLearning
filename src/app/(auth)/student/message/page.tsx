import { getServerSession } from "next-auth"
import Chat from "@/components/Chat"
import { authOptions } from "@/lib/auth"

export default async function StudentMessagePage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) return <div className="p-6">Please login to see messages</div>

  return (
    <div className="px-4 pb-8 pt-6 md:px-6">
      <Chat userId={session.user.id} userRole={session.user.role as "student"} />
    </div>
  )
}
