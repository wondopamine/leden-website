import { createServer } from "node:net";

import { afterEach, describe, expect, it } from "vitest";

import { allocateLifecyclePort } from "../../scripts/lifecycle-port.mjs";

let occupiedServer;

afterEach(async () => {
  if (!occupiedServer) return;
  await new Promise((resolve, reject) => {
    occupiedServer.close((error) => (error ? reject(error) : resolve()));
  });
  occupiedServer = undefined;
});

describe("allocateLifecyclePort", () => {
  it("keeps a free preferred loopback port", async () => {
    const temporary = createServer();
    await new Promise((resolve, reject) => {
      temporary.once("error", reject);
      temporary.listen({ host: "127.0.0.1", port: 0 }, resolve);
    });
    const address = temporary.address();
    if (typeof address !== "object" || address === null) {
      throw new Error("Test could not allocate a loopback port.");
    }
    const preferredPort = address.port;
    await new Promise((resolve, reject) => {
      temporary.close((error) => (error ? reject(error) : resolve()));
    });

    await expect(allocateLifecyclePort(preferredPort)).resolves.toBe(
      preferredPort,
    );
  });

  it("allocates a different loopback port when the preferred port is occupied", async () => {
    const server = createServer();
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen({ host: "127.0.0.1", port: 0 }, resolve);
    });
    occupiedServer = server;
    const address = server.address();
    if (typeof address !== "object" || address === null) {
      throw new Error("Test could not occupy a loopback port.");
    }

    const allocated = await allocateLifecyclePort(address.port);
    expect(allocated).not.toBe(address.port);
    expect(allocated).toBeGreaterThan(0);
  });

  it("avoids a preferred port occupied only on IPv6 loopback", async () => {
    const server = createServer();
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen({ host: "::1", port: 0 }, resolve);
    });
    occupiedServer = server;
    const address = server.address();
    if (typeof address !== "object" || address === null) {
      throw new Error("Test could not occupy an IPv6 loopback port.");
    }

    const allocated = await allocateLifecyclePort(address.port);
    expect(allocated).not.toBe(address.port);
    expect(allocated).toBeGreaterThan(0);
  });

  it("rejects invalid preferred ports", async () => {
    await expect(allocateLifecyclePort(0)).rejects.toThrow(/unprivileged/);
  });
});
