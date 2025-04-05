// import dotenv from "dotenv";
// dotenv.config(); // Load env vars early

// import express from "express";
// import cookieParser from "cookie-parser";
// import cors from "cors";
// import path from "path";
// import chalk from "chalk"; // For styled console logs

// import { connectDB } from "./lib/db.js";
// import authRoutes from "./routes/auth.route.js";
// import messageRoutes from "./routes/message.route.js";
// import { app, server } from "./lib/socket.js";

// const PORT = process.env.PORT || 5001;
// const __dirname = path.resolve();

// // Middleware
// app.use(express.json());
// app.use(cookieParser());
// app.use(
//   cors({
//     origin: "http://localhost:5173",
//     credentials: true,
//   })
// );

// // API Routes
// app.use("/api/auth", authRoutes);
// app.use("/api/messages", messageRoutes);

// // Serve static files in production
// if (process.env.NODE_ENV === "production") {
//   app.use(express.static(path.join(__dirname, "../frontend/dist")));

//   app.get("*", (req, res) => {
//     res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
//   });
// }

// // Start server *after* DB connects
// const startServer = async () => {
//   try {
//     await connectDB();

//     server.listen(PORT, () => {
//       console.log(chalk.green(`✅ Server running on port ${PORT}`));
//     });
//   } catch (error) {
//     console.error(chalk.red("❌ Failed to start server:"), error);
//     process.exit(1);
//   }
// };

// startServer();



// import express from 'express';
// import authRoutes from './routes/auth.route.js';
// import messageRoutes from './routes/message.route.js';
// import dotenv from 'dotenv'; // Import dotenv to load environment variables
// import { connectDB } from './lib/db.js';
// import { connect } from 'mongoose';
// import cookieParser from "cookie-parser";
// import cors from "cors";

// dotenv.config(); // Load environment variables from .env file
// const app = express(); 
  
// app.use(express.json()); // Middleware to parse JSON request bodies
// app.use(cookieParser());
// app.use(cors({
//   origin:"http://localhost:5173", // Allow requests from this origin
//   credentials:true
// })); // Middleware to parse cookies



// const PORT = process.env.PORT || 3000 ; // Set the port to 3000 or the value from the environment variable



// app.use("/api/auth",authRoutes) 
// app.use("/api/message",messageRoutes)







// app.listen(PORT, () => {
//   console.log('Server is running on PORT:', +PORT);
//   connectDB();
// });

import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import path from "path";

import { connectDB } from "./lib/db.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./lib/socket.js";

dotenv.config();

const PORT = process.env.PORT;
const __dirname = path.resolve();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

server.listen(PORT, () => {
  console.log("server is running on PORT:" + PORT);
  connectDB();
});