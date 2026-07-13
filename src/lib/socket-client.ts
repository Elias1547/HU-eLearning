"use client"

import { io, type Socket } from "socket.io-client"

let socket: Socket | null = null

export function getSocket() {
  if (!socket) {
    const nextSocket = io({
      path: "/api/socket/io",
      withCredentials: true,
    })

    nextSocket.on("connect", () => {
      console.log("Socket connected:", nextSocket.id)
    })

    nextSocket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message)
    })

    socket = nextSocket
  }

  return socket
}
