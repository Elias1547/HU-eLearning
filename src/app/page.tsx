import Home from "@/components/HomePage"
import { authOptions } from "@/lib/auth"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

const page = async () => {
  const session = await getServerSession(authOptions)

  if (session?.user?.role) {
    redirect(`/${session.user.role}/dashboard`)
  }

  return <Home />
}

export default page
