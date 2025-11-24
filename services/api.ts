import { Product, Transaction, User, CashFlow, Category, Customer, Supplier, Purchase, StoreSettings, BankAccount, PaymentStatus } from "../types";
import { generateUUID, toMySQLDate } from "../utils";

const isProd = import.meta.env.PROD;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Get headers with authentication
const getHeaders = () => {
    const currentUser = localStorage.getItem('pos_current_user');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };

    const token = localStorage.getItem('pos_token');

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
};

// Helper to ensure numbers are numbers
const parseNumber = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseFloat(val) || 0;
    return 0;
};

const parseProduct = (p: any): Product => ({
    ...p,
    stock: parseNumber(p.stock),
    hpp: parseNumber(p.hpp),
    priceRetail: parseNumber(p.priceRetail),
    priceGeneral: parseNumber(p.priceGeneral),
    priceWholesale: parseNumber(p.priceWholesale),
    pricePromo: p.pricePromo ? parseNumber(p.pricePromo) : undefined
});

const parseTransaction = (t: any): Transaction => ({
    ...t,
    totalAmount: parseNumber(t.totalAmount),
    amountPaid: parseNumber(t.amountPaid),
    change: parseNumber(t.change),
    items: Array.isArray(t.items) ? t.items.map((i: any) => ({
        ...i,
        qty: parseNumber(i.qty),
        finalPrice: parseNumber(i.finalPrice),
        hpp: parseNumber(i.hpp)
    })) : [],
    paymentHistory: Array.isArray(t.paymentHistory) ? t.paymentHistory.map((h: any) => ({
        ...h,
        amount: parseNumber(h.amount)
    })) : []
});

const parsePurchase = (p: any): Purchase => ({
    ...p,
    totalAmount: parseNumber(p.totalAmount),
    amountPaid: parseNumber(p.amountPaid),
    items: Array.isArray(p.items) ? p.items.map((i: any) => ({
        ...i,
        qty: parseNumber(i.qty),
        finalPrice: parseNumber(i.finalPrice)
    })) : [],
    paymentHistory: Array.isArray(p.paymentHistory) ? p.paymentHistory.map((h: any) => ({
        ...h,
        amount: parseNumber(h.amount)
    })) : []
});

const parseCashFlow = (c: any): CashFlow => ({
    ...c,
    amount: parseNumber(c.amount)
});

export const ApiService = {
    // Store Settings
    getStoreSettings: async (): Promise<StoreSettings> => {
        const defaultSettings: StoreSettings = {
            name: 'Cemilan KasirPOS Nusantara', jargon: '', address: '', phone: '', bankAccount: '', footerMessage: '', notes: '',
            showAddress: true, showJargon: true, showBank: true, printerType: '58mm',
            autoSyncMySQL: false, useMySQLPrimary: false
        };

        try {
            const res = await fetch(`${API_URL}/store_settings/settings?_t=${new Date().getTime()}`, { headers: getHeaders() });
            if (!res.ok) return defaultSettings;
            const settings = await res.json();
            return { ...defaultSettings, ...settings };
        } catch (error) {
            console.error("Failed to fetch settings:", error);
            return defaultSettings;
        }
    },
    saveStoreSettings: async (settings: StoreSettings) => {
        const payload = { ...settings, id: 'settings' };

        // Try to update first
        const res = await fetch(`${API_URL}/store_settings/settings`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });

        // If not found (404), create new record
        if (res.status === 404) {
            const createRes = await fetch(`${API_URL}/store_settings`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });
            if (!createRes.ok) {
                const err = await createRes.json();
                throw new Error(err.error || 'Failed to create store settings');
            }
        } else if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update store settings');
        }
    },

    // Banks
    getBanks: async (): Promise<BankAccount[]> => {
        const res = await fetch(`${API_URL}/banks`, { headers: getHeaders() });
        return await res.json();
    },
    saveBank: async (bank: BankAccount) => {
        if (!bank.id) bank.id = generateUUID();
        const res = await fetch(`${API_URL}/banks`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(bank)
        });
        if (!res.ok) throw new Error('Failed to save bank');
    },
    updateBank: async (bank: BankAccount) => {
        await fetch(`${API_URL}/banks/${bank.id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(bank)
        });
    },
    deleteBank: async (id: string) => {
        const res = await fetch(`${API_URL}/banks/${id}`, { method: 'DELETE', headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to delete bank');
    },

    // Categories
    getCategories: async (): Promise<Category[]> => {
        const res = await fetch(`${API_URL}/categories`, { headers: getHeaders() });
        return await res.json();
    },
    saveCategory: async (category: Category) => {
        if (!category.id) category.id = generateUUID();
        const res = await fetch(`${API_URL}/categories`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(category)
        });
        if (!res.ok) throw new Error('Failed to save category');
    },
    updateCategory: async (category: Category) => {
        await fetch(`${API_URL}/categories/${category.id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(category)
        });
    },
    deleteCategory: async (id: string) => {
        const res = await fetch(`${API_URL}/categories/${id}`, { method: 'DELETE', headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to delete category');
    },

    // Products
    getProducts: async (): Promise<Product[]> => {
        const res = await fetch(`${API_URL}/products`, { headers: getHeaders() });
        const data = await res.json();
        return data.map(parseProduct);
    },
    saveProduct: async (product: Product) => {
        if (!product.id) product.id = generateUUID();
        const res = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(product)
        });
        if (!res.ok) throw new Error('Failed to save product');
    },
    updateProduct: async (product: Product) => {
        await fetch(`${API_URL}/products/${product.id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(product)
        });
    },
    deleteProduct: async (id: string) => {
        const res = await fetch(`${API_URL}/products/${id}`, { method: 'DELETE', headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to delete product');
    },
    saveProductsBulk: async (newProducts: Product[]) => {
        const productsWithIds = newProducts.map(p => ({ ...p, id: p.id || generateUUID() }));
        await fetch(`${API_URL}/products/batch`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(productsWithIds)
        });
    },

    // Customers
    getCustomers: async (): Promise<Customer[]> => {
        const res = await fetch(`${API_URL}/customers`, { headers: getHeaders() });
        return await res.json();
    },
    saveCustomer: async (cust: Customer) => {
        if (!cust.id) cust.id = generateUUID();
        const res = await fetch(`${API_URL}/customers`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(cust)
        });
        if (!res.ok) throw new Error('Failed to save customer');
    },
    updateCustomer: async (cust: Customer) => {
        await fetch(`${API_URL}/customers/${cust.id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(cust)
        });
    },
    deleteCustomer: async (id: string) => {
        const res = await fetch(`${API_URL}/customers/${id}`, { method: 'DELETE', headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to delete customer');
    },

    // Suppliers
    getSuppliers: async (): Promise<Supplier[]> => {
        const res = await fetch(`${API_URL}/suppliers`, { headers: getHeaders() });
        return await res.json();
    },
    saveSupplier: async (sup: Supplier) => {
        if (!sup.id) sup.id = generateUUID();
        const res = await fetch(`${API_URL}/suppliers`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(sup)
        });
        if (!res.ok) throw new Error('Failed to save supplier');
    },
    updateSupplier: async (sup: Supplier) => {
        await fetch(`${API_URL}/suppliers/${sup.id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(sup)
        });
    },
    deleteSupplier: async (id: string) => {
        const res = await fetch(`${API_URL}/suppliers/${id}`, { method: 'DELETE', headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to delete supplier');
    },

    // Transactions (Sales)
    getTransactions: async (): Promise<Transaction[]> => {
        const res = await fetch(`${API_URL}/transactions`, { headers: getHeaders() });
        if (!res.ok) return [];
        const data = await res.json();
        return data.map(parseTransaction);
    },
    addTransaction: async (transaction: Transaction) => {
        // Convert ISO date to MySQL format
        const formattedDate = toMySQLDate(new Date(transaction.date));

        if (!transaction.paymentHistory && transaction.amountPaid > 0) {
            transaction.paymentHistory = [{
                date: transaction.date,
                amount: transaction.amountPaid,
                method: transaction.paymentMethod,
                bankId: transaction.bankId,
                bankName: transaction.bankName,
                note: transaction.paymentNote || 'Pembayaran Awal'
            }];
        }

        // Also convert dates in payment history
        if (transaction.paymentHistory && transaction.paymentHistory.length > 0) {
            transaction.paymentHistory = transaction.paymentHistory.map(ph => ({
                ...ph,
                date: toMySQLDate(new Date(ph.date))
            }));
        }

        const res = await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ ...transaction, date: formattedDate })
        });
        if (!res.ok) throw new Error('Failed to add transaction');
    },
    updateTransaction: async (transaction: Transaction) => {
        // Convert ISO date to MySQL format
        const formattedDate = toMySQLDate(new Date(transaction.date));

        // Also convert dates in payment history
        if (transaction.paymentHistory && transaction.paymentHistory.length > 0) {
            transaction.paymentHistory = transaction.paymentHistory.map(ph => ({
                ...ph,
                date: toMySQLDate(new Date(ph.date))
            }));
        }

        const res = await fetch(`${API_URL}/transactions/${transaction.id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ ...transaction, date: formattedDate })
        });
        if (!res.ok) throw new Error('Failed to update transaction');
    },
    deleteTransaction: async (id: string) => {
        // 1. Get all transactions to find related returns and original transaction
        const res = await fetch(`${API_URL}/transactions`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch transactions for deletion');
        const transactions = await res.json();
        const transaction = transactions.find((t: any) => t.id === id);

        if (!transaction) {
            throw new Error('Transaction not found');
        }

        const parsedTx = parseTransaction(transaction);

        // --- LOGIC A: RESTORE DEBT (If deleting a RETURN transaction) ---
        if (parsedTx.type === 'RETURN' && parsedTx.originalTransactionId) {
            try {
                const originalTxRaw = transactions.find((t: any) => t.id === parsedTx.originalTransactionId);

                if (originalTxRaw) {
                    const originalTx = parseTransaction(originalTxRaw);

                    // Find "Potong Utang" entry in payment history
                    if (originalTx.paymentHistory && originalTx.paymentHistory.length > 0) {
                        // Match by approximate time (within 5s) or exact date string
                        const historyIndex = originalTx.paymentHistory.findIndex(ph =>
                            ph.note?.includes('Potong Utang') &&
                            (ph.date === parsedTx.date || Math.abs(new Date(ph.date).getTime() - new Date(parsedTx.date).getTime()) < 5000)
                        );

                        if (historyIndex !== -1) {
                            const entryToRemove = originalTx.paymentHistory[historyIndex];
                            console.log(`Reverting debt cut of ${entryToRemove.amount} from transaction ${originalTx.id}`);

                            const newHistory = [...originalTx.paymentHistory];
                            newHistory.splice(historyIndex, 1);

                            const newAmountPaid = originalTx.amountPaid - entryToRemove.amount;
                            const newStatus = newAmountPaid >= originalTx.totalAmount ? PaymentStatus.PAID :
                                (newAmountPaid > 0 ? PaymentStatus.PARTIAL : PaymentStatus.UNPAID);

                            // Check if other returns exist
                            const otherReturns = transactions.some((t: any) =>
                                t.type === 'RETURN' &&
                                t.originalTransactionId === originalTx.id &&
                                t.id !== parsedTx.id
                            );

                            const updatedOriginalTx = {
                                ...originalTx,
                                amountPaid: newAmountPaid,
                                paymentStatus: newStatus,
                                paymentHistory: newHistory,
                                isReturned: otherReturns
                            };

                            await ApiService.updateTransaction(updatedOriginalTx);
                            console.log("Original transaction debt restored successfully.");
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to restore original transaction debt:", error);
            }
        }

        // --- LOGIC B: CASCADE DELETE (If deleting a SALE transaction) ---
        // Find and delete all RETURN transactions linked to this transaction
        const returnTransactions = transactions.filter((t: any) =>
            t.type === 'RETURN' && t.originalTransactionId === id
        );

        if (returnTransactions.length > 0) {
            console.log(`Found ${returnTransactions.length} return transaction(s) to cascade delete`);

            for (const returnTx of returnTransactions) {
                try {
                    const parsedReturn = parseTransaction(returnTx);

                    // Revert Stock for Return Transaction (Return adds stock, so we subtract it back)
                    if (parsedReturn.items && parsedReturn.items.length > 0) {
                        for (const item of parsedReturn.items) {
                            try {
                                const productRes = await fetch(`${API_URL}/products/${item.id}`, { headers: getHeaders() });
                                if (productRes.ok) {
                                    const product = await productRes.json();
                                    const parsedProduct = parseProduct(product);
                                    parsedProduct.stock -= item.qty;
                                    await fetch(`${API_URL}/products/${parsedProduct.id}`, {
                                        method: 'PUT',
                                        headers: getHeaders(),
                                        body: JSON.stringify(parsedProduct)
                                    });
                                }
                            } catch (e) {
                                console.warn(`Failed to revert stock for return item ${item.id}`, e);
                            }
                        }
                    }

                    // Delete cashflows related to this return transaction
                    const cfRes = await fetch(`${API_URL}/cashflow`, { headers: getHeaders() });
                    if (cfRes.ok) {
                        const cashflows = await cfRes.json();
                        const returnCfs = cashflows.filter((cf: any) =>
                            cf.description.includes(returnTx.id.substring(0, 6))
                        );
                        for (const cf of returnCfs) {
                            await fetch(`${API_URL}/cashflow/${cf.id}`, {
                                method: 'DELETE',
                                headers: getHeaders()
                            });
                        }
                    }

                    // Delete the return transaction itself
                    await fetch(`${API_URL}/transactions/${returnTx.id}`, {
                        method: 'DELETE',
                        headers: getHeaders()
                    });

                    console.log(`Deleted return transaction ${returnTx.id}`);
                } catch (e) {
                    console.error(`Failed to delete return transaction ${returnTx.id}:`, e);
                }
            }
        }

        // --- LOGIC C: REVERT STOCK FOR MAIN TRANSACTION ---
        if (parsedTx.items && parsedTx.items.length > 0) {
            const isReturn = parsedTx.type === 'RETURN';
            for (const item of parsedTx.items) {
                try {
                    const productRes = await fetch(`${API_URL}/products/${item.id}`, { headers: getHeaders() });
                    if (productRes.ok) {
                        const product = await productRes.json();
                        const parsedProduct = parseProduct(product);

                        if (isReturn) {
                            parsedProduct.stock -= item.qty; // Return: stock was increased, so subtract
                        } else {
                            parsedProduct.stock += item.qty; // Sale: stock was decreased, so add back
                        }

                        await fetch(`${API_URL}/products/${parsedProduct.id}`, {
                            method: 'PUT',
                            headers: getHeaders(),
                            body: JSON.stringify(parsedProduct)
                        });
                    }
                } catch (e) {
                    console.warn(`Failed to revert stock for transaction item ${item.id}`, e);
                }
            }
        }

        // --- LOGIC D: DELETE RELATED CASHFLOWS ---
        const cfRes = await fetch(`${API_URL}/cashflow`, { headers: getHeaders() });
        if (cfRes.ok) {
            const cashflows = await cfRes.json();
            const relatedCfs = cashflows.filter((cf: any) => cf.description.includes(id.substring(0, 6)));
            for (const cf of relatedCfs) {
                await fetch(`${API_URL}/cashflow/${cf.id}`, {
                    method: 'DELETE',
                    headers: getHeaders()
                });
            }
        }

        // --- LOGIC E: DELETE TRANSACTION ---
        const deleteRes = await fetch(`${API_URL}/transactions/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!deleteRes.ok) throw new Error('Failed to delete transaction');

        console.log(`Successfully deleted transaction ${id} and all related data`);
    },

    // Purchases (Stock In)
    getPurchases: async (): Promise<Purchase[]> => {
        const res = await fetch(`${API_URL}/purchases`, { headers: getHeaders() });
        if (!res.ok) return [];
        const data = await res.json();
        return data.map(parsePurchase);
    },
    addPurchase: async (purchase: Purchase) => {
        // Convert ISO date to MySQL format
        const formattedDate = toMySQLDate(new Date(purchase.date));

        if (!purchase.paymentHistory && purchase.amountPaid > 0) {
            purchase.paymentHistory = [{
                date: purchase.date,
                amount: purchase.amountPaid,
                method: purchase.paymentMethod,
                bankId: purchase.bankId,
                bankName: purchase.bankName,
                note: 'Pembayaran Awal'
            }];
        }

        // Also convert dates in payment history
        if (purchase.paymentHistory && purchase.paymentHistory.length > 0) {
            purchase.paymentHistory = purchase.paymentHistory.map(ph => ({
                ...ph,
                date: toMySQLDate(new Date(ph.date))
            }));
        }

        const res = await fetch(`${API_URL}/purchases`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ ...purchase, date: formattedDate })
        });
        if (!res.ok) throw new Error('Failed to add purchase');
    },
    updatePurchase: async (purchase: Purchase) => {
        // Convert ISO date to MySQL format
        const formattedDate = toMySQLDate(new Date(purchase.date));

        // Also convert dates in payment history
        if (purchase.paymentHistory && purchase.paymentHistory.length > 0) {
            purchase.paymentHistory = purchase.paymentHistory.map(ph => ({
                ...ph,
                date: toMySQLDate(new Date(ph.date))
            }));
        }

        const res = await fetch(`${API_URL}/purchases/${purchase.id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ ...purchase, date: formattedDate })
        });
        if (!res.ok) throw new Error('Failed to update purchase');
    },
    deletePurchase: async (id: string) => {
        // 1. Get Purchase to revert stock
        const res = await fetch(`${API_URL}/purchases`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch purchases for deletion');
        const purchases = await res.json();
        const purchase = purchases.find((p: any) => p.id === id);

        if (purchase) {
            const parsedPurchase = parsePurchase(purchase);
            // Revert Stock
            if (parsedPurchase.items && parsedPurchase.items.length > 0) {
                const isReturn = parsedPurchase.type === 'RETURN';
                for (const item of parsedPurchase.items) {
                    try {
                        const productRes = await fetch(`${API_URL}/products/${item.id}`, { headers: getHeaders() });
                        if (productRes.ok) {
                            const product = await productRes.json();
                            const parsedProduct = parseProduct(product);
                            // Logic reversed from addPurchase
                            if (isReturn) {
                                parsedProduct.stock += item.qty; // Return: stock was decreased, so add back
                            } else {
                                parsedProduct.stock -= item.qty; // Purchase: stock was increased, so subtract
                            }
                            await fetch(`${API_URL}/products/${parsedProduct.id}`, {
                                method: 'PUT',
                                headers: getHeaders(),
                                body: JSON.stringify(parsedProduct)
                            });
                        }
                    } catch (e) {
                        console.warn(`Failed to revert stock for purchase item ${item.id}`, e);
                    }
                }
            }

            // 2. Delete Related CashFlows
            // Find cashflows that mention this purchase ID
            const cfRes = await fetch(`${API_URL}/cashflow`, { headers: getHeaders() });
            if (cfRes.ok) {
                const cashflows = await cfRes.json();
                const relatedCfs = cashflows.filter((cf: any) => cf.description.includes(id.substring(0, 6)));
                for (const cf of relatedCfs) {
                    await fetch(`${API_URL}/cashflow/${cf.id}`, {
                        method: 'DELETE',
                        headers: getHeaders()
                    });
                }
            }
        }

        // 3. Delete Purchase
        const deleteRes = await fetch(`${API_URL}/purchases/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!deleteRes.ok) throw new Error('Failed to delete purchase');
    },

    // Cash Flow
    getCashFlow: async (): Promise<CashFlow[]> => {
        const res = await fetch(`${API_URL}/cashflow`, { headers: getHeaders() });
        if (!res.ok) return [];
        const data = await res.json();
        return data.map(parseCashFlow);
    },
    addCashFlow: async (cf: CashFlow) => {
        const formattedDate = toMySQLDate(new Date(cf.date));
        const res = await fetch(`${API_URL}/cashflow`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ ...cf, id: cf.id || generateUUID(), date: formattedDate })
        });
        if (!res.ok) throw new Error('Failed to add cashflow');
    },

    // Users
    getUsers: async (): Promise<User[]> => {
        try {
            const res = await fetch(`${API_URL}/users`, { headers: getHeaders() });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("Fetch users failed:", e);
            throw e;
        }
    },
    saveUser: async (user: User) => {
        if (!user.id) user.id = generateUUID();
        const res = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(user)
        });
        if (!res.ok) throw new Error('Failed to save user');
    },
    updateUser: async (user: User) => {
        await fetch(`${API_URL}/users/${user.id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(user)
        });
    },
    deleteUser: async (id: string) => {
        const res = await fetch(`${API_URL}/users/${id}`, { method: 'DELETE', headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to delete user');
    },

    // Reset Functions
    resetProducts: async () => {
        // Delete all products
        const products = await fetch(`${API_URL}/products`, { headers: getHeaders() });
        if (products.ok) {
            const data = await products.json();
            for (const product of data) {
                await fetch(`${API_URL}/products/${product.id}`, {
                    method: 'DELETE',
                    headers: getHeaders()
                });
            }
        }
    },
    resetTransactions: async () => {
        // Delete all transactions
        const transactions = await fetch(`${API_URL}/transactions`, { headers: getHeaders() });
        if (transactions.ok) {
            const data = await transactions.json();
            for (const tx of data) {
                await fetch(`${API_URL}/transactions/${tx.id}`, {
                    method: 'DELETE',
                    headers: getHeaders()
                });
            }
        }
    },
    resetPurchases: async () => {
        // Delete all purchases
        const purchases = await fetch(`${API_URL}/purchases`, { headers: getHeaders() });
        if (purchases.ok) {
            const data = await purchases.json();
            for (const purchase of data) {
                await fetch(`${API_URL}/purchases/${purchase.id}`, {
                    method: 'DELETE',
                    headers: getHeaders()
                });
            }
        }
    },
    resetCashFlow: async () => {
        // Delete all cashflow
        const cashflows = await fetch(`${API_URL}/cashflow`, { headers: getHeaders() });
        if (cashflows.ok) {
            const data = await cashflows.json();
            for (const cf of data) {
                await fetch(`${API_URL}/cashflow/${cf.id}`, {
                    method: 'DELETE',
                    headers: getHeaders()
                });
            }
        }
    },
    resetAllFinancialData: async () => {
        // Reset all financial data
        await ApiService.resetTransactions();
        await ApiService.resetPurchases();
        await ApiService.resetCashFlow();
    },
    resetMasterData: async () => {
        // Delete all master data (products, categories, customers, suppliers)
        // Products
        const products = await fetch(`${API_URL}/products`, { headers: getHeaders() });
        if (products.ok) {
            const data = await products.json();
            for (const product of data) {
                await fetch(`${API_URL}/products/${product.id}`, {
                    method: 'DELETE',
                    headers: getHeaders()
                });
            }
        }

        // Categories
        const categories = await fetch(`${API_URL}/categories`, { headers: getHeaders() });
        if (categories.ok) {
            const data = await categories.json();
            for (const category of data) {
                await fetch(`${API_URL}/categories/${category.id}`, {
                    method: 'DELETE',
                    headers: getHeaders()
                });
            }
        }

        // Customers
        const customers = await fetch(`${API_URL}/customers`, { headers: getHeaders() });
        if (customers.ok) {
            const data = await customers.json();
            for (const customer of data) {
                await fetch(`${API_URL}/customers/${customer.id}`, {
                    method: 'DELETE',
                    headers: getHeaders()
                });
            }
        }

        // Suppliers
        const suppliers = await fetch(`${API_URL}/suppliers`, { headers: getHeaders() });
        if (suppliers.ok) {
            const data = await suppliers.json();
            for (const supplier of data) {
                await fetch(`${API_URL}/suppliers/${supplier.id}`, {
                    method: 'DELETE',
                    headers: getHeaders()
                });
            }
        }
    },
    resetAllData: async () => {
        // Nuclear option: Reset EVERYTHING (Financial + Master Data)
        await ApiService.resetAllFinancialData();
        await ApiService.resetMasterData();
    },


    // Authentication
    login: async (username: string, password: string): Promise<{ token: string, user: User }> => {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!res.ok) {
            const text = await res.text();
            let errorMessage = 'Login failed';
            try {
                const err = JSON.parse(text);
                errorMessage = err.error || errorMessage;
            } catch (e) {
                if (text) errorMessage = text;
            }
            throw new Error(errorMessage);
        }

        return await res.json();
    }
};
