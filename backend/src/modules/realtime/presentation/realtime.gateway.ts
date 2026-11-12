import { Logger } from "@nestjs/common";
import { OnGatewayConnection, WebSocketGateway } from "@nestjs/websockets";
import type { Socket } from "socket.io";
import { AuthenticateAdminUseCase, ADMIN_TOKEN_COOKIE } from "../../identity";
import { ADMIN_ROOM } from "../../../shared/infrastructure/realtime/realtime-emitter.service";

function tokenFrom(socket: Socket): string | undefined {
  const auth = socket.handshake.auth as { token?: string } | undefined;
  if (auth?.token) return auth.token;
  const cookie = socket.handshake.headers.cookie ?? "";
  const match = cookie.split(/;\s*/).find((c) => c.startsWith(`${ADMIN_TOKEN_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(ADMIN_TOKEN_COOKIE.length + 1)) : undefined;
}

/**
 * Replaces Supabase Realtime. Admin browsers connect to /socket.io with their
 * access token and join the `admins` room; the worker emits through Redis.
 * Events: orders:changed, catalog:changed, inbox:message, inbox:status, inbox:comment.
 */
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class RealtimeGateway implements OnGatewayConnection {
  private readonly log = new Logger(RealtimeGateway.name);

  constructor(private readonly authenticate: AuthenticateAdminUseCase) {}

  async handleConnection(socket: Socket) {
    const token = tokenFrom(socket);
    const admin = token ? await this.authenticate.execute(token) : null;
    if (!admin) {
      socket.emit("error", { message: "unauthorized" });
      socket.disconnect(true);
      return;
    }
    await socket.join(ADMIN_ROOM);
    socket.emit("ready", { adminId: admin.id });
  }
}
