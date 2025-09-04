import express from 'express';
import cors from 'cors';
// FIX: body-parser is removed as it's redundant.
import routes from './routes/Routes.js';
import path from 'path';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression'; // Keep the import
import connectDB from './lib/db.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- Middleware (Correct Order & Simplified) ---

// 1. Compression (FIX: Using the simple, default configuration)
app.use(compression());
// 3. CORS Configuration
const corsOptions = {
  origin: [
    'http://localhost:8080',
    'http://localhost:8081',
    'https://uae-ecommerce-gamma.vercel.app',
    'http://localhost:5173',
    'https://uae-admin-zeta.vercel.app'
  ],
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  credentials: true,
};
app.use(cors(corsOptions));
// 2. Security Headers with Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));



// 4. Body Parsers (using built-in Express)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// 5. Static File Serving
// FIX: Removed the duplicated route and manual headers.
// helmet and cors handle security and cross-origin policies globally.
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '365d',
}));


// --- Database & API Routes ---

connectDB();
app.use('/api', routes);

// Add the test route here for verification
app.get('/test-compression', (req, res) => {
  const largeData = 'This is a large string to test compression. '.repeat(500);
  res.send(largeData);
});

app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});