function createAuthMiddleware({ jwt, JWT_SECRET, ObjectId, getDb }) {
    async function authenticateAdmin(req, res, next) {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }

            const decoded = jwt.verify(token, JWT_SECRET);
            if (decoded.role !== 'admin') {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }

            req.user = decoded;
            return next();
        } catch (error) {
            console.error('Authentication error:', error);
            return res.status(401).json({ error: 'Invalid token' });
        }
    }

    async function authenticateUser(req, res, next) {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }

            const decoded = jwt.verify(token, JWT_SECRET);
            const db = getDb();
            if (!db) {
                return res.status(503).json({ error: 'Database not connected' });
            }

            if (!decoded.userId || !ObjectId.isValid(decoded.userId)) {
                return res.status(401).json({ error: 'Invalid token payload' });
            }

            const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.userId) });
            if (!user) {
                return res.status(401).json({ error: 'User not found' });
            }

            req.user = { ...decoded, user };
            return next();
        } catch (error) {
            console.error('User authentication error:', error);
            return res.status(401).json({ error: 'Invalid token' });
        }
    }

    return {
        authenticateAdmin,
        authenticateUser,
    };
}

module.exports = { createAuthMiddleware };
