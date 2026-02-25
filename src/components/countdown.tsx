import { useEffect, useState } from "react"

export default function Countdown({ dueDate }: { dueDate: string }) {
  const [timeLeft, setTimeLeft] = useState("")

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = new Date(dueDate).getTime() - Date.now()

      if (diff <= 0) {
        setTimeLeft("Deadline Passed")
        clearInterval(interval)
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff / (1000 * 60)) % 60)
      const seconds = Math.floor((diff / 1000) % 60)

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`)
    }, 1000)

    return () => clearInterval(interval)
  }, [dueDate])

  return <p className="text-red-500">{timeLeft}</p>
}