/* eslint-disable @typescript-eslint/no-require-imports */

const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");
const { getToken } = require("next-auth/jwt");

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);

// ✅ Always safe
const hostname = "0.0.0.0";

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // ✅ Create HTTP server
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  // ✅ Attach Socket.IO
  const io = new Server(httpServer, {
    path: "/api/socket/io",
    cors: {
      origin: "*", // adjust in production
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // ✅ Prevent multiple instances (important in dev)
  global.io = io;

  // ✅ Auth middleware
  io.use(async (socket, nextMiddleware) => {
    try {
      const token = await getToken({
        req: socket.request,
        secret: process.env.NEXTAUTH_SECRET,
      });

      if (!token) {
        return nextMiddleware(new Error("Unauthorized"));
      }

      socket.data.user = {
        id: String(token.id),
        role: String(token.role),
      };

      nextMiddleware();
    } catch (err) {
      nextMiddleware(new Error("Auth error"));
    }
  });

  // ✅ Connection handler
  io.on("connection", (socket) => {
    console.log("✅ Client connected:", socket.id);

    const userId = socket.data.user?.id;

    if (userId) {
      socket.join(`user:${userId}`);
    }

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });

  // ✅ Start server
  httpServer.listen(port, hostname, () => {
    console.log(`🚀 Server ready at http://localhost:${port}`);
  });
});