import dotenv from "dotenv";
// Load environment variables - must be before other imports
dotenv.config();

import express, { Application, Request, Response } from "express";
import { createServer } from "http";
import cors from "cors";
import connectDB from "./config/db";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import { ensureDefaultAdmin } from "./utils/ensureDefaultAdmin";

import { initializeSocket } from "./socket/socketService";
import { initializeFirebaseAdmin } from "./services/firebaseAdmin";


const app: Application = express();
const httpServer = createServer(app);

// Enhanced CORS for production and mobile app support
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:5174",
  "capacitor://localhost",
  "http://localhost",
  "ionic://localhost"
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in our allowed list or matches localhost patterns for dev
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes("localhost") || origin.includes("192.168.")) {
      callback(null, true);
    } else {
      // In production development we also allow other origins for now to avoid blocking
      callback(null, true);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"]
}));

// Handle preflight requests explicitly
app.options("*", cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Socket.io
const io = initializeSocket(httpServer);
app.set("io", io);

// Routes
app.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "Apna Sabji Wala API Server is running!",
    version: "1.0.0",
    socketIO: "Listening for WebSocket connections",
  });
});

// Debug middleware - log all incoming requests
app.use((req: Request, _res: Response, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use("/api/v1", routes);

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function startServer() {
  // Connect DB then ensure default admin exists
  await connectDB();
  await ensureDefaultAdmin();


  // Initialize Firebase Admin SDK for push notifications
  initializeFirebaseAdmin();

  httpServer.listen(PORT, () => {
    console.log("\n\x1b[32m✓\x1b[0m \x1b[1mApna Sabji Wala Server Started\x1b[0m");
    console.log(`   \x1b[36mPort:\x1b[0m http://localhost:${PORT}`);
    console.log(
      `   \x1b[36mEnvironment:\x1b[0m ${process.env.NODE_ENV || "development"}`
    );
    console.log(`   \x1b[36mSocket.IO:\x1b[0m ✓ Ready for connections\n`);
  });
}

startServer().catch((err) => {
  console.error("\n\x1b[31m✗ Failed to start server\x1b[0m");
  console.error(err);
  process.exit(1);
});

