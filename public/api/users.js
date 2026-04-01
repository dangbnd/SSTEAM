const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, '../../data/users.json');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize users database if it doesn't exist
if (!fs.existsSync(dbPath)) {
    const initialUsers = [
        {
            id: '1',
            username: 'admin',
            email: 'admin@smartsteam.vn',
            fullname: 'Administrator',
            role: 'admin',
            isActive: true,
            createdAt: new Date().toISOString(),
            phone: '0123456789',
            address: 'Hà Nội, Việt Nam'
        },
        {
            id: '2',
            username: 'moderator1',
            email: 'mod@smartsteam.vn',
            fullname: 'Moderator User',
            role: 'moderator',
            isActive: true,
            createdAt: new Date().toISOString(),
            phone: '0987654321',
            address: 'TP.HCM, Việt Nam'
        }
    ];
    fs.writeFileSync(dbPath, JSON.stringify(initialUsers, null, 2));
}

// Helper function to read users from database
function readUsers() {
    try {
        const data = fs.readFileSync(dbPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading users database:', error);
        return [];
    }
}

// Helper function to write users to database
function writeUsers(users) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(users, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing users database:', error);
        return false;
    }
}

// GET /api/users - Get all users
router.get('/', (req, res) => {
    try {
        const users = readUsers();
        res.json({
            success: true,
            data: users,
            total: users.length
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tải danh sách người dùng'
        });
    }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', (req, res) => {
    try {
        const users = readUsers();
        const user = users.find(u => u.id === req.params.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }
        
        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tải thông tin người dùng'
        });
    }
});

// POST /api/users - Create new user
router.post('/', (req, res) => {
    try {
        const { username, email, password, role, fullname, phone, address, isActive } = req.body;
        
        // Validation
        if (!username || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ thông tin bắt buộc'
            });
        }
        
        const users = readUsers();
        
        // Check if username or email already exists
        const existingUser = users.find(u => u.username === username || u.email === email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Tên đăng nhập hoặc email đã tồn tại'
            });
        }
        
        // Create new user
        const newUser = {
            id: Date.now().toString(),
            username,
            email,
            password, // In real app, this should be hashed
            role,
            fullname: fullname || '',
            phone: phone || '',
            address: address || '',
            isActive: isActive !== false,
            createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        
        if (writeUsers(users)) {
            res.json({
                success: true,
                message: 'Tạo người dùng thành công',
                data: newUser
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Lỗi khi lưu người dùng'
            });
        }
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo người dùng'
        });
    }
});

// PUT /api/users/:id - Update user
router.put('/:id', (req, res) => {
    try {
        const { username, email, password, role, fullname, phone, address, isActive } = req.body;
        const userId = req.params.id;
        
        const users = readUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }
        
        // Check if username or email already exists (excluding current user)
        const existingUser = users.find(u => (u.username === username || u.email === email) && u.id !== userId);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Tên đăng nhập hoặc email đã tồn tại'
            });
        }
        
        // Update user
        const updatedUser = {
            ...users[userIndex],
            username: username || users[userIndex].username,
            email: email || users[userIndex].email,
            role: role || users[userIndex].role,
            fullname: fullname !== undefined ? fullname : users[userIndex].fullname,
            phone: phone !== undefined ? phone : users[userIndex].phone,
            address: address !== undefined ? address : users[userIndex].address,
            isActive: isActive !== undefined ? isActive : users[userIndex].isActive,
            updatedAt: new Date().toISOString()
        };
        
        // Only update password if provided
        if (password) {
            updatedUser.password = password; // In real app, this should be hashed
        }
        
        users[userIndex] = updatedUser;
        
        if (writeUsers(users)) {
            res.json({
                success: true,
                message: 'Cập nhật người dùng thành công',
                data: updatedUser
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Lỗi khi cập nhật người dùng'
            });
        }
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật người dùng'
        });
    }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', (req, res) => {
    try {
        const userId = req.params.id;
        const users = readUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }
        
        // Don't allow deleting admin users
        if (users[userIndex].role === 'admin') {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa tài khoản quản trị viên'
            });
        }
        
        users.splice(userIndex, 1);
        
        if (writeUsers(users)) {
            res.json({
                success: true,
                message: 'Xóa người dùng thành công'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Lỗi khi xóa người dùng'
            });
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa người dùng'
        });
    }
});

module.exports = router;
