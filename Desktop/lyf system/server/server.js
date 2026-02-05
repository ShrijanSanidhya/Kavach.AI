const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { clerkMiddleware, requireAuth } = require('@clerk/express');

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Clerk Middleware - sets auth on request
app.use(clerkMiddleware());

// Routes
// Protected route example
app.get('/api/auth/profile', requireAuth(), (req, res) => {
    res.json({
        message: 'Authenticated successfully',
        auth: req.auth,
    });
});


app.get('/', (req, res) => {
    res.send('API is running...');
});

// Database Connection
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch((err) => console.log(err));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
