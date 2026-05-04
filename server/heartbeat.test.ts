import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ping, pingWithRetry, isValidUrl } from "./heartbeat";

describe("Heartbeat Engine", () => {
  describe("isValidUrl", () => {
    it("should accept URLs with https protocol", () => {
      expect(isValidUrl("https://www.google.com")).toBe(true);
    });

    it("should accept URLs with http protocol", () => {
      expect(isValidUrl("http://www.google.com")).toBe(true);
    });

    it("should accept URLs without protocol (auto-adds https)", () => {
      expect(isValidUrl("www.google.com")).toBe(true);
    });

    it("should accept URLs with paths", () => {
      expect(isValidUrl("https://api.example.com/status")).toBe(true);
    });

    it("should reject invalid URLs", () => {
      expect(isValidUrl("not a url")).toBe(false);
      expect(isValidUrl("")).toBe(false);
      expect(isValidUrl("   ")).toBe(false);
    });

    it("should accept URLs with ports", () => {
      expect(isValidUrl("https://localhost:3000")).toBe(true);
    });

    it("should accept URLs with query parameters", () => {
      expect(isValidUrl("https://example.com/api?key=value")).toBe(true);
    });
  });

  describe("ping", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should return online status for successful HEAD request", async () => {
      vi.stubGlobal("fetch", vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
        })
      ));

      const result = await ping("https://www.google.com", 5000);

      expect(result.status).toBe("online");
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it("should return online status for 3xx redirects", async () => {
      vi.stubGlobal("fetch", vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 301,
        })
      ));

      const result = await ping("https://www.example.com", 5000);

      expect(result.status).toBe("online");
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });

    it("should return online status for 4xx and 5xx (server responding)", async () => {
      vi.stubGlobal("fetch", vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
        })
      ));

      const result = await ping("https://www.example.com/notfound", 5000);

      expect(result.status).toBe("online");
    });

    it("should return down status on fetch error", async () => {
      vi.stubGlobal("fetch", vi.fn(() =>
        Promise.reject(new Error("Network error"))
      ));

      const result = await ping("https://invalid-domain-xyz.com", 5000);

      expect(result.status).toBe("down");
      expect(result.error).toBeDefined();
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });

    it("should measure response time", async () => {
      vi.stubGlobal("fetch", vi.fn(() =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
            });
          }, 100);
        })
      ));

      const result = await ping("https://www.google.com", 5000);

      expect(result.responseTime).toBeGreaterThanOrEqual(100);
    });

    it("should normalize URLs without protocol", async () => {
      vi.stubGlobal("fetch", vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
        })
      ));

      await ping("www.google.com", 5000);

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      expect(fetchCall[0]).toContain("https://");
    });

    it("should use HEAD method first", async () => {
      vi.stubGlobal("fetch", vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
        })
      ));

      await ping("https://www.google.com", 5000);

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      expect(fetchCall[1]?.method).toBe("HEAD");
    });

    it("should fallback to GET on HEAD failure", async () => {
      let callCount = 0;
      vi.stubGlobal("fetch", vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error("HEAD not supported"));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
        });
      }));

      const result = await ping("https://www.example.com", 5000);

      expect(result.status).toBe("online");
      expect(vi.mocked(fetch).mock.calls).toHaveLength(2);
      expect(vi.mocked(fetch).mock.calls[1][1]?.method).toBe("GET");
    });
  });

  describe("pingWithRetry", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should return immediately on success", async () => {
      vi.stubGlobal("fetch", vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
        })
      ));

      const result = await pingWithRetry("https://www.google.com", 3, 5000);

      expect(result.status).toBe("online");
      expect(vi.mocked(fetch).mock.calls).toHaveLength(1); // Only 1 call, no retries
    });

    it("should retry on failure", async () => {
      let callCount = 0;
      vi.stubGlobal("fetch", vi.fn(() => {
        callCount++;
        if (callCount < 2) {
          return Promise.reject(new Error("Network error"));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
        });
      }));

      const result = await pingWithRetry("https://www.example.com", 2, 5000);

      expect(result.status).toBe("online");
      expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(1);
    });

    it("should return down after all retries fail", async () => {
      vi.stubGlobal("fetch", vi.fn(() =>
        Promise.reject(new Error("Network error"))
      ));

      const result = await pingWithRetry("https://invalid-domain.com", 2, 5000);

      expect(result.status).toBe("down");
      expect(result.error).toBeDefined();
    });

    it("should respect retry count", async () => {
      vi.stubGlobal("fetch", vi.fn(() =>
        Promise.reject(new Error("Network error"))
      ));

      await pingWithRetry("https://example.com", 3, 5000);

      // Each ping attempt tries HEAD + GET fallback = 2 calls per attempt
      // 1 initial + 3 retries = 4 attempts = 8 total calls
      expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThanOrEqual(4);
    });
  });
});
