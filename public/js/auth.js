// Authentication JavaScript
class AuthManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupPasswordStrength();
        this.setupFormValidation();
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            // Neutralize native form submission
            try { loginForm.setAttribute('action', 'javascript:void(0)'); } catch(_) {}
            try { loginForm.setAttribute('method', 'post'); } catch(_) {}
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            // Neutralize native form submission
            try { registerForm.setAttribute('action', 'javascript:void(0)'); } catch(_) {}
            try { registerForm.setAttribute('method', 'post'); } catch(_) {}
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Password confirmation validation
        const confirmPassword = document.getElementById('confirmPassword');
        const password = document.getElementById('password');
        if (confirmPassword && password) {
            confirmPassword.addEventListener('input', () => this.validatePasswordMatch());
        }

        // Google login buttons
        const googleLoginBtn = document.getElementById('googleLoginBtn');
        const googleRegisterBtn = document.getElementById('googleRegisterBtn');
        
        if (googleLoginBtn) {
            googleLoginBtn.addEventListener('click', () => this.handleGoogleLogin());
        }
        
        if (googleRegisterBtn) {
            googleRegisterBtn.addEventListener('click', () => this.handleGoogleLogin());
        }
    }

    setupPasswordStrength() {
        const passwordInput = document.getElementById('password');
        if (!passwordInput) return;

        passwordInput.addEventListener('input', (e) => {
            this.updatePasswordStrength(e.target.value);
        });
    }

    setupFormValidation() {
        // Real-time email validation
        const emailInputs = document.querySelectorAll('input[type="email"]');
        emailInputs.forEach(input => {
            input.addEventListener('blur', (e) => this.validateEmail(e.target));
        });

        // Phone validation
        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => this.formatPhoneNumber(e.target));
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            this.showLoading(form.querySelector('.auth-btn'));
            this.clearMessages();

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json().catch(() => ({}));

            if (response.ok) {
                this.showSuccess('Đăng nhập thành công!');
                
                // Store token
                if (result.token) {
                    localStorage.setItem('authToken', result.token);
                    localStorage.setItem('user', JSON.stringify(result.user));
                }

                // Redirect after short delay
                setTimeout(() => {
                    const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '/';
                    window.location.href = redirectUrl;
                }, 1500);
            } else {
                const reason = (result && (result.error || result.message || result.detail))
                    || (Array.isArray(result?.errors) && result.errors.map(e => e.msg || e.message || e).join('\n'))
                    || ('Đăng nhập thất bại (HTTP ' + response.status + ')');
                this.showError(reason);
                try {
                    const emailInput = document.getElementById('email');
                    const passwordInput = document.getElementById('password');
                    if (emailInput) emailInput.value = '';
                    if (passwordInput) passwordInput.value = '';
                    if (emailInput) emailInput.focus();
                } catch(_) {}
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Có lỗi xảy ra. Vui lòng thử lại.');
            try {
                const emailInput = document.getElementById('email');
                const passwordInput = document.getElementById('password');
                if (emailInput) emailInput.value = '';
                if (passwordInput) passwordInput.value = '';
                if (emailInput) emailInput.focus();
            } catch(_) {}
        } finally {
            this.hideLoading(form.querySelector('.auth-btn'));
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Validate password match
        if (data.password !== data.confirmPassword) {
            this.showError('Mật khẩu xác nhận không khớp');
            return;
        }

        // Validate terms agreement (support name="terms" or agreeTerms)
        const agreed = (typeof data.agreeTerms !== 'undefined') ? !!data.agreeTerms : !!data.terms;
        const agreedChecked = agreed || !!(form.querySelector('input[name="terms"]') && form.querySelector('input[name="terms"]').checked) || !!(form.querySelector('input[name="agreeTerms"]') && form.querySelector('input[name="agreeTerms"]').checked);
        if (!agreedChecked) {
            this.showError('Vui lòng đồng ý với điều khoản sử dụng');
            return;
        }

        try {
            this.showLoading(form.querySelector('.auth-btn'));
            this.clearMessages();

            // Remove confirmPassword from data
            delete data.confirmPassword;

            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json().catch(() => ({}));

            if (response.ok) {
                // Success: prefer immediate login experience
                try {
                    if (result && result.token && result.user) {
                        localStorage.setItem('authToken', result.token);
                        localStorage.setItem('user', JSON.stringify(result.user));
                        this.showSuccess('Đăng ký thành công!');
                        setTimeout(() => { window.location.href = '/'; }, 800);
                        return;
                    }

                    // If API does not return token, attempt auto-login using provided credentials
                    const autoLoginRes = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: data.email, password: data.password })
                    });
                    const autoLogin = await autoLoginRes.json();
                    if (autoLoginRes.ok && autoLogin.token && autoLogin.user) {
                        localStorage.setItem('authToken', autoLogin.token);
                        localStorage.setItem('user', JSON.stringify(autoLogin.user));
                        this.showSuccess('Đăng ký thành công!');
                        setTimeout(() => { window.location.href = '/'; }, 800);
                    } else {
                        // Fallback: redirect to login
                        this.showSuccess('Đăng ký thành công! Vui lòng đăng nhập.');
                        setTimeout(() => { window.location.href = '/login'; }, 1200);
                    }
                } catch (autoErr) {
                    // Fallback on any error
                    this.showSuccess('Đăng ký thành công! Vui lòng đăng nhập.');
                    setTimeout(() => { window.location.href = '/login'; }, 1200);
                }
            } else {
                const reason = (result && (result.error || result.message || result.detail))
                    || (Array.isArray(result?.errors) && result.errors.map(e => e.msg || e.message || e).join('\n'))
                    || ('Đăng ký thất bại (HTTP ' + response.status + ')');
                this.showError(reason);
                try {
                    const emailInput = document.getElementById('email');
                    const passwordInput = document.getElementById('password');
                    const confirmInput = document.getElementById('confirmPassword');
                    if (emailInput) emailInput.value = '';
                    if (passwordInput) passwordInput.value = '';
                    if (confirmInput) confirmInput.value = '';
                    if (emailInput) emailInput.focus();
                } catch(_) {}
            }
        } catch (error) {
            console.error('Register error:', error);
            this.showError('Có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            this.hideLoading(form.querySelector('.auth-btn'));
        }
    }

    updatePasswordStrength(password) {
        const strengthBar = document.querySelector('.strength-fill');
        const strengthText = document.querySelector('.strength-text');
        
        if (!strengthBar || !strengthText) return;

        const strength = this.calculatePasswordStrength(password);
        
        strengthBar.className = 'strength-fill';
        strengthBar.classList.add(strength.level);
        
        strengthText.textContent = strength.text;
        strengthText.style.color = strength.color;
    }

    calculatePasswordStrength(password) {
        let score = 0;
        let feedback = [];

        if (password.length >= 8) score += 1;
        else feedback.push('ít nhất 8 ký tự');

        if (/[a-z]/.test(password)) score += 1;
        else feedback.push('chữ thường');

        if (/[A-Z]/.test(password)) score += 1;
        else feedback.push('chữ hoa');

        if (/[0-9]/.test(password)) score += 1;
        else feedback.push('số');

        if (/[^A-Za-z0-9]/.test(password)) score += 1;
        else feedback.push('ký tự đặc biệt');

        if (score <= 1) {
            return { level: 'weak', text: 'Mật khẩu yếu', color: '#e53e3e' };
        } else if (score <= 2) {
            return { level: 'fair', text: 'Mật khẩu trung bình', color: '#dd6b20' };
        } else if (score <= 3) {
            return { level: 'good', text: 'Mật khẩu tốt', color: '#d69e2e' };
        } else {
            return { level: 'strong', text: 'Mật khẩu mạnh', color: '#38a169' };
        }
    }

    validatePasswordMatch() {
        const password = document.getElementById('password');
        const confirmPassword = document.getElementById('confirmPassword');
        
        if (!password || !confirmPassword) return;

        if (confirmPassword.value && password.value !== confirmPassword.value) {
            confirmPassword.setCustomValidity('Mật khẩu không khớp');
            confirmPassword.classList.add('error');
        } else {
            confirmPassword.setCustomValidity('');
            confirmPassword.classList.remove('error');
        }
    }

    validateEmail(input) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (input.value && !emailRegex.test(input.value)) {
            input.setCustomValidity('Email không hợp lệ');
            input.classList.add('error');
        } else {
            input.setCustomValidity('');
            input.classList.remove('error');
        }
    }

    formatPhoneNumber(input) {
        let value = input.value.replace(/\D/g, '');
        
        if (value.length > 0) {
            if (value.startsWith('0')) {
                value = value.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
            } else if (value.startsWith('84')) {
                value = value.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '+$1 $2 $3 $4');
            }
        }
        
        input.value = value;
    }

    async handleGoogleLogin() {
        try {
            // Open popup for Google OAuth
            const popup = window.open(
                '/api/auth/google/redirect',
                'googleAuth',
                'width=500,height=600,scrollbars=yes,resizable=yes'
            );

            // Listen for popup completion
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    // Check if login was successful by verifying token
                    this.checkLoginStatus();
                }
            }, 1000);

        } catch (error) {
            console.error('Google login error:', error);
            this.showError('Không thể đăng nhập với Google. Vui lòng thử lại.');
        }
    }

    checkLoginStatus() {
        const token = localStorage.getItem('authToken');
        if (token) {
            this.showSuccess('Đăng nhập thành công!');
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        }
    }

    showLoading(button) {
        if (button) {
            button.disabled = true;
            button.classList.add('loading');
        }
    }

    hideLoading(button) {
        if (button) {
            button.disabled = false;
            button.classList.remove('loading');
        }
    }

    showError(message) {
        this.clearMessages();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        try {
            errorDiv.style.color = '#ef4444';
            errorDiv.style.fontWeight = '600';
            errorDiv.style.marginBottom = '12px';
            errorDiv.style.textAlign = 'center';
        } catch(_) {}
        const form = document.getElementById('loginForm')
                  || document.getElementById('registerForm')
                  || document.querySelector('.login-form')
                  || document.querySelector('.register-form')
                  || document.querySelector('.auth-form');
        if (form) {
            form.insertBefore(errorDiv, form.firstChild);
        } else {
            document.body.insertBefore(errorDiv, document.body.firstChild);
        }
    }

    showSuccess(message) {
        this.clearMessages();
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        try {
            successDiv.style.color = '#16a34a';
            successDiv.style.fontWeight = '600';
            successDiv.style.marginBottom = '12px';
            successDiv.style.textAlign = 'center';
        } catch(_) {}
        const form = document.getElementById('loginForm')
                  || document.getElementById('registerForm')
                  || document.querySelector('.login-form')
                  || document.querySelector('.register-form')
                  || document.querySelector('.auth-form');
        if (form) {
            form.insertBefore(successDiv, form.firstChild);
        } else {
            document.body.insertBefore(successDiv, document.body.firstChild);
        }
    }

    clearMessages() {
        const messages = document.querySelectorAll('.error-message, .success-message');
        messages.forEach(msg => msg.remove());
    }

    handleFacebookLogin() {
        // Implement Facebook OAuth
        console.log('Facebook login clicked');
    }
}

// Utility functions
function verifyAuthToken() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        // Verify token with server
        fetch('/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                // Token invalid, clear storage
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
            }
        })
        .catch(() => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
        });
    }
}

function logout() {
    try {
        try { localStorage.clear(); } catch (_) {}
        try { sessionStorage.clear(); } catch (_) {}
        try {
            document.cookie.split(';').forEach(c => {
                const eqPos = c.indexOf('=');
                const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
                document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
            });
        } catch (_) {}
    } catch (error) {
        console.error('Error during logout:', error);
    } finally {
        try {
            fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).finally(() => {
                window.location.href = '/';
            });
        } catch (_) {
            window.location.href = '/';
        }
    }
}

// Load includes
async function loadIncludes() {
    try {
        // No dynamic includes for auth pages. Use static login.html/register.html directly.
        // Keep this function to maintain call sites; do nothing here.

    } catch (error) {
        console.error('Error loading includes:', error);
    }
}

// Force input styling
function forceInputStyling() {
    const inputs = document.querySelectorAll('.auth-input');
    inputs.forEach(input => {
        input.style.border = '2px solid #d1d5db';
        input.style.background = 'rgba(255, 255, 255, 0.9)';
        input.style.color = '#1f2937';
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try { new AuthManager(); } catch(_) {}
    try { verifyAuthToken(); } catch(_) {}
    // Force styling shortly after to ensure inputs are visible
    setTimeout(() => { try { forceInputStyling(); } catch(_) {} }, 100);
});

// Export for use in other scripts
window.AuthManager = AuthManager;
window.logout = logout;
