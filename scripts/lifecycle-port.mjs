import { createConnection, createServer } from "node:net";

function probePort(host, port) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.once("error", reject);
    server.listen({ host, port, exclusive: true }, () => {
      const address = server.address();
      const selectedPort =
        typeof address === "object" && address !== null ? address.port : null;
      server.close((error) => {
        if (error) reject(error);
        else if (selectedPort === null) reject(new Error("No loopback port was allocated."));
        else resolve(selectedPort);
      });
    });
  });
}

function isUnavailablePortError(error) {
  if (!(error instanceof Error) || !Reflect.has(error, "code")) return false;
  const code = Reflect.get(error, "code");
  return code === "EADDRINUSE" || code === "EACCES";
}

function hasActiveListener(host, port) {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host, port });
    let settled = false;
    const finish = (value, error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) reject(error);
      else resolve(value);
    };
    socket.setTimeout(500, () => finish(true));
    socket.once("connect", () => finish(true));
    socket.once("error", (error) => {
      if (
        error instanceof Error &&
        Reflect.has(error, "code") &&
        ["ECONNREFUSED", "EHOSTUNREACH", "ENETUNREACH"].includes(
          String(Reflect.get(error, "code")),
        )
      ) {
        finish(false);
      } else {
        finish(false, error);
      }
    });
  });
}

async function isFreeAcrossLoopback(port) {
  if (
    (await hasActiveListener("::1", port)) ||
    (await hasActiveListener("127.0.0.1", port))
  ) {
    return false;
  }
  try {
    await probePort("::1", port);
    await probePort("127.0.0.1", port);
    return true;
  } catch (error) {
    if (isUnavailablePortError(error)) return false;
    throw error;
  }
}

export async function allocateLifecyclePort(preferredPort) {
  if (
    !Number.isSafeInteger(preferredPort) ||
    preferredPort < 1024 ||
    preferredPort > 65_535
  ) {
    throw new Error("Lifecycle preferred port must be an unprivileged TCP port.");
  }
  if (await isFreeAcrossLoopback(preferredPort)) return preferredPort;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = await probePort("127.0.0.1", 0);
    if (await isFreeAcrossLoopback(candidate)) return candidate;
  }
  throw new Error("Lifecycle verifier could not allocate a free loopback port.");
}
