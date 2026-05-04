import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  systems: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getUserSystems } = await import("./db");
      return await getUserSystems(ctx.user.id);
    }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1).max(255),
          url: z.string().min(1).max(2048),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { getUserSystems, createSystem } = await import("./db");
        const { isValidUrl } = await import("./heartbeat");

        // Validate URL format
        if (!isValidUrl(input.url)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid URL format",
          });
        }

        // Check max 20 systems limit
        const existingSystems = await getUserSystems(ctx.user.id);
        if (existingSystems.length >= 20) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Maximum 20 monitored systems allowed",
          });
        }

        return await createSystem(ctx.user.id, input.title, input.url);
      }),

    delete: protectedProcedure
      .input(z.object({ systemId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { deleteSystem } = await import("./db");
        const success = await deleteSystem(input.systemId, ctx.user.id);
        if (!success) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "System not found",
          });
        }
        return { success: true };
      }),

    getHistory: protectedProcedure
      .input(z.object({ systemId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getSystemById, getPingHistory } = await import("./db");

        // Verify ownership
        const system = await getSystemById(input.systemId, ctx.user.id);
        if (!system) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "System not found",
          });
        }

        return await getPingHistory(input.systemId);
      }),

    manualPing: protectedProcedure
      .input(z.object({ systemId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { getSystemById, updateSystemStatus, recordPing } = await import(
          "./db"
        );
        const { pingWithRetry } = await import("./heartbeat");

        // Verify ownership
        const system = await getSystemById(input.systemId, ctx.user.id);
        if (!system) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "System not found",
          });
        }

        // Perform ping
        const result = await pingWithRetry(system.url, 1, 10000);

        // Update status
        await updateSystemStatus(system.id, result.status, result.responseTime);

        // Record in history
        await recordPing(system.id, result.status, result.responseTime);

        return {
          status: result.status,
          responseTime: result.responseTime,
          error: result.error,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
