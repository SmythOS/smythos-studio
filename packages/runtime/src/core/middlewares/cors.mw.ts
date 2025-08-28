import cors from "cors";

// Minimal CORS - allow everything in development, configurable for production
const corsOptions: cors.CorsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? process.env.CORS_ORIGINS?.split(",") || false
      : true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

export default cors(corsOptions);
