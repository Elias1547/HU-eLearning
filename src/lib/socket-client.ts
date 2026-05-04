"use client"

import { io, type Socket } from "socket.io-client"

let socket: Socket | null = null

export function getSocket() {
  if (!socket) {
    socket = io("http://localhost:3000", {
      path: "/api/socket/io",
      withCredentials: true,
    })

    socket.on("connect", () => {
      console.log("✅ Connected:", socket.id)
    })

    socket.on("connect_error", (err) => {
      console.error("❌ Connection error:", err.message)
    })
  }

  return socket
}