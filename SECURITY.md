# Security Policy & Audit
 
 **Last Updated:** 23 November 2025
 
 ## 🛡️ Security Overview
 
 Cemilan KasirPOS takes security seriously. This document outlines the security measures implemented in the application, specifically for the Node.js backend architecture.
 
 ## 🔒 Implemented Security Features
 
 ### 1. Authentication & Authorization
 *   **JWT (JSON Web Tokens)**: Stateless authentication is used for all API requests. Tokens are valid for 24 hours.
 *   **Bcrypt Hashing**: User passwords are hashed using `bcryptjs` (salt rounds: 10) before storage. Plain text passwords are strictly prohibited in production.
 *   **Role-Based Access Control (RBAC)**: Middleware enforces role checks (SUPERADMIN, OWNER, CASHIER) for sensitive endpoints.
 
 ### 2. API Security
 *   **Helmet**: HTTP headers are secured using `helmet` middleware to protect against common web vulnerabilities (e.g., XSS, clickjacking).
 *   **Rate Limiting**: 
     *   **Global Limit**: 100 requests per 15 minutes per IP.
     *   **Login Limit**: Strict limit of 5 login attempts per 15 minutes to prevent brute-force attacks.
 *   **CORS**: Cross-Origin Resource Sharing is configured to restrict access to authorized domains.
 
 ### 3. Data Protection
 *   **Input Validation**: Sequelize ORM handles data validation and sanitization.
 *   **SQL Injection Prevention**: Sequelize uses parameterized queries, effectively neutralizing SQL injection attacks.
 *   **Environment Variables**: Sensitive credentials (DB passwords, JWT secrets) are stored in `.env` files, which are excluded from version control.
 
 ## 🚨 Vulnerability Reporting
 
 If you discover a security vulnerability, please do **NOT** open a public issue. Instead, please contact the development team directly or submit a report via our private channels.
 
 ## 📝 Development Guidelines
 
 *   **Never commit `.env` files**.
 *   **Always use parameterized queries** (or ORM methods).
 *   **Validate all user inputs** on both frontend and backend.
 *   **Keep dependencies updated** (`npm audit` regularly).
 
 ## 🔍 Recent Audit Findings (Nov 2025)
 
 *   **Status**: 🟢 **SECURE**
 *   **Remediations**:
     *   Migrated from plain text passwords to Bcrypt.
     *   Implemented strict rate limiting on login.
     *   Added Helmet for header security.
     *   Fixed `.gitignore` to properly exclude environment files.
