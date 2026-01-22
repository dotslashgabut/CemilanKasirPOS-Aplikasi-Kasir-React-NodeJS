import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { sequelize } from './models/index.js';
import * as models from './models/index.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();

const getSafeError = (error) => {
    if (process.env.NODE_ENV === 'production') {
        return 'An unexpected error occurred. Please contact support.';
    }
    return error.message || String(error);
};

const app = express();

// Security Middleware
app.use(helmet());
app.use(cookieParser());
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow exact matches for standard ports (80/443) where port is hidden
        const allowedOrigins = [
            'http://localhost',
            'https://localhost',
            'http://127.0.0.1',
            'https://127.0.0.1'
        ];

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Allow any localhost origin on common dev ports (e.g. :5173, :3000, :8080)
        if (origin.match(/^http:\/\/localhost:\d+$/) || origin.match(/^http:\/\/127\.0\.0\.1:\d+$/)) {
            return callback(null, true);
        }

        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
    },
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 500 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many requests from this IP, please try again after 15 minutes'
        });
    }
});
app.use(limiter);

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many login attempts from this IP, please try again after 15 minutes'
        });
    }
});

// Sync database
sequelize.sync({ alter: true }).then(() => {
    console.log('Database synced');
}).catch(err => {
    console.error('Failed to sync database:', err);
});

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Forbidden: Invalid token' });
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
        let validPassword = false;
        if (user.password.startsWith('$2')) {
            validPassword = await bcrypt.compare(password, user.password);
        }

        if (!validPassword) {
            return res.status(401).json({ error: 'Username atau password salah' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        const userWithoutPassword = user.toJSON();
        delete userWithoutPassword.password;

        // Set HttpOnly Cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict', // 'lax' might be better if frontend is on different port but same localhost? 'strict' is fine for localhost if same site? No, ports differ.
            // On localhost with different ports, it's considered cross-site for some strictness, but usually strict works if same TLD.
            // However, sameSite 'none' + secure is needed for cross-site (different domains).
            // For localhost dev (diff ports), 'Lax' or 'Strict' usually works.
            // Let's stick to 'Strict' or omit sameSite for now if we want maximum compat?
            // Actually 'Lax' is the modern default.
            // Let's use 'Lax', often safer for navigation.
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Relax for dev if needed
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.json({ user: userWithoutPassword });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: getSafeError(error) });
    }
});

app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});

// Generic CRUD generator
const createCrudRoutes = (modelName) => {
    const router = express.Router();
    const Model = models[modelName];

    router.get('/', authenticateToken, async (req, res) => {
        try {
            // RBAC: Only SUPERADMIN can view user list
            if (modelName === 'User' && req.user.role !== 'SUPERADMIN') {
                return res.status(403).json({ error: 'Access denied' });
            }

            const options = {};
            if (modelName === 'User') {
                options.attributes = { exclude: ['password'] };
            }

            // Filter for Cashier: Only show their own financial data
            if (req.user.role === 'CASHIER') {
                if (modelName === 'Transaction') {
                    options.where = { cashierId: req.user.id };
                } else if (modelName === 'Purchase' || modelName === 'CashFlow') {
                    options.where = { userId: req.user.id };
                }
            }

            const items = await Model.findAll(options);
            res.json(items);
        } catch (error) {
            console.error(`Error fetching ${modelName}:`, error);
            res.status(500).json({ error: getSafeError(error) });
        }
    });

    router.get('/:id', authenticateToken, async (req, res) => {
        try {
            // RBAC: Only SUPERADMIN can view user details (except self)
            if (modelName === 'User' && req.user.role !== 'SUPERADMIN') {
                if (req.params.id !== req.user.id) {
                    return res.status(403).json({ error: 'Access denied' });
                }
            }

            const options = {};
            if (modelName === 'User') {
                options.attributes = { exclude: ['password'] };
            }

            // Filter for Cashier
            if (req.user.role === 'CASHIER') {
                options.where = options.where || {};
                if (modelName === 'Transaction') {
                    options.where.cashierId = req.user.id;
                } else if (modelName === 'Purchase' || modelName === 'CashFlow') {
                    options.where.userId = req.user.id;
                }
            }

            const item = await Model.findByPk(req.params.id, options);

            // If filtering by where clause in findByPk (which might not work directly for some sequelize versions without 'where'), 
            // we might need findOne. findByPk usually takes id and options. 
            // If options has 'where', it might conflict or be ignored depending on version.
            // Safer to use findOne if we have extra conditions.
            let foundItem = item;
            if (req.user.role === 'CASHIER' && (modelName === 'Transaction' || modelName === 'Purchase' || modelName === 'CashFlow')) {
                foundItem = await Model.findOne({
                    where: {
                        id: req.params.id,
                        ...options.where
                    },
                    ...options
                });
            }

            if (foundItem) res.json(foundItem);
            else res.status(404).json({ error: 'Not found' });
        } catch (error) {
            res.status(500).json({ error: getSafeError(error) });
        }
    });

    router.post('/', authenticateToken, async (req, res) => {
        try {
            // RBAC: Only SUPERADMIN can create users
            if (modelName === 'User' && req.user.role !== 'SUPERADMIN') {
                return res.status(403).json({ error: 'Access denied' });
            }

            // RBAC: Cashiers cannot create master data
            if (req.user.role === 'CASHIER') {
                const restrictedModels = ['Product', 'Category', 'Customer', 'Supplier', 'User', 'StoreSettings'];
                if (restrictedModels.includes(modelName)) {
                    return res.status(403).json({ error: 'Access denied. Cashiers can only process transactions.' });
                }
            }

            // Hash password for User model
            if (modelName === 'User' && req.body.password) {
                req.body.password = await bcrypt.hash(req.body.password, 10);
            }
            const item = await Model.create(req.body);

            let responseItem = item.toJSON();
            if (modelName === 'User') {
                delete responseItem.password;
            }

            res.json(responseItem);
        } catch (error) {
            console.error(`Error creating ${modelName}:`, error);
            res.status(500).json({ error: getSafeError(error) });
        }
    });

    router.put('/:id', authenticateToken, async (req, res) => {
        try {
            // RBAC: Only SUPERADMIN can update users
            if (modelName === 'User' && req.user.role !== 'SUPERADMIN') {
                return res.status(403).json({ error: 'Access denied' });
            }

            // RBAC: Cashiers cannot modify master data
            if (req.user.role === 'CASHIER') {
                const restrictedModels = ['Product', 'Category', 'Customer', 'Supplier', 'User', 'StoreSettings'];
                if (restrictedModels.includes(modelName)) {
                    return res.status(403).json({ error: 'Access denied. Cashiers can only process transactions.' });
                }
            }

            // Hash password for User model
            if (modelName === 'User' && req.body.password) {
                req.body.password = await bcrypt.hash(req.body.password, 10);
            }
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

                    let responseItem = newItem.toJSON();
                    if (modelName === 'User') {
                        delete responseItem.password;
                    }
                    res.json(responseItem);
                } else {
                    res.status(404).json({ error: 'Not found' });
                }
            }
        } catch (error) {
            res.status(500).json({ error: getSafeError(error) });
        }
    });

    router.delete('/:id', authenticateToken, async (req, res) => {
        try {
            // RBAC: Only SUPERADMIN can delete users
            if (modelName === 'User' && req.user.role !== 'SUPERADMIN') {
                return res.status(403).json({ error: 'Access denied' });
            }

            // RBAC: Only SUPERADMIN and OWNER can delete financial data
            if (['Transaction', 'Purchase', 'CashFlow'].includes(modelName)) {
                if (!['SUPERADMIN', 'OWNER'].includes(req.user.role)) {
                    return res.status(403).json({ error: 'Access denied. Only Owner/Admin can delete financial data.' });
                }
            }

            // RBAC: Cashiers cannot delete master data
            if (req.user.role === 'CASHIER') {
                const restrictedModels = ['Product', 'Category', 'Customer', 'Supplier', 'User', 'StoreSettings', 'BankAccount'];
                if (restrictedModels.includes(modelName)) {
                    return res.status(403).json({ error: 'Access denied. Cashiers cannot delete data.' });
                }
            }

            const deleted = await Model.destroy({
                where: { id: req.params.id }
            });
            if (deleted) {
                res.status(204).send();
            } else {
                res.status(404).json({ error: 'Not found' });
            }
        } catch (error) {
            res.status(500).json({ error: getSafeError(error) });
        }
    });

    // Batch insert/upsert for migration/sync
    router.post('/batch', authenticateToken, async (req, res) => {
        try {
            // RBAC: Cashiers cannot perform batch operations on restricted resources
            if (req.user.role === 'CASHIER') {
                const restrictedModels = ['Product', 'Category', 'Customer', 'Supplier', 'User', 'StoreSettings'];
                if (restrictedModels.includes(modelName)) {
                    return res.status(403).json({ error: 'Access denied. Cashiers cannot perform batch operations on this resource.' });
                }
            }

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
            res.status(500).json({ error: getSafeError(error) });
        }
    });

    return router;
};

// --- Custom Business Logic Routes ---

// Transaction (Sale/Return) Logic
app.post('/api/transactions', authenticateToken, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const txData = req.body;
        // Ensure ID
        if (!txData.id) txData.id = models.sequelize.fn('uuid'); // or generate on client

        const Transaction = models.Transaction;
        const Product = models.Product;
        const CashFlow = models.CashFlow;
        const BankAccount = models.BankAccount;

        // 1. Create Transaction
        // Auto-fill cashier info if available
        if (req.user) {
            if (!txData.cashierId) txData.cashierId = req.user.id;
            if (!txData.cashierName) txData.cashierName = req.user.username; // Or req.user.name if available
        }

        const transaction = await Transaction.create(txData, { transaction: t });

        // 2. Update Stock
        if (txData.items && Array.isArray(txData.items)) {
            for (const item of txData.items) {
                const product = await Product.findByPk(item.id, { transaction: t });
                if (product) {
                    let newStock = product.stock;
                    if (txData.type === 'RETURN') {
                        newStock += item.qty;
                    } else {
                        newStock -= item.qty;
                    }
                    await product.update({ stock: newStock }, { transaction: t });
                }
            }
        }

        // 3. Create CashFlow (Automated)
        // Only if there is a payment involved AND not skipped
        if (!txData.skipCashFlow && (txData.amountPaid > 0 || (txData.type === 'RETURN' && txData.totalAmount < 0))) {
            const isReturn = txData.type === 'RETURN';

            let cfAmount = 0;
            if (isReturn) {
                // For Returns (Refunds), amountPaid is negative, so we take abs
                cfAmount = Math.abs(txData.amountPaid);
            } else {
                // For Sales, Cash In = Amount Paid - Change
                // If we received 50k and gave 40k change, actual Cash In is 10k
                const paid = parseFloat(txData.amountPaid) || 0;
                const change = parseFloat(txData.change) || 0;

                // Fix: If change is negative (partial payment/debt), do not subtract it.
                // Cash flow should be exactly what was paid.
                if (change < 0) {
                    cfAmount = paid;
                } else {
                    cfAmount = paid - change;
                }
            }

            if (cfAmount > 0) {
                const cfType = isReturn ? 'KELUAR' : 'MASUK'; // Sale = IN, Return = OUT
                const category = isReturn ? 'Retur Penjualan' : 'Penjualan';

                let bankInfo = '';
                if (txData.bankId) {
                    const bank = await BankAccount.findByPk(txData.bankId, { transaction: t });
                    if (bank) {
                        bankInfo = ` (via ${bank.bankName} - ${bank.accountNumber})`;
                    }
                }

                const description = isReturn
                    ? `Refund Retur Transaksi #${txData.id.substring(0, 6)}${bankInfo}`
                    : `Penjualan ke ${txData.customerName || 'Umum'} (Tx: ${txData.id.substring(0, 6)})${bankInfo}`;

                // Determine payment method for CashFlow: TRANSFER if bankId exists, otherwise CASH
                const cfPaymentMethod = txData.bankId ? 'TRANSFER' : 'CASH';

                await CashFlow.create({
                    id: Date.now().toString(), // Simple ID generation
                    date: txData.date,
                    type: cfType,
                    amount: cfAmount,
                    category: category,
                    description: description,
                    paymentMethod: cfPaymentMethod,
                    bankId: txData.bankId,
                    bankName: txData.bankName,
                    referenceId: txData.id,
                    userId: req.user ? req.user.id : null,
                    userName: req.user ? req.user.username : null
                }, { transaction: t });
            }
        }

        await t.commit();
        res.json(transaction);
    } catch (error) {
        await t.rollback();
        console.error('Transaction Error:', error);
        res.status(500).json({ error: getSafeError(error) });
    }
});

// Purchase (Stock In/Return Out) Logic
app.post('/api/purchases', authenticateToken, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const purchaseData = req.body;
        const Purchase = models.Purchase;
        const Product = models.Product;
        const CashFlow = models.CashFlow;
        const BankAccount = models.BankAccount;

        // 1. Create Purchase
        // Auto-fill user info if available
        if (req.user) {
            purchaseData.userId = req.user.id;
            purchaseData.userName = req.user.username; // Or req.user.name
        }

        const purchase = await Purchase.create(purchaseData, { transaction: t });

        // 2. Update Stock
        if (purchaseData.items && Array.isArray(purchaseData.items)) {
            for (const item of purchaseData.items) {
                const product = await Product.findByPk(item.id, { transaction: t });
                if (product) {
                    let newStock = product.stock;
                    if (purchaseData.type === 'RETURN') {
                        newStock -= item.qty; // Return to supplier = Stock Decrease
                    } else {
                        newStock += item.qty; // Purchase from supplier = Stock Increase
                    }
                    await product.update({ stock: newStock }, { transaction: t });
                }
            }
        }

        // 3. Create CashFlow
        if (!purchaseData.skipCashFlow && (purchaseData.amountPaid > 0 || (purchaseData.type === 'RETURN' && purchaseData.totalAmount < 0))) {
            const isReturn = purchaseData.type === 'RETURN';
            const amount = Math.abs(purchaseData.amountPaid);

            if (amount > 0) {
                const cfType = isReturn ? 'MASUK' : 'KELUAR'; // Purchase = OUT, Return = IN (Refund)
                const category = isReturn ? 'Retur Pembelian' : 'Pembelian Stok';

                let bankInfo = '';
                if (purchaseData.bankId) {
                    const bank = await BankAccount.findByPk(purchaseData.bankId, { transaction: t });
                    if (bank) {
                        bankInfo = ` (via ${bank.bankName} - ${bank.accountNumber})`;
                    }
                }

                const description = isReturn
                    ? `Refund Retur Pembelian dari ${purchaseData.supplierName}${bankInfo}`
                    : `Pembelian dari ${purchaseData.supplierName}: ${purchaseData.description}${bankInfo}`;

                // Determine payment method for CashFlow: TRANSFER if bankId exists, otherwise CASH
                const cfPaymentMethod = purchaseData.bankId ? 'TRANSFER' : 'CASH';

                await CashFlow.create({
                    id: Date.now().toString(),
                    date: purchaseData.date,
                    type: cfType,
                    amount: amount,
                    category: category,
                    description: description,
                    paymentMethod: cfPaymentMethod,
                    bankId: purchaseData.bankId,
                    bankName: purchaseData.bankName,
                    referenceId: purchase.id,
                    userId: req.user ? req.user.id : null,
                    userName: req.user ? req.user.username : null
                }, { transaction: t });
            }
        }

        await t.commit();
        res.json(purchase);
    } catch (error) {
        await t.rollback();
        console.error('Purchase Error:', error);
        res.status(500).json({ error: getSafeError(error) });
    }
});

// Custom Delete Transaction (Cascade to CashFlow and Returns)
app.delete('/api/transactions/:id', authenticateToken, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const Transaction = models.Transaction;
        const CashFlow = models.CashFlow;

        // 1. Find the transaction
        const transaction = await Transaction.findByPk(id, { transaction: t });
        if (!transaction) {
            await t.rollback();
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // 2. Find and delete associated CashFlow (e.g. initial payment, debt repayment)
        await CashFlow.destroy({
            where: { referenceId: id },
            transaction: t
        });

        // 3. Find child transactions (Returns)
        const returns = await Transaction.findAll({
            where: { originalTransactionId: id },
            transaction: t
        });

        for (const ret of returns) {
            // Delete CashFlow for return (e.g. refund)
            await CashFlow.destroy({
                where: { referenceId: ret.id },
                transaction: t
            });
            // Delete the return transaction
            await ret.destroy({ transaction: t });
        }

        // 4. Delete the transaction itself
        await transaction.destroy({ transaction: t });

        await t.commit();
        res.status(204).send();
    } catch (error) {
        await t.rollback();
        console.error('Delete Transaction Error:', error);
        res.status(500).json({ error: getSafeError(error) });
    }
});

// Custom Delete Purchase (Cascade to CashFlow and Returns)
app.delete('/api/purchases/:id', authenticateToken, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const Purchase = models.Purchase;
        const CashFlow = models.CashFlow;

        // 1. Find the purchase
        const purchase = await Purchase.findByPk(id, { transaction: t });
        if (!purchase) {
            await t.rollback();
            return res.status(404).json({ error: 'Purchase not found' });
        }

        // 2. Find and delete associated CashFlow
        await CashFlow.destroy({
            where: { referenceId: id },
            transaction: t
        });

        // 3. Find child purchases (Returns)
        const returns = await Purchase.findAll({
            where: { originalPurchaseId: id },
            transaction: t
        });

        for (const ret of returns) {
            // Delete CashFlow for return
            await CashFlow.destroy({
                where: { referenceId: ret.id },
                transaction: t
            });
            // Delete the return purchase
            await ret.destroy({ transaction: t });
        }

        // 4. Delete the purchase itself
        await purchase.destroy({ transaction: t });

        await t.commit();
        res.status(204).send();
    } catch (error) {
        await t.rollback();
        console.error('Delete Purchase Error:', error);
        res.status(500).json({ error: getSafeError(error) });
    }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const User = models.User;
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] }
        });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: getSafeError(error) });
    }
});

// Stock Adjustment Logic
app.post('/api/stock_adjustments', authenticateToken, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const adjustmentData = req.body;
        const StockAdjustment = models.StockAdjustment;
        const Product = models.Product;

        const product = await Product.findByPk(adjustmentData.productId, { transaction: t });
        if (!product) {
            await t.rollback();
            return res.status(404).json({ error: 'Product not found' });
        }

        // Calculate stocks
        const previousStock = product.stock;
        let currentStock = previousStock;
        const qty = parseInt(adjustmentData.qty);

        if (adjustmentData.type === 'INCREASE') {
            currentStock += qty;
        } else if (adjustmentData.type === 'DECREASE') {
            currentStock -= qty;
        }

        // Create adjustment record
        // ID generation should be handled by client or fallback
        if (!adjustmentData.id) adjustmentData.id = Date.now().toString();

        const adjustment = await StockAdjustment.create({
            ...adjustmentData,
            previousStock,
            currentStock,
            productName: product.name, // Snapshot name
            userId: req.user.id,
            userName: req.user.username
        }, { transaction: t });

        // Update Product Stock
        await product.update({ stock: currentStock }, { transaction: t });

        await t.commit();
        res.json(adjustment);
    } catch (error) {
        await t.rollback();
        console.error('Stock Adjustment Error:', error);
        res.status(500).json({ error: getSafeError(error) });
    }
});

app.delete('/api/stock_adjustments/reset', authenticateToken, async (req, res) => {
    try {
        await models.StockAdjustment.destroy({ where: {}, truncate: false }); // truncate: true might fail with foreign keys depending on dialect setup
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: getSafeError(error) });
    }
});

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
    StoreSettings: 'store_settings',
    StockAdjustment: 'stock_adjustments'
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
