import type { Server as SocketIOServer } from "socket.io"

declare global {
  var __io: SocketIOServer | undefined
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  global.__io?.to(`user:${userId}`).emit(event, payload)
}
