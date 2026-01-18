import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import {
  securityMiddlewareConfig,
  errorHandler,
  notFoundHandler,
  requestLogger,
  logger
} from "./middleware";
import { startSlaMonitor, stopSlaMonitor } from "./jobs/sla-monitor-job";

const app = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Serve uploaded files statically
const uploadsDir = process.env.UPLOAD_DIR || './uploads';
app.use('/uploads', express.static(path.resolve(uploadsDir)));

// Apply basic security middleware first
app.use(...securityMiddlewareConfig.basic);

// Body parsing middleware (after security headers)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    console.log('[Startup] Registering routes...');
    const server = await registerRoutes(app);
    console.log('[Startup] Routes registered successfully');

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      console.log('[Startup] Setting up Vite...');
      await setupVite(app, server);
      console.log('[Startup] Vite setup complete');
    } else {
      serveStatic(app);
    }

    // 404 handler for undefined routes (after Vite setup)
    app.use(notFoundHandler);

    // Global error handler (must be last)
    app.use(errorHandler);

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Default to 5001 if not specified.
    // this serves both the API and the client.
    const port = parseInt(process.env.PORT || '5001', 10);

    // Graceful shutdown handling
    const gracefulShutdown = (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);

      // Stop background jobs first
      stopSlaMonitor();
      logger.info('Background jobs stopped');

      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });

      // Force exit after 10 seconds if graceful shutdown fails
      setTimeout(() => {
        logger.error('Graceful shutdown timed out, forcing exit');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      logger.info(`Server started successfully on port ${port}`);
      log(`serving on port ${port}`);

      // Start background jobs
      startSlaMonitor();
      logger.info('SLA monitor job started');
    });
  } catch (error) {
    console.error('[Startup] Fatal error during server initialization:', error);
    process.exit(1);
  }
})();
