let db = null;

function setUserAuthDb(nextDb) {
    db = nextDb;
}

function registerUserAuthRoutes(app, deps) {
    const {
        ObjectId,
        jwt,
        JWT_SECRET,
        bcrypt,
        sharp,
        upload,
        fs,
        path,
        publicDir,
        mediaRoot,
        googleClient,
        GOOGLE_CLIENT_ID,
        authenticateUser,
    } = deps;

    // ============================================================================
    // USER AUTHENTICATION ROUTES
    // ============================================================================
    
    // User registration
    app.post('/api/auth/register', async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }
    
            const { firstName, lastName, email, phone, password, newsletter } = req.body;
    
            // Validate required fields
            if (!firstName || !lastName || !email || !phone || !password) {
                return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin bắt buộc' });
            }
    
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ error: 'Email không hợp lệ' });
            }
    
            // Validate password strength
            if (password.length < 6) {
                return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
            }
    
            // Check if user already exists
            const existingUser = await db.collection('users').findOne({ email });
            if (existingUser) {
                if (!existingUser.password) {
                    return res.status(400).json({ error: 'Email already exists. Please sign in with Google for this account.' });
                }

                // If user exists, verify password and login instead of creating duplicate
                const isPasswordValid = await bcrypt.compare(password, existingUser.password);
                if (isPasswordValid) {
                    // Generate JWT token
                    const token = jwt.sign(
                        { 
                            userId: existingUser._id, 
                            email: existingUser.email,
                            role: existingUser.role 
                        },
                        JWT_SECRET,
                        { expiresIn: '7d' }
                    );
    
                    // Update last login
                    await db.collection('users').updateOne(
                        { _id: existingUser._id },
                        { 
                            $set: { 
                                lastLogin: new Date(),
                                updatedAt: new Date()
                            },
                            $unset: { 
                                loginAttempts: "",
                                lockUntil: ""
                            }
                        }
                    );
    
                    // Remove password from response
                    const userResponse = { ...existingUser };
                    delete userResponse.password;
                    delete userResponse.emailVerificationToken;
                    delete userResponse.resetPasswordToken;
                    delete userResponse.resetPasswordExpires;
    
                    console.log('Existing user logged in via register:', existingUser.email);
    
                    return res.status(200).json({
                        message: 'Đăng nhập thành công (tài khoản đã tồn tại)',
                        token,
                        user: userResponse
                    });
                } else {
                    return res.status(400).json({ error: 'Email đã được sử dụng với mật khẩu khác. Vui lòng đăng nhập hoặc sử dụng email khác.' });
                }
            }
    
            // Hash password
            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
    
            // Create user object
            const userData = {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.toLowerCase().trim(),
                phone: phone.trim(),
                password: hashedPassword,
                newsletter: newsletter === 'on' || newsletter === true,
                role: 'user',
                isActive: true,
                isEmailVerified: false,
                emailVerificationToken: null,
                resetPasswordToken: null,
                resetPasswordExpires: null,
                lastLogin: null,
                loginAttempts: 0,
                lockUntil: null,
                profile: {
                    avatar: '',
                    bio: '',
                    interests: [],
                    location: '',
                    website: ''
                },
                preferences: {
                    language: 'vi',
                    theme: 'light',
                    notifications: {
                        email: true,
                        push: true,
                        sms: false
                    }
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };
    
            // Insert user into database
            const result = await db.collection('users').insertOne(userData);
            
            // Remove password from response
            delete userData.password;
            userData._id = result.insertedId;
    
            console.log('User registered:', userData.email);
    
            res.status(201).json({
                message: 'Đăng ký thành công',
                user: userData
            });
    
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Lỗi server khi đăng ký' });
        }
    });
    
    // User login
    app.post('/api/auth/login', async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }
    
            const { email, password, remember } = req.body;
    
            if (!email || !password) {
                return res.status(400).json({ error: 'Email và mật khẩu là bắt buộc' });
            }
    
            // Find user by email
            const user = await db.collection('users').findOne({ 
                email: email.toLowerCase().trim(),
                isActive: true 
            });
    
            if (!user) {
                return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác' });
            }
    
            // Check if account is locked
            if (user.lockUntil && user.lockUntil > Date.now()) {
                return res.status(423).json({ 
                    error: 'Tài khoản đã bị khóa. Vui lòng thử lại sau.' 
                });
            }
    
            // Verify password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            
            if (!isPasswordValid) {
                // Increment login attempts
                const updateData = {
                    loginAttempts: user.loginAttempts + 1,
                    updatedAt: new Date()
                };
    
                // Lock account after 5 failed attempts
                if (user.loginAttempts + 1 >= 5) {
                    updateData.lockUntil = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
                }
    
                await db.collection('users').updateOne(
                    { _id: user._id },
                    { $set: updateData }
                );
    
                return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác' });
            }
    
            // Reset login attempts on successful login
            const tokenExpiry = remember ? '30d' : '24h';
            const token = jwt.sign(
                { 
                    userId: user._id.toString(),
                    email: user.email,
                    role: user.role,
                    firstName: user.firstName,
                    lastName: user.lastName
                },
                JWT_SECRET,
                { expiresIn: tokenExpiry }
            );
    
            // Update user login info
            await db.collection('users').updateOne(
                { _id: user._id },
                { 
                    $set: { 
                        lastLogin: new Date(),
                        loginAttempts: 0,
                        lockUntil: null,
                        updatedAt: new Date()
                    }
                }
            );
    
            // Remove sensitive data from response
            const userResponse = {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                isEmailVerified: user.isEmailVerified,
                profile: user.profile,
                preferences: user.preferences,
                createdAt: user.createdAt
            };
    
            console.log('User logged in:', user.email);
    
            res.json({
                message: 'Đăng nhập thành công',
                token,
                user: userResponse
            });
    
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Lỗi server khi đăng nhập' });
        }
    });
    
    // Verify token
    app.get('/api/auth/verify', authenticateUser, (req, res) => {
        res.json({
            valid: true,
            user: {
                _id: req.user.user._id,
                firstName: req.user.user.firstName,
                lastName: req.user.user.lastName,
                email: req.user.user.email,
                role: req.user.user.role
            }
        });
    });

    // Get current authenticated user
    app.get('/api/auth/me', authenticateUser, (req, res) => {
        const user = req.user?.user || {};
        return res.json({
            user: {
                _id: user._id,
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                role: user.role || 'user',
                avatar: user.avatar || '',
                profile: user.profile || {},
                preferences: user.preferences || {},
            },
        });
    });
    
    // Get user profile
    app.get('/api/auth/profile', authenticateUser, async (req, res) => {
        try {
            const user = await db.collection('users').findOne(
                { _id: new ObjectId(req.user.userId) },
                { projection: { password: 0 } }
            );
    
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
    
            res.json(user);
        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({ error: 'Failed to get profile' });
        }
    });
    
    // Update user profile
    app.put('/api/auth/profile', authenticateUser, async (req, res) => {
        try {
            const { firstName, lastName, phone, birthDate, gender, profile, preferences } = req.body;
            
            const updateData = {
                updatedAt: new Date()
            };
    
            if (firstName) updateData.firstName = firstName.trim();
            if (lastName) updateData.lastName = lastName.trim();
            if (phone) updateData.phone = phone.trim();
            if (birthDate) updateData.birthDate = new Date(birthDate);
            if (gender) updateData.gender = gender;
            if (profile) updateData.profile = { ...req.user.user.profile, ...profile };
            if (preferences) updateData.preferences = { ...req.user.user.preferences, ...preferences };
    
            const result = await db.collection('users').updateOne(
                { _id: new ObjectId(req.user.userId) },
                { $set: updateData }
            );
    
            if (result.matchedCount === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
    
            res.json({ message: 'Profile updated successfully' });
        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({ error: 'Failed to update profile' });
        }
    });
    
    // Change password
    app.put('/api/auth/change-password', authenticateUser, async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;
    
            if (!currentPassword || !newPassword) {
                return res.status(400).json({ error: 'Current password and new password are required' });
            }
    
            if (newPassword.length < 6) {
                return res.status(400).json({ error: 'New password must be at least 6 characters' });
            }
    
            const user = await db.collection('users').findOne({ _id: new ObjectId(req.user.userId) });
            
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
    
            // Verify current password
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isCurrentPasswordValid) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }
    
            // Hash new password
            const saltRounds = 12;
            const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
    
            // Update password
            await db.collection('users').updateOne(
                { _id: new ObjectId(req.user.userId) },
                { 
                    $set: { 
                        password: hashedNewPassword,
                        updatedAt: new Date()
                    }
                }
            );
    
            res.json({ message: 'Password changed successfully' });
        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({ error: 'Failed to change password' });
        }
    });
    
    // Google OAuth Redirect
    app.get('/api/auth/google/redirect', (req, res) => {
        if (!GOOGLE_CLIENT_ID) {
            return res.status(503).send('Google OAuth is not configured');
        }

        const authUrl = googleClient.generateAuthUrl({
            access_type: 'offline',
            scope: ['profile', 'email'],
            prompt: 'select_account'
        });
        res.redirect(authUrl);
    });
    
    // Google OAuth Callback
    app.get('/api/auth/google/callback', async (req, res) => {
        try {
            if (!GOOGLE_CLIENT_ID) {
                return res.status(503).send('Google OAuth is not configured');
            }

            if (!db) {
                return res.status(500).send('Database not connected');
            }

            const code = typeof req.query?.code === 'string' ? req.query.code.trim() : '';
            if (!code) {
                return res.status(400).send('Authorization code not provided');
            }

            const { tokens } = await googleClient.getToken(code);
            if (!tokens?.id_token) {
                return res.status(401).send('Google authentication failed');
            }
            googleClient.setCredentials(tokens);

            const ticket = await googleClient.verifyIdToken({
                idToken: tokens.id_token,
                audience: GOOGLE_CLIENT_ID,
            });

            const payload = ticket.getPayload() || {};
            const googleId = String(payload.sub || '').trim();
            const email = String(payload.email || '').toLowerCase().trim();
            const name = String(payload.name || '').trim();
            const picture = String(payload.picture || '').trim();

            if (!googleId || !email) {
                return res.status(401).send('Google authentication failed');
            }

            let user = await db.collection('users').findOne({
                $or: [{ email }, { googleId }],
            });

            if (user) {
                const updateData = {
                    updatedAt: new Date(),
                    lastLoginAt: new Date(),
                };

                if (!user.googleId) {
                    updateData.googleId = googleId;
                }
                if (picture && !user.avatar) {
                    updateData.avatar = picture;
                }

                await db.collection('users').updateOne(
                    { _id: user._id },
                    { $set: updateData }
                );

                user = { ...user, ...updateData };
            } else {
                const nameParts = name.split(/\s+/).filter(Boolean);
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';

                const newUser = {
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    email,
                    googleId,
                    avatar: picture || '',
                    role: 'user',
                    isActive: true,
                    isEmailVerified: true,
                    emailVerificationToken: null,
                    resetPasswordToken: null,
                    loginAttempts: 0,
                    lockUntil: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    lastLoginAt: new Date(),
                    preferences: {
                        theme: 'light',
                        language: 'vi',
                        notifications: {
                            email: true,
                            push: false,
                        },
                    },
                };

                const result = await db.collection('users').insertOne(newUser);
                user = { ...newUser, _id: result.insertedId };
            }

            await db.collection('users').updateOne(
                { _id: user._id },
                { $set: { lastLoginAt: new Date(), updatedAt: new Date() } }
            );

            const jwtToken = jwt.sign(
                {
                    userId: user._id.toString(),
                    email: user.email,
                    role: user.role,
                    firstName: user.firstName,
                    lastName: user.lastName,
                },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            const authPayload = {
                token: jwtToken,
                user: {
                    id: user._id,
                    firstName: user.firstName || '',
                    lastName: user.lastName || '',
                    email: user.email || '',
                    avatar: user.avatar || '',
                    role: user.role || 'user',
                },
            };

            const encodedPayload = Buffer.from(JSON.stringify(authPayload), 'utf8').toString('base64');

            const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authentication Success</title>
    <style>
        body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            font-family: Arial, sans-serif;
            background: #0f172a;
            color: #fff;
        }
        .card { text-align: center; }
        .spinner {
            width: 24px;
            height: 24px;
            margin: 16px auto 0;
            border-radius: 50%;
            border: 3px solid rgba(255, 255, 255, 0.25);
            border-top-color: #fff;
            animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="card">
        <h2>Authentication successful</h2>
        <p>Redirecting...</p>
        <div class="spinner" aria-hidden="true"></div>
    </div>
    <script>
        (function() {
            try {
                var payload = JSON.parse(atob('${encodedPayload}'));
                var targetWindow = window.opener || window;
                targetWindow.localStorage.setItem('authToken', payload.token);
                targetWindow.localStorage.setItem('user', JSON.stringify(payload.user));

                if (window.opener) {
                    try { window.opener.location.reload(); } catch (_) {}
                    window.close();
                    return;
                }

                window.location.href = '/';
            } catch (error) {
                document.body.innerHTML = '<div class="card"><h2>Authentication failed</h2><p>Please try again.</p></div>';
            }
        })();
    </script>
</body>
</html>`;

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(html);
        } catch (error) {
            console.error('Google callback error:', error);
            return res.status(500).send('Authentication failed');
        }
    });
    // Upload Avatar
    app.post('/api/auth/upload-avatar', authenticateUser, upload.single('avatar'), async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }
    
            if (!req.file) {
                return res.status(400).json({ error: 'No avatar file provided' });
            }
    
            const userId = req.user.userId;
    
            // Ensure avatars directory exists — write to persistent mediaRoot � write to persistent mediaRoot
            const avatarsDir = path.join(mediaRoot, 'images', 'avatars');
            if (!fs.existsSync(avatarsDir)) {
                fs.mkdirSync(avatarsDir, { recursive: true });
            }
    
            // Convert uploaded image to WebP
            const webpName = `avatar-${Date.now()}-${Math.round(Math.random()*1e9)}.webp`;
            const webpPath = path.join(avatarsDir, webpName);
            await sharp(req.file.path)
                .rotate()
                .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 85 })
                .toFile(webpPath);
    
            // Remove original uploaded file
            try { fs.unlinkSync(req.file.path); } catch (_) {}
    
            const avatarUrl = `/images/avatars/${webpName}`;
    
            // Update user avatar in database (both root and nested profile.avatar)
            await db.collection('users').updateOne(
                { _id: new ObjectId(userId) },
                { $set: { avatar: avatarUrl, 'profile.avatar': avatarUrl, updatedAt: new Date() } }
            );
    
            // Return updated user snapshot
            const updatedUser = await db.collection('users').findOne({ _id: new ObjectId(userId) }, { projection: { password: 0 } });
    
            res.json({
                message: 'Avatar updated successfully',
                avatarUrl,
                user: updatedUser
            });
    
        } catch (error) {
            console.error('Upload avatar error:', error);
            res.status(500).json({ error: 'Failed to upload avatar' });
        }
    });
    
    // Logout: clear potential HttpOnly cookies as well
    app.post('/api/auth/logout', (req, res) => {
        try {
            const cookieHeaders = [
                'token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax',
                'authToken=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax',
                'jwt=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax',
                'session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax'
            ];
            res.setHeader('Set-Cookie', cookieHeaders);
            res.json({ success: true, message: 'Logged out successfully' });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({ success: false, error: 'Logout failed' });
        }
    });
    
}

module.exports = { registerUserAuthRoutes, setUserAuthDb };

