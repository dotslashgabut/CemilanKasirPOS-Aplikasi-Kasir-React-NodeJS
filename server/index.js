import express from 'express';
import cors from 'cors';
import { sequelize } from './models/index.js';
import * as models from './models/index.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors()); // Configure this for production!
app.use(express.json({ limit: '50mb' }));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login requests per windowMs
    message: 'Too many login attempts from this IP, please try again after 15 minutes'
});

// Sync database
sequelize.sync({ alter: true }).then(() => {
    console.log('Database synced');
}).catch(err => {
    console.error('Failed to sync database:', err);
});

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Login Route
app.post('/api/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    try {
        const User = models.User;
        const user = await User.findOne({ where: { username } });

        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Check password
        // For migration support, we might have plain text passwords initially
        // Ideally we should hash them if they are not hashed, but for now let's assume bcrypt or plain text check
        let validPassword = false;
        if (user.password.startsWith('$2')) {
            validPassword = await bcrypt.compare(password, user.password);
        } else {
            // Legacy plain text fallback (should be removed in production)
            validPassword = user.password === password;
            // Optional: Upgrade to hash
            if (validPassword) {
                const hashedPassword = await bcrypt.hash(password, 10);
                await user.update({ password: hashedPassword });
            }
        }

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, user });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Generic CRUD generator
const createCrudRoutes = (modelName) => {
    const router = express.Router();
    const Model = models[modelName];

    router.get('/', authenticateToken, async (req, res) => {
        try {
            const items = await Model.findAll();
            res.json(items);
        } catch (error) {
            console.error(`Error fetching ${modelName}:`, error);
            res.status(500).json({ error: error.message });
        }
    });

    router.get('/:id', authenticateToken, async (req, res) => {
        try {
            const item = await Model.findByPk(req.params.id);
            if (item) res.json(item);
            else res.status(404).json({ error: 'Not found' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.post('/', authenticateToken, async (req, res) => {
        try {
            const item = await Model.create(req.body);
            res.json(item);
        } catch (error) {
            console.error(`Error creating ${modelName}:`, error);
            res.status(500).json({ error: error.message });
        }
    });

    router.put('/:id', authenticateToken, async (req, res) => {
        try {
            const [updated] = await Model.update(req.body, {
                where: { id: req.params.id }
            });
            if (updated) {
                const updatedItem = await Model.findByPk(req.params.id);
                res.json(updatedItem);
            } else {
                // Try to create if not exists (upsert-ish behavior for some sync scenarios)
                // Check if ID exists in body, if so, maybe create?
                // But standard PUT is update. If 0 updated, it might mean ID not found.
                // Let's check if it exists first? No, update returns 0 if not found.

                // If we want to support "save" (upsert) behavior like the frontend expects sometimes:
                const existing = await Model.findByPk(req.params.id);
                if (!existing) {
                    // Create it
                    const newItem = await Model.create({ ...req.body, id: req.params.id });
                    res.json(newItem);
                } else {
                    res.status(404).json({ error: 'Not found' });
                }
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    router.delete('/:id', authenticateToken, async (req, res) => {
        try {
            const deleted = await Model.destroy({
                where: { id: req.params.id }
            });
            if (deleted) {
                res.status(204).send();
            } else {
                res.status(404).json({ error: 'Not found' });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Batch insert/upsert for migration/sync
    router.post('/batch', authenticateToken, async (req, res) => {
        try {
            const items = req.body;
            if (!Array.isArray(items)) {
                return res.status(400).json({ error: 'Body must be an array' });
            }
            // Use bulkCreate with updateOnDuplicate
            const result = await Model.bulkCreate(items, {
                updateOnDuplicate: Object.keys(Model.rawAttributes)
            });
            res.json(result);
        } catch (error) {
            console.error(`Error batch inserting ${modelName}:`, error);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
};

const routeMap = {
    Product: 'products',
    Category: 'categories',
    Customer: 'customers',
    Supplier: 'suppliers',
    Transaction: 'transactions',
    Purchase: 'purchases',
    CashFlow: 'cashflow',
    User: 'users',
    BankAccount: 'banks',
    StoreSettings: 'store_settings'
};

Object.keys(models).forEach(modelName => {
    if (modelName !== 'sequelize') {
        const route = routeMap[modelName] || `${modelName.toLowerCase()}s`;
        app.use(`/api/${route}`, createCrudRoutes(modelName));
    }
});

// Special route for store settings to handle singleton-like behavior
// The frontend uses /store_settings/settings for GET and PUT
// But our generic generator uses /store_settings/:id
// We need to handle /store_settings/settings specifically if needed, or ensure frontend passes ID 'settings'

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
