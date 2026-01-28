import cookieParser from 'cookie-parser';
import express from 'express';
import cors from 'cors';
import connectDB from './configs/db.js';
import 'dotenv/config';
import userRouter from './routes/userRoute.js';
import sellerRouter from './routes/sellerRoute.js';
import connectCloudinary from './configs/cloudinary.js';
import productRouter from './routes/productRoute.js';
import cartRouter from './routes/cartRoute.js';
import addressRouter from './routes/addressRoute.js';
import orderRouter from './routes/orderRoute.js';
import { stripeWebhooks } from './controllers/orderController.js';

const app = express();
const port = process.env.PORT || 4000;

await connectDB();
await connectCloudinary();

// Middleware configuration
app.use(express.json());
app.use(cookieParser());

// ✅CORS (must be before routes)
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://quickmart-client.vercel.app",
  process.env.FRONTEND_URL,
]);


app.post('/stripe', express.raw({ type: 'application/json' }), stripeWebhooks);

const isDev = process.env.NODE_ENV !== "production";
const isLocalhostDevOrigin = (origin) =>
  typeof origin === "string" && /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
const isVercelOrigin = (origin) => typeof origin === "string" && origin.endsWith('.vercel.app');

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.has(origin)) return cb(null, true);
    if (isDev && isLocalhostDevOrigin(origin)) return cb(null, true);
    if (isVercelOrigin(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
//  Express v5-compatible wildcard for preflight
app.options(/.*/, cors(corsOptions));

app.get('/', (req, res) => res.send('Hello from QuickMart server!'));
app.use('/api/user', userRouter);
app.use('/api/seller', sellerRouter);
app.use('/api/product', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/address', addressRouter);
app.use('/api/order', orderRouter);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

