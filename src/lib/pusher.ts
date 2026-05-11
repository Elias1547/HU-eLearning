import Pusher from "pusher"

const appId = process.env.PUSHER_APP_ID
const key = process.env.PUSHER_KEY
const secret = process.env.PUSHER_SECRET
const cluster = process.env.PUSHER_CLUSTER

const isConfigured = Boolean(appId && key && secret && cluster)

export const pusherServer: Pick<Pusher, "trigger"> = isConfigured
  ? new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    })
  : {
      // No-op when PUSHER_* env vars are missing, so core features (like quiz creation)
      // still work without real-time notifications configured.
      trigger: async () => {},
    }