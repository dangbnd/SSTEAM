// Admin Dashboard JavaScript
/* admin init */

// Utility function for date formatting
function formatDate(dateString) {
    try {
        return new Date(dateString).toLocaleDateString('vi-VN');
    } catch (e) {
        return dateString || 'N/A';
    }
}

// User Management Class
class UserManagement {
    constructor() {
        this.users = [];
        this.editingUser = null;
        this.init();
    }

    async init() {
        try {
            await this.loadUsers();
            this.setupEventListeners();
        } catch (error) {
            console.error('❌ Error initializing User Management:', error);
        }
    }

    setupEventListeners() {
        // Form submission
        const userForm = document.getElementById('user-form-data');
        if (userForm) {
            userForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });
        }

        // Search functionality
        const searchInput = document.getElementById('user-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterUsers(e.target.value);
            });
        }
    }

    async loadUsers() {
        try {
            
            const response = await fetch('/api/users', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.users = data.users || [];
            
            
            this.updateStats();
            this.renderUsers();
            
        } catch (error) {
            console.error('❌ Error loading users:', error);
            this.showError('Không thể tải danh sách người dùng: ' + error.message);
        }
    }

    updateStats() {
        const totalUsers = this.users.length;
        const activeUsers = this.users.filter(user => user.status !== 'inactive').length;
        const adminUsers = this.users.filter(user => user.role === 'admin').length;
        const today = new Date().toDateString();
        const newUsersToday = this.users.filter(user => 
            new Date(user.createdAt).toDateString() === today
        ).length;

        const totalUsersEl = document.getElementById('totalUsers');
        const activeUsersEl = document.getElementById('activeUsers');
        const adminUsersEl = document.getElementById('adminUsers');
        const newUsersTodayEl = document.getElementById('newUsersToday');

        if (totalUsersEl) totalUsersEl.textContent = totalUsers;
        if (activeUsersEl) activeUsersEl.textContent = activeUsers;
        if (adminUsersEl) adminUsersEl.textContent = adminUsers;
        if (newUsersTodayEl) newUsersTodayEl.textContent = newUsersToday;
    }

    renderUsers(usersToRender = null) {
        const users = usersToRender || this.users;
        const tbody = document.getElementById('users-table-body');
        
        if (!tbody) return;

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="loading">Không có người dùng nào</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>
                    <div class="user-info">
                        <div class="user-avatar">
                            ${user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div class="user-details">
                            <h4>${user.fullName || user.username}</h4>
                            <p>@${user.username}</p>
                        </div>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>
                    <span class="role-badge role-${user.role}">
                        ${user.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                    </span>
                </td>
                <td>${this.formatDate(user.createdAt)}</td>
                <td>
                    <span class="role-badge ${user.status === 'active' ? 'role-user' : 'role-admin'}">
                        ${user.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-edit" onclick="userManager.editUser('${user._id}')">
                            ✏️ Sửa
                        </button>
                        <button class="btn btn-sm btn-delete" onclick="userManager.deleteUser('${user._id}')">
                            🗑️ Xóa
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    filterUsers(searchTerm) {
        const filtered = this.users.filter(user => 
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.fullName && user.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        this.renderUsers(filtered);
    }

    toggleUserForm() {
        const form = document.getElementById('user-form');
        if (!form) return;

        form.classList.toggle('show');
        
        if (!form.classList.contains('show')) {
            this.editingUser = null;
            const formData = document.getElementById('user-form-data');
            if (formData) {
                formData.reset();
            }
        }
    }

    editUser(userId) {
        const user = this.users.find(u => u._id === userId);
        if (!user) return;

        this.editingUser = user;
        
        // Fill form with user data
        const usernameEl = document.getElementById('username');
        const emailEl = document.getElementById('email');
        const roleEl = document.getElementById('role');
        const fullNameEl = document.getElementById('fullName');
        const phoneEl = document.getElementById('phone');
        const passwordEl = document.getElementById('password');

        if (usernameEl) usernameEl.value = user.username;
        if (emailEl) emailEl.value = user.email;
        if (roleEl) roleEl.value = user.role;
        if (fullNameEl) fullNameEl.value = user.fullName || '';
        if (phoneEl) phoneEl.value = user.phone || '';
        if (passwordEl) passwordEl.required = false;
        
        // Show form
        const form = document.getElementById('user-form');
        if (form) {
            form.classList.add('show');
            try { form.scrollIntoView({ behavior: 'auto' }); } catch (error) { try { window.scrollTo(0, form.getBoundingClientRect().top + window.pageYOffset); } catch (_) {} }
        }
    }

    async deleteUser(userId) {
        if (!confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return;

        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Remove from local array
            this.users = this.users.filter(u => u._id !== userId);
            this.updateStats();
            this.renderUsers();
            
            
        } catch (error) {
            console.error('❌ Error deleting user:', error);
            alert('Không thể xóa người dùng: ' + error.message);
        }
    }

    async handleSubmit() {
        try {
            const formData = new FormData(document.getElementById('user-form-data'));
            const userData = Object.fromEntries(formData.entries());
            
            // Remove password if editing and password is empty
            if (this.editingUser && !userData.password) {
                delete userData.password;
            }

            let response;
            if (this.editingUser) {
                // Update existing user
                response = await fetch(`/api/users/${this.editingUser._id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
                    },
                    body: JSON.stringify(userData)
                });
            } else {
                // Create new user
                response = await fetch('/api/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
                    },
                    body: JSON.stringify(userData)
                });
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            // Reload users
            await this.loadUsers();
            
            // Hide form
            this.toggleUserForm();
            
        } catch (error) {
            console.error('❌ Error saving user:', error);
            alert('Không thể lưu người dùng: ' + error.message);
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showError(message) {
        const tbody = document.getElementById('users-table-body');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" class="loading">${message}</td></tr>`;
        }
    }
}

// Global functions for onclick handlers
function toggleUserForm() {
    if (window.userManager) {
        window.userManager.toggleUserForm();
    }
}

// Admin Dashboard Functionality
const adminDashboard = {
    // Initialize
    init() {
        try {




            
            // Make adminDashboard globally accessible for debugging
            window.adminDashboard = this;

            
            // Initialize slug generation
            this.initializeSlugGeneration();
            
            // Load orders for admin
            this.loadOrders();
            
            // Auto-activate orders tab if URL has #orders

            if (window.location.hash === '#orders') {

                this.activateOrdersTab();
            }
            
            // Setup tab switching
            this.setupTabSwitching();
            
            // Initialize rich text editors
            this.initializeRichTextEditors();
            
            // Load sitemap stats
            this.loadSitemapStats();
            
            // Ensure edit news form is hidden on init
            this.hideEditNewsFormOnInit();
        } catch (error) {
            console.error('Error initializing admin dashboard:', error);
        }
    },

    hideEditNewsFormOnInit() {
        try {
            const editForm = document.getElementById('edit-news-form');
            if (editForm) {
                editForm.style.display = 'none';

            }
            
            // Also hide on DOM ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.hideEditNewsFormOnInit();
                });
            }
        } catch (error) {
            console.error('Error hiding edit news form on init:', error);
        }
    },

    // Load orders for admin
    async loadOrders() {
        try {

            const response = await fetch('/api/admin/orders', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
                }
            });

            
            if (!response.ok) throw new Error('Failed to load orders');
            
            const orders = await response.json();

            // cache orders for detail view
            this._ordersCache = Array.isArray(orders) ? orders : [];
            this.renderOrders(orders);
        } catch (error) {
            console.error('❌ Error loading orders:', error);
            this.renderOrders([]);
        }
    },

    // Render orders table
    renderOrders(orders) {
        const tbody = document.getElementById('orders-table-body');
        if (!tbody) return;

        if (!orders || orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">Chưa có đơn hàng nào</td></tr>';
            return;
        }

        tbody.innerHTML = orders.map(order => {
            const statusClass = this.getStatusClass(order.status);
            const customerName = order.user?.name || order.user?.email || 'N/A';
            const itemsText = order.items?.length ? `${order.items.length} sản phẩm` : 'N/A';
            const total = this.formatPrice(order.total || 0);
            const date = this.formatDate(order.createdAt);

            return `
                <tr>
                    <td><strong>${order.code || order._id}</strong></td>
                    <td>${customerName}</td>
                    <td>${itemsText}</td>
                    <td><strong>${total}</strong></td>
                    <td>
                        <select class="status-select ${statusClass}" onchange="adminDashboard.updateOrderStatus('${order._id}', this.value)">
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Chờ xử lý</option>
                            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Đang xử lý</option>
                            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Đã gửi hàng</option>
                            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Đã giao hàng</option>
                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Đã hủy</option>
                        </select>
                    </td>
                    <td>${date}</td>
                    <td>
                        <button class="btn btn-sm btn-outline" onclick="adminDashboard.viewOrderDetails('${order._id}')">Xem</button>
                        <button class="btn btn-sm btn-danger" onclick="adminDashboard.deleteOrder('${order._id}')">Xóa</button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    // Update order status
    async updateOrderStatus(orderId, newStatus) {
        try {
            // Check if it's a test order (not in database)
            if (orderId.startsWith('test')) {
                // Update UI directly for test orders
                const select = document.querySelector(`select[onchange="adminDashboard.updateOrderStatus('${orderId}', this.value)"]`);
                if (select) {
                    select.className = `status-select status-${newStatus}`;

                }
                return;
            }
            
            const response = await fetch(`/api/admin/orders/${orderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) throw new Error('Failed to update order status');
            
            const result = await response.json();

            
            // Reload orders to reflect changes
            this.loadOrders();
        } catch (error) {
            console.error('Error updating order status:', error);
            alert('Lỗi khi cập nhật trạng thái đơn hàng');
        }
    },

    // View order details
    viewOrderDetails(orderId) {
        try {

            
            // Show modal
            const modal = document.getElementById('order-details-modal');
            if (modal) {
                modal.style.display = 'flex';
                
                // Load order details
                this.loadOrderDetails(orderId);
            } else {
                console.error('Order details modal not found');
                alert('Không tìm thấy modal chi tiết đơn hàng');
            }
        } catch (error) {
            console.error('Error viewing order details:', error);
            alert('Lỗi khi xem chi tiết đơn hàng: ' + error.message);
        }
    },

    // Load order details data
    async loadOrderDetails(orderId) {
        try {
            const contentDiv = document.getElementById('order-details-content');
            if (!contentDiv) return;

            contentDiv.innerHTML = '<div class="loading">⏳ Đang tải chi tiết đơn hàng...</div>';

            // For test orders, show mock data
            if (orderId && (orderId.startsWith('test') || orderId.includes('test'))) {
                this.displayOrderDetails(this.getMockOrderData(orderId));
                return;
            }

            // Prefer cache first
            if (Array.isArray(this._ordersCache) && this._ordersCache.length > 0) {
                const cached = this._ordersCache.find(o => (o._id === orderId) || (o.id === orderId) || (o.code === orderId));
                if (cached) {
                    this.displayOrderDetails(cached);
                    return;
                }
            }

            // Fallback: refetch list and find the order
            const listResponse = await fetch('/api/admin/orders', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
                }
            });
            if (!listResponse.ok) throw new Error('Failed to fetch orders list');
            const list = await listResponse.json();
            this._ordersCache = Array.isArray(list) ? list : [];
            const found = this._ordersCache.find(o => (o._id === orderId) || (o.id === orderId) || (o.code === orderId));
            if (found) {
                this.displayOrderDetails(found);
                return;
            }

            throw new Error('Không tìm thấy đơn hàng trong danh sách');
        } catch (error) {
            console.error('Error loading order details:', error);
            const contentDiv = document.getElementById('order-details-content');
            if (contentDiv) {
                contentDiv.innerHTML = '<p>❌ Lỗi khi tải chi tiết đơn hàng: ' + error.message + '</p>';
            }
        }
    },

    // Delete order
    async deleteOrder(orderId) {
        if (!confirm('Bạn có chắc muốn xóa đơn hàng này? Hành động này không thể hoàn tác!')) return;
        



        
        // Check if it's a test order (not in database)
        if (orderId && (orderId.startsWith('test') || orderId.includes('test'))) {

            // Remove from UI directly for test orders
            const row = document.querySelector(`button[onclick="adminDashboard.deleteOrder('${orderId}')"]`)?.closest('tr');
            if (row) {
                row.remove();
                alert('Đơn hàng test đã được xóa!');
            } else {
                console.error('Could not find test order row');
                alert('Không tìm thấy dòng đơn hàng test');
            }
            return;
        }
        
        try {
            const response = await fetch(`/api/admin/orders/${orderId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete order');
            }
            
            const result = await response.json();

            
            // Reload orders to reflect changes
            this.loadOrders();
            
            // Show success message
            alert('Đơn hàng đã được xóa thành công!');
            
        } catch (error) {
            console.error('Error deleting order:', error);
            alert('Lỗi khi xóa đơn hàng: ' + error.message);
        }
    },

    // Filter orders
    filterOrders() {
        const statusFilter = document.getElementById('order-status-filter')?.value;
        const dateFilter = document.getElementById('order-date-filter')?.value;

        this.loadOrders();
    },

    // Activate orders tab
    activateOrdersTab() {

        
        // Hide all subtabs
        const subtabs = document.querySelectorAll('.subtab-content');

        subtabs.forEach(tab => {
            tab.classList.remove('active');

        });
        
        // Show orders subtab
        const ordersTab = document.getElementById('orders-subtab');

        if (ordersTab) {
            ordersTab.classList.add('active');

        } else {
            console.error('❌ Orders tab not found');
        }
        
        // Update sub-tab buttons
        const subTabBtns = document.querySelectorAll('.sub-tab-btn');
        subTabBtns.forEach(btn => btn.classList.remove('active'));
        
        const ordersBtn = document.querySelector('[data-subtab="orders"]');
        if (ordersBtn) {
            ordersBtn.classList.add('active');
        }
        
        // Reload orders data
        this.loadOrders();
    },

    // Test render orders manually
    testRenderOrders() {

        const tbody = document.getElementById('orders-table-body');
        if (!tbody) {
            console.error('❌ Table body not found!');
            return;
        }
        
        tbody.innerHTML = `
            <tr>
                <td><strong>SS-TEST1</strong></td>
                <td>Test User</td>
                <td>1 sản phẩm</td>
                <td><strong>100.000 đ</strong></td>
                <td>
                    <select class="status-select status-pending">
                        <option value="pending" selected>Chờ xử lý</option>
                        <option value="processing">Đang xử lý</option>
                        <option value="shipped">Đã gửi hàng</option>
                        <option value="delivered">Đã giao hàng</option>
                        <option value="cancelled">Đã hủy</option>
                    </select>
                </td>
                <td>25/12/2024</td>
                <td>
                    <button class="btn btn-sm btn-outline">Xem</button>
                    <button class="btn btn-sm btn-danger">Xóa</button>
                </td>
            </tr>
        `;

    },

    // Setup tab switching
    setupTabSwitching() {
        const subTabBtns = document.querySelectorAll('.sub-tab-btn');
        subTabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const subtab = e.target.getAttribute('data-subtab');

                
                if (subtab === 'orders') {
                    this.activateOrdersTab();
                }
            });
        });
    },

    // Helper functions
    getStatusClass(status) {
        const classes = {
            'pending': 'status-pending',
            'processing': 'status-processing', 
            'shipped': 'status-shipped',
            'delivered': 'status-delivered',
            'cancelled': 'status-cancelled'
        };
        return classes[status] || 'status-pending';
    },

    formatPrice(price) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price || 0);
    },

    formatDate(dateString) {
        try {
            return new Date(dateString).toLocaleDateString('vi-VN');
        } catch (e) {
            return dateString || 'N/A';
        }
    },

    // Initialize Rich Text Editors
    initializeRichTextEditors() {
        try {
            console.log('🔄 Initializing rich text editors...');
            
            // Wait a bit for DOM to be ready
            setTimeout(() => {
                // Initialize all rich text editors
                this.initializeFallbackRichTextEditors();
                initializeProjectRichTextEditor();
                initializeNewsRichTextEditor();
                initializeTutorialRichTextEditor();
                console.log('✅ All rich text editors initialized');
            }, 500);
        } catch (error) {
            console.error('Error initializing rich text editors:', error);
            this.initializeFallbackRichTextEditors();
        }
    },

    // Fallback rich text editor using basic HTML editing
    initializeFallbackRichTextEditors() {
        try {

            
            document.querySelectorAll('.rich-editor').forEach(textarea => {
                try {
                    // Create toolbar
                    const toolbar = document.createElement('div');
                    toolbar.className = 'fallback-toolbar';
                    toolbar.innerHTML = `
                        <button type="button" onclick="adminDashboard.formatText('${textarea.id}', 'bold')" title="Bold">B</button>
                        <button type="button" onclick="adminDashboard.formatText('${textarea.id}', 'italic')" title="Italic">I</button>
                        <button type="button" onclick="adminDashboard.formatText('${textarea.id}', 'underline')" title="Underline">U</button>
                        <button type="button" onclick="adminDashboard.formatText('${textarea.id}', 'list')" title="List">•</button>
                    `;
                    
                    // Insert toolbar before textarea
                    textarea.parentNode.insertBefore(toolbar, textarea);
                    
                    // Make textarea editable
                    textarea.removeAttribute('disabled');
                    textarea.style.opacity = '1';
                    textarea.style.minHeight = '120px';
                    

                } catch (error) {
                    console.error('Error creating fallback editor for:', textarea.id, error);
                }
            });
            

        } catch (error) {
            console.error('Error initializing fallback rich text editors:', error);
        }
    },

    // Format text in fallback editor
    formatText(textareaId, format) {
        try {
            const textarea = document.getElementById(textareaId);
            if (!textarea) return;
            
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const selectedText = textarea.value.substring(start, end);
            
            let formattedText = '';
            switch (format) {
                case 'bold':
                    formattedText = `<strong>${selectedText}</strong>`;
                    break;
                case 'italic':
                    formattedText = `<em>${selectedText}</em>`;
                    break;
                case 'underline':
                    formattedText = `<u>${selectedText}</u>`;
                    break;
                case 'list':
                    formattedText = `<ul><li>${selectedText}</li></ul>`;
                    break;
                default:
                    formattedText = selectedText;
            }
            
            textarea.value = textarea.value.substring(0, start) + formattedText + textarea.value.substring(end);
            textarea.focus();
            textarea.setSelectionRange(start + formattedText.length, start + formattedText.length);
            
        } catch (error) {
            console.error('Error formatting text:', error);
        }
    },

    // Get content from rich text editor
    getRichTextContent(editorId) {
        try {
            const editor = document.getElementById(editorId);
            if (editor) {
                // Check if it's a contenteditable div
                if (editor.contentEditable === 'true') {
                    return editor.innerHTML || '';
                } else {
                    return editor.value || '';
                }
            }
            return '';
        } catch (error) {
            console.error('Error getting rich text content:', error);
            return '';
        }
    },

    // Initialize automatic slug generation
    initializeSlugGeneration() {
        try {
            // Check for tutorial inputs
            const tutorialTitleInput = document.getElementById('tutorial-title');
            const tutorialSlugInput = document.getElementById('tutorial-slug');
            
            if (tutorialTitleInput && tutorialSlugInput) {
                tutorialTitleInput.addEventListener('input', (e) => {
                    try {
                        const title = e.target.value;
                        const slug = this.generateSlug(title);
                        tutorialSlugInput.value = slug;

                    } catch (error) {
                        console.error('Error generating tutorial slug:', error);
                    }
                });
                

            } else {

            }
            
            // Check for product inputs (if they exist)
            const productNameInput = document.getElementById('product-name');
            const productSlugInput = document.getElementById('product-slug');
            
            if (productNameInput && productSlugInput) {
                productNameInput.addEventListener('input', (e) => {
                    try {
                        const name = e.target.value;
                        const slug = this.generateSlug(name);
                        productSlugInput.value = slug;

                    } catch (error) {
                        console.error('Error generating product slug:', error);
                    }
                });
                

            } else {

            }
        } catch (error) {
            console.error('Error initializing slug generation:', error);
        }
    },

    // Generate slug from Vietnamese text
    generateSlug(text) {
        try {
            if (!text) return '';
            
            let slug = text
                .toLowerCase()
                .trim()
                // Vietnamese character replacements
                .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
                .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
                .replace(/[ìíịỉĩ]/g, 'i')
                .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
                .replace(/[ùúụủũưừứựửữ]/g, 'u')
                .replace(/[ỳýỵỷỹ]/g, 'y')
                .replace(/đ/g, 'd')
                // Remove special characters and replace with hyphens
                .replace(/[^a-z0-9\s-]/g, '')
                // Replace spaces and multiple hyphens with single hyphen
                .replace(/[\s-]+/g, '-')
                // Remove leading and trailing hyphens
                .replace(/^-+|-+$/g, '');
            
            // Ensure slug is not empty and has minimum length
            if (slug.length < 3) {
                slug = 'product-' + slug;
            }
            
            // Limit length to 100 characters
            if (slug.length > 100) {
                slug = slug.substring(0, 100);
            }
            
            return slug;
        } catch (error) {
            console.error('Error generating slug:', error);
            return '';
        }
    },

    // Check if slug is unique (placeholder for future implementation)
    async checkSlugUniqueness(slug, excludeId = null) {
        try {
            // TODO: Implement API call to check slug uniqueness
            // For now, return true (assuming unique)

            return true;
        } catch (error) {
            console.error('Error checking slug uniqueness:', error);
            return true; // Assume unique on error
        }
    },

    // Sitemap Management
    async generateSitemap() {
        try {

            
            // Show loading state
            const generateBtn = document.querySelector('[onclick="adminDashboard.generateSitemap()"]');
            if (generateBtn) {
                generateBtn.disabled = true;
                generateBtn.textContent = '⏳ Đang tạo...';
            }

            // Collect all URLs
            const urls = [];
            // Use production domain instead of localhost
            const baseUrl = window.location.hostname === 'localhost' ? 'https://smartsteam.vn' : window.location.origin;

            // Static pages
            const staticPages = [
                { url: '/', priority: '1.0', changefreq: 'daily' },
                { url: '/about', priority: '0.8', changefreq: 'monthly' },
                { url: '/contact', priority: '0.7', changefreq: 'monthly' },
                { url: '/products', priority: '0.9', changefreq: 'weekly' },
                { url: '/news', priority: '0.9', changefreq: 'daily' },
                { url: '/tutorials', priority: '0.9', changefreq: 'weekly' }
            ];

            urls.push(...staticPages);

            // Fetch dynamic content
            try {
                // Products
                const productsRes = await fetch('/api/products');
                if (productsRes.ok) {
                    const products = await productsRes.json();
                    products.forEach(product => {
                        if (product.slug) {
                            urls.push({
                                url: `/${product.slug}`,
                                priority: '0.8',
                                changefreq: 'weekly',
                                lastmod: product.updatedAt || product.createdAt
                            });
                        }
                    });
                }
            } catch (error) {
                console.error('Error fetching products for sitemap:', error);
            }

            try {
                // News
                const newsRes = await fetch('/api/news');
                if (newsRes.ok) {
                    const news = await newsRes.json();
                    news.forEach(article => {
                        if (article.slug) {
                            urls.push({
                                url: `/news/${article.slug}`,
                                priority: '0.8',
                                changefreq: 'weekly',
                                lastmod: article.updatedAt || article.createdAt
                            });
                        }
                    });
                }
            } catch (error) {
                console.error('Error fetching news for sitemap:', error);
            }

            try {
                // Tutorials
                const tutorialsRes = await fetch('/api/tutorials');
                if (tutorialsRes.ok) {
                    const response = await tutorialsRes.json();
                    // API returns { tutorials: [], pagination: {} }
                    const tutorials = response.tutorials || response;
                    
                    if (Array.isArray(tutorials)) {
                    tutorials.forEach(tutorial => {
                        if (tutorial.slug) {
                            urls.push({
                                url: `/tutorials/${tutorial.slug}`,
                                priority: '0.8',
                                changefreq: 'monthly',
                                lastmod: tutorial.updatedAt || tutorial.createdAt
                            });
                            } else {
                                console.warn('⚠️ Tutorial without slug:', tutorial.title || tutorial._id);
                        }
                    });

                    }
                }
            } catch (error) {
                console.error('Error fetching tutorials for sitemap:', error);
            }

            try {
                // Projects
                const projectsRes = await fetch('/api/projects');
                if (projectsRes.ok) {
                    const projects = await projectsRes.json();
                    projects.forEach(project => {
                        if (project.slug) {
                            urls.push({
                                url: `/projects/${project.slug}`,
                                priority: '0.7',
                                changefreq: 'monthly',
                                lastmod: project.updatedAt || project.createdAt
                            });
                        }
                    });
                }
            } catch (error) {
                console.error('Error fetching projects for sitemap:', error);
            }

            // Generate XML sitemap
            const sitemapXml = this.generateSitemapXML(urls, baseUrl);
            
            // Save sitemap to server
            const saveRes = await fetch('/api/admin/sitemap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                },
                body: JSON.stringify({ sitemap: sitemapXml })
            });

            if (saveRes.ok) {
                // Update UI
                this.updateSitemapStats(urls.length);
                alert('✅ Sitemap đã được tạo thành công!');
            } else {
                throw new Error('Failed to save sitemap');
            }

        } catch (error) {
            console.error('Error generating sitemap:', error);
            alert('❌ Lỗi khi tạo sitemap: ' + error.message);
        } finally {
            // Reset button state
            const generateBtn = document.querySelector('[onclick="adminDashboard.generateSitemap()"]');
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.textContent = '🔄 Tạo sitemap mới';
            }
        }
    },

    generateSitemapXML(urls, baseUrl) {
        const now = new Date().toISOString();
        
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
        
        urls.forEach(urlData => {
            xml += '  <url>\n';
            xml += `    <loc>${baseUrl}${urlData.url}</loc>\n`;
            xml += `    <lastmod>${urlData.lastmod ? new Date(urlData.lastmod).toISOString() : now}</lastmod>\n`;
            xml += `    <changefreq>${urlData.changefreq}</changefreq>\n`;
            xml += `    <priority>${urlData.priority}</priority>\n`;
            xml += '  </url>\n';
        });
        
        xml += '</urlset>';
        return xml;
    },

    updateSitemapStats(urlCount) {
        try {
            const urlCountEl = document.getElementById('sitemap-urls');
            const lastUpdateEl = document.getElementById('sitemap-last-update');
            const sizeEl = document.getElementById('sitemap-size');
            
            if (urlCountEl) {
                urlCountEl.textContent = urlCount;
            }
            
            if (lastUpdateEl) {
                lastUpdateEl.textContent = new Date().toLocaleString('vi-VN');
            }
            
            if (sizeEl) {
                // Estimate size (rough calculation)
                const estimatedSize = Math.round((urlCount * 200) / 1024); // ~200 bytes per URL
                sizeEl.textContent = `${estimatedSize} KB`;
            }

            // Auto-refresh sitemap preview after generation
            setTimeout(() => {
                this.viewSitemap();
            }, 1000);
        } catch (error) {
            console.error('Error updating sitemap stats:', error);
        }
    },

    async loadSitemapStats() {
        try {
            const response = await fetch('/sitemap.xml?ts=' + Date.now());
            if (response.ok) {
                const xmlText = await response.text();
                // Parse XML to count URLs
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
                const urls = xmlDoc.querySelectorAll('url');
                
                // Count by type
                let tutorialsCount = 0;
                let productsCount = 0;
                let newsCount = 0;
                let staticCount = 0;
                
                urls.forEach(url => {
                    const loc = url.querySelector('loc')?.textContent || '';
                    if (loc.includes('/tutorials/')) tutorialsCount++;
                    else if (loc.includes('/products/')) productsCount++;
                    else if (loc.includes('/news/')) newsCount++;
                    else staticCount++;
                });
                
                // Update detailed stats
                this.updateDetailedSitemapStats(urls.length, tutorialsCount, productsCount, newsCount, staticCount);
            }
        } catch (error) {
            console.error('Error loading sitemap stats:', error);
        }
    },

    updateDetailedSitemapStats(totalUrls, tutorialsCount, productsCount, newsCount, staticCount) {
        try {
            // Update main stats
            this.updateSitemapStats(totalUrls);
            
            // Add detailed breakdown if elements exist
            const statsContainer = document.querySelector('.sitemap-info .info-card');
            if (statsContainer) {
                let detailedStats = statsContainer.querySelector('.detailed-breakdown');
                if (!detailedStats) {
                    detailedStats = document.createElement('div');
                    detailedStats.className = 'detailed-breakdown';
                    detailedStats.style.marginTop = '1rem';
                    detailedStats.style.padding = '0.75rem';
                    detailedStats.style.background = '#f1f5f9';
                    detailedStats.style.borderRadius = '6px';
                    detailedStats.style.fontSize = '0.9rem';
                    statsContainer.appendChild(detailedStats);
                }
                
                detailedStats.innerHTML = `
                    <h6 style="margin: 0 0 0.5rem 0; color: #475569;">📊 Chi tiết:</h6>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.5rem;">
                        <div style="text-align: center;">
                            <div style="font-weight: 600; color: #1e40af;">${staticCount}</div>
                            <div style="font-size: 0.8rem; color: #64748b;">Trang tĩnh</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-weight: 600; color: #059669;">${tutorialsCount}</div>
                            <div style="font-size: 0.8rem; color: #64748b;">Bài giảng</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-weight: 600; color: #dc2626;">${productsCount}</div>
                            <div style="font-size: 0.8rem; color: #64748b;">Sản phẩm</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-weight: 600; color: #7c3aed;">${newsCount}</div>
                            <div style="font-size: 0.8rem; color: #64748b;">Tin tức</div>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error updating detailed sitemap stats:', error);
        }
    },

    async submitSitemap() {
        try {

            
            const submitBtn = document.querySelector('[onclick="adminDashboard.submitSitemap()"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = '⏳ Đang gửi...';
            }

            // Submit to Google Search Console
            const sitemapUrl = `${window.location.origin}/sitemap.xml`;
            
            // Note: This is a simplified version. In production, you'd need to use Google Search Console API
            const response = await fetch('/api/admin/submit-sitemap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                },
                body: JSON.stringify({ sitemapUrl })
            });

            if (response.ok) {
                alert('✅ Sitemap đã được gửi lên Google Search Console!');
            } else {
                throw new Error('Failed to submit sitemap');
            }

        } catch (error) {
            console.error('Error submitting sitemap:', error);
            alert('❌ Lỗi khi gửi sitemap: ' + error.message);
        } finally {
            const submitBtn = document.querySelector('[onclick="adminDashboard.submitSitemap()"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '📤 Gửi lên Google';
            }
        }
    },

    async viewSitemap() {
        try {
            // First try to load sitemap preview in admin panel
            const previewContainer = document.getElementById('sitemap-preview');
            if (previewContainer) {
                previewContainer.innerHTML = '<div class="loading">⏳ Đang tải sitemap...</div>';
                
                try {
                    // Fetch directly from sitemap.xml file
                    const response = await fetch('/sitemap.xml?ts=' + Date.now());
                    if (response.ok) {
                        const xmlContent = await response.text();
                        if (xmlContent) {
                            // Display sitemap content in preview
                            const parser = new DOMParser();
                            const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
                            const urls = xmlDoc.querySelectorAll('url');
                            
                            let previewHTML = '<div class="sitemap-preview-list">';
                            previewHTML += `<h5>📄 Sitemap Preview (${urls.length} URLs)</h5>`;
                            
                            urls.forEach(url => {
                                const loc = url.querySelector('loc')?.textContent || '';
                                const lastmod = url.querySelector('lastmod')?.textContent || '';
                                const priority = url.querySelector('priority')?.textContent || '';
                                const changefreq = url.querySelector('changefreq')?.textContent || '';
                                
                                previewHTML += `
                                    <div class="sitemap-url-item">
                                        <div class="url-path">${loc}</div>
                                        <div class="url-meta">
                                            <span class="url-priority">Priority: ${priority}</span>
                                            <span class="url-freq">Freq: ${changefreq}</span>
                                            ${lastmod ? `<span class="url-lastmod">Updated: ${new Date(lastmod).toLocaleDateString('vi-VN')}</span>` : ''}
                                        </div>
                                    </div>
                                `;
                            });
                            
                            previewHTML += '</div>';
                            previewContainer.innerHTML = previewHTML;
                        } else {
                            previewContainer.innerHTML = '<p>📄 Chưa có sitemap. Bấm "Tạo sitemap mới" để bắt đầu.</p>';
                        }
                    } else {
                        throw new Error('Failed to fetch sitemap.xml');
                    }
                } catch (error) {
                    console.error('Error loading sitemap preview:', error);
                    previewContainer.innerHTML = '<p>❌ Không thể tải sitemap.xml: ' + error.message + '. <a href="/sitemap.xml" target="_blank">Mở sitemap.xml trực tiếp</a></p>';
                }
            } else {
                // Fallback to opening in new tab
                this.viewSitemapExternal();
            }
        } catch (error) {
            console.error('Error viewing sitemap:', error);
            alert('❌ Lỗi khi xem sitemap: ' + error.message);
        }
    },

    viewSitemapExternal() {
        try {
            const baseUrl = window.location.hostname === 'localhost' ? 'https://smartsteam.vn' : window.location.origin;
            const sitemapUrl = `${baseUrl}/sitemap.xml`;
            window.open(sitemapUrl, '_blank');
        } catch (error) {
            console.error('Error opening external sitemap:', error);
            alert('❌ Lỗi khi mở sitemap: ' + error.message);
        }
    },

    // Regenerate slug manually
    regenerateSlug() {
        try {
            const nameInput = document.getElementById('product-name');
            const slugInput = document.getElementById('product-slug');
            
            if (nameInput && slugInput) {
                const name = nameInput.value;
                if (name.trim()) {
                    const slug = this.generateSlug(name);
                    slugInput.value = slug;

                } else {
                    console.warn('⚠️ Product name is empty, cannot generate slug');
                }
            } else {
                console.error('❌ Name or slug input not found');
            }
        } catch (error) {
            console.error('Error regenerating slug:', error);
        }
    },

    // Dashboard Data Loading
    async loadDashboardData() {
        try {
            const adminToken = localStorage.getItem('adminToken');
            if (!adminToken) {
                throw new Error('Không có token admin');
            }

            // Load categories
            const categoriesResponse = await fetch('/api/admin/categories', {
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });
            
            if (!categoriesResponse.ok) {
                throw new Error('Lỗi khi tải danh mục');
            }
            
            const categories = await categoriesResponse.json();
            this.displayCategories(categories);

            // Load products
            const productsResponse = await fetch('/api/admin/products', {
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });
            
            if (!productsResponse.ok) {
                throw new Error('Lỗi khi tải sản phẩm');
            }
            
            const products = await productsResponse.json();
            this.displayProducts(products);

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError(error.message);
        }
    },

    // Products Management
    async loadProducts() {
        try {
            const adminToken = localStorage.getItem('adminToken');
            if (!adminToken) {
                throw new Error('Không có token admin');
            }

            // Load categories first if not already loaded
            if (!this.categories || this.categories.length === 0) {

                await this.loadCategories();
            }

            const response = await fetch('/api/admin/products', {
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Lỗi khi tải sản phẩm');
            }

            const products = await response.json();
            this.displayProducts(products);

        } catch (error) {
            console.error('Error loading products:', error);
            this.showError(error.message);
        }
    },

    // Display Products
    displayProducts(products) {
        try {
            const tbody = document.getElementById('products-table-body');
            if (!tbody) {
                console.warn('Products table tbody not found');
                return;
            }

            tbody.innerHTML = '';

            if (products.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center">Chưa có sản phẩm nào</td></tr>';
                return;
            }

            products.forEach(product => {
                try {
                    // Debug: Log product data to check for base64 in slug
                    console.log('🔍 Product data:', {
                        name: product.name,
                        slug: product.slug,
                        images: product.images,
                        hasBase64Slug: product.slug && product.slug.startsWith('data:image')
                    });
                    
                    // Fix slug if it contains base64 data (legacy data issue)
                    let displaySlug = product.slug || 'N/A';
                    if (product.slug && product.slug.startsWith('data:image')) {
                        console.warn('⚠️ Found base64 data in slug, fixing...');
                        displaySlug = product.name ? 
                            product.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-') : 
                            'invalid-slug';
                    }
                    
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><strong>${product.name || 'N/A'}</strong></td>
                        <td><code>${displaySlug}</code></td>
                        <td>${this.getCategoryName(product.categoryId) || 'N/A'}</td>
                        <td><strong>${product.price ? product.price.toLocaleString('vi-VN') + ' VNĐ' : 'N/A'}</strong></td>
                        <td><span class="stock-badge ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}">${product.stock || 0}</span></td>
                        <td>${product.isActive ? '<span class="status-active">🟢 Hoạt động</span>' : '<span class="status-inactive">🔴 Ẩn</span>'}</td>
                        <td>${product.createdAt ? new Date(product.createdAt).toLocaleDateString('vi-VN') : 'N/A'}</td>
                        <td class="action-buttons">
                            <button class="edit-btn" onclick="editProduct('${product._id}')" title="Sửa">
                                <span>✏️</span>
                            </button>
                            <button class="delete-btn" onclick="deleteProduct('${product._id}')" title="Xóa">
                                <span>🗑️</span>
                            </button>
                        </td>
                    `;
                    tbody.appendChild(row);
                    
                    
                } catch (error) {
                    console.error('Error creating product row:', error);
                }
            });


        } catch (error) {
            console.error('Error displaying products:', error);
        }
    },

    // Fix Product Slug (for legacy data with base64 in slug)
    async fixProductSlug(productId, productName) {
        try {



            
            if (!confirm('Bạn có chắc chắn muốn sửa slug cho sản phẩm này? Slug sẽ được tạo lại từ tên sản phẩm.')) {

                return;
            }
            
            const adminToken = localStorage.getItem('adminToken');
            if (!adminToken) {
                throw new Error('Không có token admin. Vui lòng đăng nhập lại.');
            }
            
            // Generate new slug from product name
            const newSlug = productName
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
                .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
                .replace(/\s+/g, '-') // Replace spaces with hyphens
                .replace(/-+/g, '-') // Replace multiple hyphens with single
                .trim();
            

            
            const response = await fetch(`/api/admin/products/${productId}/fix-slug`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ slug: newSlug })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Lỗi khi sửa slug');
            }
            
            const result = await response.json();

            
            alert('✅ Slug đã được sửa thành công!');
            this.loadProducts(); // Reload products list
            
        } catch (error) {
            console.error('❌ Error fixing product slug:', error);
            alert('❌ Lỗi khi sửa slug: ' + error.message);
        }
    },


    getCategoryName(categoryId) {
        try {
            if (!categoryId) return 'N/A';
            
            // If we have categories loaded, try to find the category name
            if (this.categories && Array.isArray(this.categories)) {
                const category = this.categories.find(cat => 
                    cat._id === categoryId || 
                    cat.id === categoryId || 
                    cat.slug === categoryId ||
                    cat._id?.toString() === categoryId?.toString()
                );
                return category ? category.name : `ID: ${categoryId}`;
            }
            
            return `ID: ${categoryId}`; // Fallback to ID if no categories loaded
        } catch (error) {
            console.error('Error getting category name:', error);
            return `ID: ${categoryId}`; // Fallback to ID on error
        }
    },

    displayCategories(categories) {
        try {

            // Store categories for later use
            this.categories = categories;
            
            // Update category select in add product form if it exists
            const categorySelect = document.getElementById('product-category');
            if (categorySelect) {

                categorySelect.innerHTML = '<option value="">Chọn danh mục</option>';
                categories.forEach(category => {
                    try {
                        const option = document.createElement('option');
                        option.value = category._id;
                        option.textContent = category.name;
                        categorySelect.appendChild(option);
                    } catch (error) {
                        console.error('Error creating category option:', error);
                    }
                });

            } else {
                console.warn('⚠️ product-category select not found in displayCategories');
            }
            
            // Also update category select in edit product form if it exists
            const editCategorySelect = document.getElementById('edit-product-category');
            if (editCategorySelect) {

                editCategorySelect.innerHTML = '<option value="">Chọn danh mục</option>';
                categories.forEach(category => {
                    try {
                        const option = document.createElement('option');
                        option.value = category._id;
                        option.textContent = category.name;
                        editCategorySelect.appendChild(option);
                    } catch (error) {
                        console.error('Error creating edit category option:', error);
                    }
                });

            }
            
            // Also display categories in the admin table
            this.displayCategoriesTable(categories);
            

        } catch (error) {
            console.error('Error displaying categories:', error);
        }
    },

    // Display categories in the admin table
    displayCategoriesTable(categories) {
        try {

            const tableBody = document.getElementById('categories-table-body');
            
            if (!tableBody) {
                console.warn('⚠️ Categories table body not found');
                return;
            }

            if (!categories || categories.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" class="no-data">Chưa có danh mục nào</td></tr>';

                return;
            }

            let tableHTML = '';
            categories.forEach(category => {
                try {
                    // Handle icon display - check if it's an image URL or emoji
                    let iconDisplay = '📦'; // default emoji
                    if (category.icon) {
                        if (category.icon.startsWith('data:image') || category.icon.startsWith('http')) {
                            // It's an image URL or data URL
                            iconDisplay = `<img src="${category.icon}" alt="Icon" style="width: 24px; height: 24px; object-fit: cover; border-radius: 4px;">`;
                        } else {
                            // It's an emoji or text
                            iconDisplay = category.icon;
                        }
                    }
                    
                    const description = category.description || 'Không có mô tả';
                    const productCount = category.productCount || 0;
                    
                    tableHTML += `
                        <tr>
                            <td>${category._id || 'N/A'}</td>
                            <td>
                                <div class="category-info">
                                    <span class="category-icon">${iconDisplay}</span>
                                    <span class="category-name">${category.name}</span>
                                </div>
                            </td>
                            <td>${description}</td>
                            <td><code>${category.slug}</code></td>
                            <td>${productCount}</td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn btn-small btn-secondary" onclick="adminDashboard.editCategory('${category._id}', ${JSON.stringify(category).replace(/"/g, '&quot;')})" title="Sửa">
                                        ✏️
                                    </button>
                                    <button class="btn btn-small btn-danger" onclick="adminDashboard.deleteCategory('${category._id}')" title="Xóa">
                                        🗑️
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                } catch (error) {
                    console.error('Error creating category row:', error);
                }
            });

            tableBody.innerHTML = tableHTML;

            
        } catch (error) {
            console.error('Error displaying categories table:', error);
        }
    },

    // Load categories for admin dashboard
    async loadCategories() {
        try {

            const adminToken = localStorage.getItem('adminToken');
            if (!adminToken) {
                throw new Error('Không có token admin');
            }

            const response = await fetch('/api/admin/categories', {
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const categories = await response.json();
            this.displayCategories(categories);

            
        } catch (error) {
            console.error('❌ Error loading categories:', error);
            this.showError('Lỗi khi tải danh mục: ' + error.message);
        }
    },



    // Refresh product categories
    async refreshProductCategories() {
        try {

            const adminToken = localStorage.getItem('adminToken');
            if (!adminToken) {
                throw new Error('Không có token admin');
            }

            const response = await fetch('/api/admin/categories', {
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const categories = await response.json();
            this.displayCategories(categories);

            
            // Also refresh the product form dropdown
            await loadCategoriesForProductForm();

            
            // Show success message
            this.showSuccess('Danh mục sản phẩm đã được làm mới');
            
        } catch (error) {
            console.error('❌ Error refreshing product categories:', error);
            this.showError('Lỗi khi làm mới danh mục: ' + error.message);
        }
    },

    // Utility Functions
    showSuccess(message) {
        try {
            alert('✅ ' + message);
        } catch (error) {
            console.error('Error showing success message:', error);
        }
    },

    showError(message) {
        try {
            alert('❌ ' + message);
        } catch (error) {
            console.error('Error showing error message:', error);
        }
    },

    async handleApiError(response) {
        try {
            const errorData = await response.json();
            return errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        } catch (e) {
            return `HTTP ${response.status}: ${response.statusText}`;
        }
    },

    // Form Management
    showAddProductForm() {
        try {
            const form = document.getElementById('add-product-form');
            if (form) {
                form.style.display = 'block';
                
                // Initialize rich text editors for add form
                setTimeout(() => {
                    this.initializeRichTextEditors();
                }, 100);
                

            }
        } catch (error) {
            console.error('Error showing add product form:', error);
        }
    },

    hideAddProductForm() {
        try {
            const form = document.getElementById('add-product-form');
            if (form) {
                form.style.display = 'none';

            }
            
            // Clear editing state
            window.editingProductId = null;
            
            // Reset form
            const formElement = document.getElementById('product-form');
            if (formElement) {
                formElement.reset();
            }
            
            // Clear image preview
            const imagePreviewGrid = document.getElementById('product-images-grid');
            if (imagePreviewGrid) {
                imagePreviewGrid.innerHTML = '';
            }
            
            // Hide image preview container
            const previewContainer = document.getElementById('product-images-preview');
            if (previewContainer) {
                previewContainer.style.display = 'none';
            }
            
        } catch (error) {
            console.error('Error hiding add product form:', error);
        }
    },

    // Product Management
    async createProduct(productData) {
        try {
            const adminToken = localStorage.getItem('adminToken');
            if (!adminToken) {
                throw new Error('Không có token admin');
            }

            const response = await fetch('/api/admin/products', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productData)
            });

            if (!response.ok) {
                const errorMessage = await this.handleApiError(response);
                throw new Error(errorMessage);
            }

            const result = await response.json();
            this.showSuccess('Thêm sản phẩm thành công!');
            this.hideAddProductForm();
            this.loadProducts();
            return result;

        } catch (error) {
            console.error('Error creating product:', error);
            this.showError(error.message || 'Lỗi khi thêm sản phẩm');
        }
    },







    async updateProduct(productId, productData) {
        try {

            
            const adminToken = localStorage.getItem('adminToken');
            if (!adminToken) {
                throw new Error('Không có token admin');
            }
            
            // Use server's supported endpoint first: PUT /api/admin/products/:id

            let response = await fetch(`/api/admin/products/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify(productData)
            });

            // Optional fallbacks (kept for backward compatibility)
            if (!response.ok) {

                response = await fetch(`/api/admin/products/update`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${adminToken}`
                    },
                    body: JSON.stringify({ ...productData, productId })
                });
            }
            if (!response.ok) {

                response = await fetch(`/api/admin/products/${productId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${adminToken}`
                    },
                    body: JSON.stringify(productData)
                });
            }

            if (!response.ok) {
                const errorMessage = await this.handleApiError(response);
                throw new Error(errorMessage);
            }
            
            const result = await response.json();

            
            this.showSuccess('Cập nhật sản phẩm thành công!');
            hideEditProductForm();
            this.loadProducts(); // Refresh products list
            
            return result;
            
        } catch (error) {
            console.error('❌ Error updating product:', error);
            this.showError(error.message || 'Lỗi khi cập nhật sản phẩm');
            throw error;
        }
    },

    // Category Management Functions
    showAddCategoryForm() {
        try {
            const form = document.getElementById('add-category-form');
            if (form) {
                form.style.display = 'block';

            } else {
                console.warn('⚠️ Add category form not found');
            }
        } catch (error) {
            console.error('Error showing add category form:', error);
        }
    },

    hideAddCategoryForm() {
        try {
            const form = document.getElementById('add-category-form');
            if (form) {
                form.style.display = 'none';

            }
        } catch (error) {
            console.error('Error hiding add category form:', error);
        }
    },

    async createCategory(categoryData) {
        try {

            const adminToken = localStorage.getItem('adminToken');
            if (!adminToken) {
                throw new Error('Không có token admin');
            }

            const response = await fetch('/api/admin/categories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify(categoryData)
            });

            if (!response.ok) {
                const errorMessage = await this.handleApiError(response);
                throw new Error(errorMessage);
            }

            const result = await response.json();

            
            // Refresh categories list
            await this.loadCategories();
            
            // Show success message
            this.showSuccess('Danh mục đã được tạo thành công!');
            
            return result;
        } catch (error) {
            console.error('❌ Error creating category:', error);
            this.showError('Lỗi khi tạo danh mục: ' + error.message);
            throw error;
        }
    },

    async deleteCategory(categoryId) {
        try {

            const adminToken = localStorage.getItem('adminToken');
            if (!adminToken) {
                throw new Error('Không có token admin');
            }

            if (!confirm('Bạn có chắc chắn muốn xóa danh mục này?')) {
                return false;
            }

            const response = await fetch(`/api/admin/categories/${categoryId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });

            if (!response.ok) {
                const errorMessage = await this.handleApiError(response);
                throw new Error(errorMessage);
            }


            
            // Refresh categories list
            await this.loadCategories();
            
            // Show success message
            this.showSuccess('Danh mục đã được xóa thành công!');
            
            return true;
        } catch (error) {
            console.error('❌ Error deleting category:', error);
            this.showError('Lỗi khi xóa danh mục: ' + error.message);
            return false;
        }
    },

    async editCategory(categoryId, categoryData) {
        try {

            
            // Show the edit form
            const editForm = document.getElementById('edit-category-form');
            if (!editForm) {
                throw new Error('Edit category form not found');
            }
            
            // Pre-fill the form with category data
            document.getElementById('edit-category-id').value = categoryId;
            document.getElementById('edit-category-name').value = categoryData.name || '';
            document.getElementById('edit-category-slug').value = categoryData.slug || '';
            document.getElementById('edit-category-description').value = categoryData.description || '';
            document.getElementById('edit-category-icon').value = categoryData.icon || '📦';
            
            // Update icon preview
            const iconPreview = document.getElementById('edit-current-icon');
            if (categoryData.icon) {
                if (categoryData.icon.startsWith('data:image') || categoryData.icon.startsWith('http')) {
                    iconPreview.innerHTML = `<img src="${categoryData.icon}" alt="Icon" style="width: 24px; height: 24px; object-fit: cover; border-radius: 4px;">`;
                } else {
                    iconPreview.textContent = categoryData.icon;
                }
            } else {
                iconPreview.textContent = '📦';
            }
            
            // Show the form
            editForm.style.display = 'block';
            
            // Hide add form if it's open
            this.hideAddCategoryForm();
            

            
        } catch (error) {
            console.error('❌ Error showing edit category form:', error);
            this.showError('Lỗi khi mở form sửa danh mục: ' + error.message);
        }
    },

    // Hide edit category form
    hideEditCategoryForm() {
        try {
            const form = document.getElementById('edit-category-form');
            if (form) {
                form.style.display = 'none';

            }
        } catch (error) {
            console.error('Error hiding edit category form:', error);
        }
    },

    // Update category via API
    async updateCategory(categoryId, categoryData) {
        try {

            const adminToken = localStorage.getItem('adminToken');
            if (!adminToken) {
                throw new Error('Không có token admin');
            }

            const response = await fetch(`/api/admin/categories/${categoryId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify(categoryData)
            });

            if (!response.ok) {
                const errorMessage = await this.handleApiError(response);
                throw new Error(errorMessage);
            }

            const result = await response.json();

            
            // Refresh categories list
            await this.loadCategories();
            
            // Hide edit form
            this.hideEditCategoryForm();
            
            // Show success message
            this.showSuccess('Danh mục đã được cập nhật thành công!');
            
            return result;
        } catch (error) {
            console.error('❌ Error updating category:', error);
            this.showError('Lỗi khi cập nhật danh mục: ' + error.message);
            throw error;
        }
    },

    // Display order details in modal
    displayOrderDetails(order) {
        const contentDiv = document.getElementById('order-details-content');
        if (!contentDiv) return;

        const orderDate = new Date(order.createdAt || order.orderDate).toLocaleDateString('vi-VN');
        const statusText = this.getOrderStatusText(order.status);
        const statusClass = this.getOrderStatusClass(order.status);

        // Resolve customer info with robust fallbacks
        const customer = order.customer || order.user || order.customerInfo || order.buyer || {};
        const customerName = customer.name || customer.fullName || customer.username || customer.displayName || order.customerName || 'N/A';
        const customerEmail = customer.email || order.customerEmail || 'N/A';
        const customerPhone = customer.phone || customer.tel || order.customerPhone || 'N/A';

        // Resolve address info (shipping/billing)
        const shippingObj = order.shipping || order.shippingAddress || order.address || {};
        const billingObj = order.billing || order.billingAddress || {};
        const shippingAddressText = this.formatAddress(shippingObj);
        const billingAddressText = this.formatAddress(billingObj);
        const hasBilling = billingAddressText && billingAddressText !== shippingAddressText;
        const orderNote = order.note || order.notes || order.customerNote || '';

        let itemsHTML = '';
        if (order.items && order.items.length > 0) {
            itemsHTML = `
                <table class="order-items-table">
                    <thead>
                        <tr>
                            <th>Sản phẩm</th>
                            <th>Số lượng</th>
                            <th>Đơn giá</th>
                            <th>Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => `
                            <tr>
                                <td>
                                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                                        ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">` : ''}
                                        <div>
                                            <div style="font-weight: 600;">${item.name}</div>
                                            ${item.variant ? `<div style="font-size: 0.875rem; color: #6b7280;">${item.variant}</div>` : ''}
                                        </div>
                                    </div>
                                </td>
                                <td>${item.quantity}</td>
                                <td>${this.formatCurrency(item.price)}</td>
                                <td><strong>${this.formatCurrency(item.price * item.quantity)}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        contentDiv.innerHTML = `
            <div class="order-details-section">
                <h4>📋 Thông tin Đơn hàng</h4>
                <div class="order-info-grid">
                    <div class="order-info-item">
                        <div class="order-info-label">Mã đơn hàng</div>
                        <div class="order-info-value"><strong>${order.orderNumber || order._id}</strong></div>
                    </div>
                    <div class="order-info-item">
                        <div class="order-info-label">Trạng thái</div>
                        <div class="order-info-value"><span class="status-badge ${statusClass}">${statusText}</span></div>
                    </div>
                    <div class="order-info-item">
                        <div class="order-info-label">Ngày đặt</div>
                        <div class="order-info-value">${orderDate}</div>
                    </div>
                    <div class="order-info-item">
                        <div class="order-info-label">Phương thức thanh toán</div>
                        <div class="order-info-value">${this.getPaymentMethodText(order.paymentMethod)}</div>
                    </div>
                </div>
            </div>

            <div class="order-details-section">
                <h4>👤 Thông tin Khách hàng</h4>
                <div class="order-info-grid">
                    <div class="order-info-item">
                        <div class="order-info-label">Họ tên</div>
                        <div class="order-info-value">${customerName}</div>
                    </div>
                    <div class="order-info-item">
                        <div class="order-info-label">Email</div>
                        <div class="order-info-value">${customerEmail}</div>
                    </div>
                    <div class="order-info-item">
                        <div class="order-info-label">Số điện thoại</div>
                        <div class="order-info-value">${customerPhone}</div>
                    </div>
                    <div class="order-info-item">
                        <div class="order-info-label">Địa chỉ giao hàng</div>
                        <div class="order-info-value">${shippingAddressText || 'N/A'}</div>
                    </div>
                    ${hasBilling ? `
                    <div class="order-info-item">
                        <div class="order-info-label">Địa chỉ thanh toán</div>
                        <div class="order-info-value">${billingAddressText}</div>
                    </div>` : ''}
                    ${orderNote ? `
                    <div class="order-info-item">
                        <div class="order-info-label">Ghi chú</div>
                        <div class="order-info-value">${orderNote}</div>
                    </div>` : ''}
                </div>
            </div>

            <div class="order-details-section">
                <h4>🛍️ Sản phẩm Đã mua</h4>
                ${itemsHTML || '<p>Không có sản phẩm nào</p>'}
            </div>

            <div class="order-details-section">
                <h4>💰 Tổng kết</h4>
                <div class="order-total">
                    <h4>Tổng thanh toán</h4>
                    <div class="total-row">
                        <span>Tạm tính:</span>
                        <span>${this.formatCurrency(order.subtotal || order.total)}</span>
                    </div>
                    ${order.shippingFee ? `
                        <div class="total-row">
                            <span>Phí vận chuyển:</span>
                            <span>${this.formatCurrency(order.shippingFee)}</span>
                        </div>
                    ` : ''}
                    ${order.discount ? `
                        <div class="total-row">
                            <span>Giảm giá:</span>
                            <span>-${this.formatCurrency(order.discount)}</span>
                        </div>
                    ` : ''}
                    <div class="total-row final">
                        <span>Tổng cộng:</span>
                        <span>${this.formatCurrency(order.total)}</span>
                    </div>
                </div>
            </div>
        `;
    },

    // Get mock order data for testing
    getMockOrderData(orderId) {
        const mockOrders = {
            'test1': {
                _id: 'test1',
                orderNumber: 'SS-TEST1',
                status: 'pending',
                createdAt: '2024-12-25T10:00:00Z',
                paymentMethod: 'cod',
                customer: {
                    name: 'Test User',
                    email: 'test@example.com',
                    phone: '0123456789'
                },
                shippingAddress: '123 Test Street, Test City, Test Province',
                items: [
                    {
                        name: 'Arduino Starter Kit',
                        variant: 'Basic Kit',
                        quantity: 1,
                        price: 100000,
                        image: '/images/products/arduino-starter.jpg'
                    }
                ],
                subtotal: 100000,
                shippingFee: 30000,
                discount: 0,
                total: 130000
            },
            'test2': {
                _id: 'test2',
                orderNumber: 'SS-TEST2',
                status: 'processing',
                createdAt: '2024-12-24T15:30:00Z',
                paymentMethod: 'stripe',
                customer: {
                    name: 'Admin User',
                    email: 'admin@example.com',
                    phone: '0987654321'
                },
                shippingAddress: '456 Admin Avenue, Admin City, Admin Province',
                items: [
                    {
                        name: 'Raspberry Pi 4',
                        variant: '4GB RAM',
                        quantity: 2,
                        price: 120000,
                        image: '/images/products/raspberry-pi4.jpg'
                    },
                    {
                        name: 'MicroSD Card 32GB',
                        variant: 'Class 10',
                        quantity: 1,
                        price: 10000,
                        image: '/images/products/microsd-32gb.jpg'
                    }
                ],
                subtotal: 250000,
                shippingFee: 50000,
                discount: 25000,
                total: 275000
            }
        };
        return mockOrders[orderId] || mockOrders['test1'];
    },

    // Close order details modal
    closeOrderDetails() {
        const modal = document.getElementById('order-details-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    // Print order details
    printOrderDetails() {
        const content = document.getElementById('order-details-content');
        if (content) {
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Chi tiết Đơn hàng</title>
                        <style>
                            body { font-family: Arial, sans-serif; margin: 20px; }
                            .order-details-section { margin-bottom: 20px; }
                            .order-details-section h4 { color: #333; border-bottom: 2px solid #007cba; padding-bottom: 5px; }
                            .order-info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 10px 0; }
                            .order-info-item { background: #f5f5f5; padding: 10px; border-left: 4px solid #007cba; }
                            .order-items-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                            .order-items-table th, .order-items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                            .order-items-table th { background: #f0f0f0; }
                            .order-total { background: #e3f2fd; border: 2px solid #2196f3; padding: 15px; margin: 10px 0; }
                        </style>
                    </head>
                    <body>
                        <h1>📦 Chi tiết Đơn hàng</h1>
                        ${content.innerHTML}
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        }
    },

    // Helper functions
    getOrderStatusText(status) {
        const statusMap = {
            'pending': 'Chờ xử lý',
            'processing': 'Đang xử lý',
            'shipped': 'Đã gửi hàng',
            'delivered': 'Đã giao hàng',
            'cancelled': 'Đã hủy'
        };
        return statusMap[status] || status;
    },

    getOrderStatusClass(status) {
        const classMap = {
            'pending': 'status-pending',
            'processing': 'status-processing',
            'shipped': 'status-shipped',
            'delivered': 'status-delivered',
            'cancelled': 'status-cancelled'
        };
        return classMap[status] || 'status-pending';
    },

    getPaymentMethodText(method) {
        const methodMap = {
            'stripe': 'Thẻ tín dụng (Stripe)',
            'paypal': 'PayPal',
            'vnpay': 'VNPay',
            'cod': 'Thanh toán khi nhận hàng'
        };
        return methodMap[method] || method || 'N/A';
    },

    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    },

    // Format address from various structures
    formatAddress(addr) {
        try {
            if (!addr) return '';
            if (typeof addr === 'string') return addr;
            const parts = [
                addr.addressLine || addr.address || addr.line1 || '',
                addr.line2 || '',
                addr.ward || addr.subdistrict || '',
                addr.district || addr.county || '',
                addr.city || addr.town || addr.province || '',
                addr.state || '',
                addr.postalCode || addr.zip || '',
                addr.country || 'VN'
            ].filter(Boolean);
            return parts.join(', ');
        } catch (e) {
            return '';
        }
    },

    // User Management Functions
    async loadUsers() {
        try {
            const response = await fetch('/api/users', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            const users = data.users || [];
            

            this.renderUsersTable(users);
            
        } catch (error) {
            console.error('❌ Error loading users:', error);
            this.showError('Không thể tải danh sách người dùng: ' + error.message);
        }
    },

    renderUsersTable(users) {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">Không có người dùng nào</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.username || 'N/A'}</td>
                <td>${user.email || 'N/A'}</td>
                <td>${user.fullname || user.fullName || 'N/A'}</td>
                <td>
                    <span class="role-badge role-${user.role || 'user'}">
                        ${this.getRoleLabel(user.role)}
                    </span>
                </td>
                <td>
                    <span class="status-badge status-${user.isActive ? 'active' : 'inactive'}">
                        ${user.isActive ? 'Hoạt động' : 'Không hoạt động'}
                    </span>
                </td>
                <td>${formatDate(user.createdAt)}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="adminDashboard.editUser('${user._id || user.id}')">Sửa</button>
                    <button class="btn btn-sm btn-danger" onclick="adminDashboard.deleteUser('${user._id || user.id}')">Xóa</button>
                </td>
            </tr>
        `).join('');
    },

    getRoleLabel(role) {
        const roleLabels = {
            'admin': 'Quản trị viên',
            'moderator': 'Điều hành viên',
            'user': 'Người dùng'
        };
        return roleLabels[role] || 'Người dùng';
    },

    showAddUserForm() {
        const form = document.getElementById('add-user-form');
        if (form) {
            form.style.display = 'block';
            // Reset form
            document.getElementById('user-form').reset();
        }
    },

    hideAddUserForm() {
        const form = document.getElementById('add-user-form');
        if (form) {
            form.style.display = 'none';
        }
    },

    showEditUserForm() {
        const form = document.getElementById('edit-user-form');
        if (form) {
            form.style.display = 'block';
        }
    },

    hideEditUserForm() {
        const form = document.getElementById('edit-user-form');
        if (form) {
            form.style.display = 'none';
        }
    },

    async editUser(userId) {
        try {

            const response = await fetch(`/api/users/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            const user = data.data || data;
            
            // Fill edit form
            document.getElementById('edit-user-id').value = user._id || user.id;
            document.getElementById('edit-user-username').value = user.username || '';
            document.getElementById('edit-user-email').value = user.email || '';
            document.getElementById('edit-user-role').value = user.role || 'user';
            document.getElementById('edit-user-fullname').value = user.fullname || user.fullName || '';
            document.getElementById('edit-user-phone').value = user.phone || '';
            document.getElementById('edit-user-address').value = user.address || '';
            document.getElementById('edit-user-active').checked = user.isActive !== false;
            
            this.showEditUserForm();
            
        } catch (error) {
            console.error('❌ Error loading user for edit:', error);
            alert('Không thể tải thông tin người dùng: ' + error.message);
        }
    },

    async deleteUser(userId) {
        if (!confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
            return;
        }
        
        try {

            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            await this.loadUsers(); // Reload users
            
        } catch (error) {
            console.error('❌ Error deleting user:', error);
            alert('Không thể xóa người dùng: ' + error.message);
        }
    },

    showError(message) {
        console.error('❌ Error:', message);
        // You can add a toast notification here
        alert(message);
    }
};

// Sidebar Panel Functionality
const sidebarPanel = {
    init() {
        try {

            this.initializeSidebarNavigation();
            this.initializeSubmenuToggle();
            this.initializeMobileSidebar();
            this.initializeHashHandling();
        } catch (error) {
            console.error('Error initializing sidebar panel:', error);
        }
    },

    // Initialize sidebar navigation
    initializeSidebarNavigation() {
        try {
            const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
            
            navLinks.forEach(link => {
                try {
                    link.addEventListener('click', (e) => {
                        try {
                            const href = link.getAttribute('href');
                            
                            // Handle hash navigation
                            if (href && href.startsWith('#') && href !== '#') {
                                e.preventDefault();
                                const tabId = href.substring(1);
                                this.showTabContent(tabId);
                                
                                // Update active nav link
                                navLinks.forEach(l => l.classList.remove('active'));
                                link.classList.add('active');
                            }
                        } catch (error) {
                            console.error('Error handling nav link click:', error);
                        }
                    });
                } catch (error) {
                    console.error('Error adding event listener to nav link:', error);
                }
            });
            
            // Initialize submenu links
            const submenuLinks = document.querySelectorAll('.submenu-link');
            submenuLinks.forEach(link => {
                try {
                    link.addEventListener('click', (e) => {
                        try {
                            const href = link.getAttribute('href');
                            
                            if (href && href.startsWith('#') && href !== '#') {
                                e.preventDefault();
                                const tabId = href.substring(1);
                                this.showTabContent(tabId);
                                
                                // Update active submenu link
                                submenuLinks.forEach(l => l.classList.remove('active'));
                                link.classList.add('active');
                                
                                // Also update parent nav link
                                const parentNavItem = link.closest('.nav-item');
                                if (parentNavItem) {
                                    const parentNavLink = parentNavItem.querySelector('.nav-link');
                                    navLinks.forEach(l => l.classList.remove('active'));
                                    if (parentNavLink) parentNavLink.classList.add('active');
                                }
                            }
                        } catch (error) {
                            console.error('Error handling submenu link click:', error);
                        }
                    });
                } catch (error) {
                    console.error('Error adding event listener to submenu link:', error);
                }
            });
        } catch (error) {
            console.error('Error initializing sidebar navigation:', error);
        }
    },

    // Initialize submenu toggle functionality
    initializeSubmenuToggle() {
        try {
            const submenuToggles = document.querySelectorAll('.nav-item.has-submenu > .nav-link');
            
            submenuToggles.forEach(toggle => {
                try {
                    toggle.addEventListener('click', (e) => {
                        try {
                            const href = toggle.getAttribute('href');
                            
                            // Only prevent default if it's a # link (submenu toggle)
                            if (href === '#') {
                                e.preventDefault();
                                const navItem = toggle.closest('.nav-item');
                                const submenu = navItem.querySelector('.submenu');
                                const arrow = toggle.querySelector('.nav-arrow');
                                
                                if (submenu) {
                                    const isOpen = submenu.style.display === 'block';
                                    
                                    if (isOpen) {
                                        submenu.style.display = 'none';
                                        navItem.classList.remove('active');
                                        if (arrow) arrow.style.transform = 'rotate(0deg)';
                                    } else {
                                        submenu.style.display = 'block';
                                        navItem.classList.add('active');
                                        if (arrow) arrow.style.transform = 'rotate(90deg)';
                                    }
                                }
                            }
                        } catch (error) {
                            console.error('Error handling submenu toggle:', error);
                        }
                    });
                } catch (error) {
                    console.error('Error adding event listener to submenu toggle:', error);
                }
            });
        } catch (error) {
            console.error('Error initializing submenu toggle:', error);
        }
    },

    // Initialize mobile sidebar toggle
    initializeMobileSidebar() {
        try {
            const toggleBtn = document.querySelector('.sidebar-toggle');
            const sidebar = document.querySelector('.admin-sidebar');
            
            if (toggleBtn && sidebar) {
                toggleBtn.addEventListener('click', () => {
                    try {
                        sidebar.classList.toggle('collapsed');
                    } catch (error) {
                        console.error('Error toggling mobile sidebar:', error);
                    }
                });
            }
        } catch (error) {
            console.error('Error initializing mobile sidebar:', error);
        }
    },

    showTabContent(tabId) {
        try {

            
            // Hide all tab contents
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => {
                try {
                    content.classList.remove('active');
                    content.style.display = 'none';
                } catch (error) {
                    console.error('Error hiding tab content:', error);
                }
            });
            
            // Show the selected tab content
            const targetContent = document.getElementById(tabId);
            if (targetContent) {
                targetContent.classList.add('active');
                targetContent.style.display = 'block';

            } else {
                console.warn('Tab content not found:', tabId);
            }
            
            // Load specific data for the tab
            this.loadTabData(tabId);
            
            // Update URL hash without triggering page reload
            if (window.location.hash !== `#${tabId}`) {
                window.history.pushState(null, null, `#${tabId}`);
            }
        } catch (error) {
            console.error('Error showing tab content:', error);
        }
    },

    // Load data for specific tab
    loadTabData(tabId) {
        try {

            
            switch (tabId) {
                case 'products':
                    adminDashboard.loadProducts();
                    break;
                case 'categories':
                    adminDashboard.loadCategories();
                    break;
                case 'tutorial-categories':
                    loadTutorialCategories();
                    break;
                case 'news-categories':
                    loadNewsCategories();
                    break;
                case 'tutorials':
                    loadTutorials();
                    break;
                case 'projects':
                    loadProjects();
                    break;
                case 'news':
                    loadAdminNews();
                    break;
                case 'courses':
                    // Courses tab has been removed from admin UI.
                    break;
                case 'dashboard':
                    adminDashboard.loadDashboardData();
                    break;
                default:

            }
        } catch (error) {
            console.error('Error loading tab data:', error);
        }
    },

    // Initialize hash change handling
    initializeHashHandling() {
        try {
            // Handle initial hash
            const initialHash = window.location.hash.substring(1) || 'dashboard';
            this.showTabContent(initialHash);
            
            // Handle hash changes (back/forward buttons)
            window.addEventListener('hashchange', (e) => {
                try {
                    const newHash = window.location.hash.substring(1) || 'dashboard';

                    this.showTabContent(newHash);
                } catch (error) {
                    console.error('Error handling hash change:', error);
                }
            });
            
            // Handle browser back/forward buttons
            window.addEventListener('popstate', (e) => {
                try {
                    const currentHash = window.location.hash.substring(1) || 'dashboard';

                    this.showTabContent(currentHash);
                } catch (error) {
                    console.error('Error handling popstate:', error);
                }
            });
        } catch (error) {
            console.error('Error initializing hash handling:', error);
        }
    },

    // Category Management Functions
    showAddCategoryForm() {
        try {
            const form = document.getElementById('add-category-form');
            if (form) {
                form.style.display = 'block';

            } else {
                console.warn('⚠️ Add category form not found');
            }
        } catch (error) {
            console.error('Error showing add category form:', error);
        }
    },

    hideAddCategoryForm() {
        try {
            const form = document.getElementById('add-category-form');
            if (form) {
                form.style.display = 'none';

            }
        } catch (error) {
            console.error('Error hiding add category form:', error);
        }
    },

    async createCategory(categoryData) {
        try {

            const adminToken = localStorage.getItem('adminToken');
            if (!adminToken) {
                throw new Error('Không có token admin');
            }

            const response = await fetch('/api/admin/categories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify(categoryData)
            });

            if (!response.ok) {
                const errorMessage = await this.handleApiError(response);
                throw new Error(errorMessage);
            }

            const result = await response.json();

            
            // Refresh categories list
            await this.loadCategories();
            
            // Show success message
            this.showSuccess('Danh mục đã được tạo thành công!');
            
            return result;
        } catch (error) {
            console.error('❌ Error creating category:', error);
            this.showError('Lỗi khi tạo danh mục: ' + error.message);
            throw error;
        }
    },

    async deleteCategory(categoryId) {
        try {

            const adminToken = localStorage.getItem('adminToken');
            if (!adminToken) {
                throw new Error('Không có token admin');
            }

            if (!confirm('Bạn có chắc chắn muốn xóa danh mục này?')) {
                return false;
            }

            const response = await fetch(`/api/admin/categories/${categoryId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });

            if (!response.ok) {
                const errorMessage = await this.handleApiError(response);
                throw new Error(errorMessage);
            }


            
            // Refresh categories list
            await this.loadCategories();
            
            // Show success message
            this.showSuccess('Danh mục đã được xóa thành công!');
            
            return true;
        } catch (error) {
            console.error('❌ Error deleting category:', error);
            this.showError('Lỗi khi xóa danh mục: ' + error.message);
            return false;
        }
    },

    async editCategory(categoryId, categoryData) {
        try {

            const adminToken = localStorage.getItem('adminToken');
            if (!adminToken) {
                throw new Error('Không có token admin');
            }

            const response = await fetch(`/api/admin/categories/${categoryId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify(categoryData)
            });

            if (!response.ok) {
                const errorMessage = await this.handleApiError(response);
                throw new Error(errorMessage);
            }

            const result = await response.json();

            
            // Refresh categories list
            await this.loadCategories();
            
            // Show success message
            this.showSuccess('Danh mục đã được cập nhật thành công!');
            
            return result;
        } catch (error) {
            console.error('❌ Error updating category:', error);
            this.showError('Lỗi khi cập nhật danh mục: ' + error.message);
            throw error;
        }
    }
};

// Helper function to load categories for product form
async function loadCategoriesForProductForm() {
    try {


        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
            console.error('❌ No admin token found');
            return;
        }



        const response = await fetch('/api/admin/categories', {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const categories = await response.json();

        
        // Load categories for add product form
        const categorySelect = document.getElementById('product-category');
        if (categorySelect) {
        // Clear existing options
        categorySelect.innerHTML = '<option value="">Chọn danh mục</option>';

        
        // Add category options
        let addedCount = 0;
        categories.forEach(category => {
            try {
                const option = document.createElement('option');
                option.value = category._id;
                option.textContent = category.name;
                categorySelect.appendChild(option);
                addedCount++;
    } catch (error) {
                console.error('❌ Error creating category option:', error);
            }
        });

        }
        
        // Load categories for edit product form
        const editCategorySelect = document.getElementById('edit-product-category');
        if (editCategorySelect) {
            // Clear existing options
            editCategorySelect.innerHTML = '<option value="">Chọn danh mục</option>';

            
            // Add category options
            let editAddedCount = 0;
            categories.forEach(category => {
                try {
                    const option = document.createElement('option');
                    option.value = category._id;
                    option.textContent = category.name;
                    editCategorySelect.appendChild(option);
                    editAddedCount++;
                } catch (error) {
                    console.error('❌ Error creating category option for edit form:', error);
                }
            });

        }
        

        
    } catch (error) {
        console.error('❌ Error loading categories for product form:', error);
        console.error('❌ Error details:', error.message);
    }
}

// Form Management Functions
function loadProductForm() {
    try {
        const form = document.getElementById('add-product-form');
        if (!form) {
            console.error('Product form not found');
            return;
        }

        // Reset form
        form.reset();
        
        // Reset image preview grid
        const imagePreviewGrid = document.getElementById('image-preview-grid');
        if (imagePreviewGrid) {
            imagePreviewGrid.innerHTML = '';

        }

        // Load categories for product form automatically

        loadCategoriesForProductForm();
        
        // Remove edit mode
        form.removeAttribute('data-edit-mode');
        

    } catch (error) {
        console.error('Error loading product form:', error);
    }
}

// Product Form Submit Functions
function initializeProductFormSubmit() {
    try {
        const productForm = document.getElementById('add-product-form');
        if (!productForm) {
            console.warn('Product form not found');
            return;
        }

        productForm.addEventListener('submit', handleProductFormSubmit);

    } catch (error) {
        console.error('Error initializing product form submit:', error);
    }
}

async function handleProductFormSubmit(event) {
    try {
        event.preventDefault();

        
        const form = event.target;
        const formData = new FormData(form);
        
        // Check if this is an update or create
        const isUpdate = window.editingProductId;


        
        // Get basic product data
        const productData = {
            name: formData.get('name') || '',
            slug: formData.get('slug') || '',
            description: adminDashboard.getRichTextContent('product-description') || '',
            fullDescription: adminDashboard.getRichTextContent('product-content') || '',
            price: parseFloat(formData.get('price')) || 0,
            stock: parseInt(formData.get('stock')) || 0,
            categoryId: formData.get('categoryId') || '',
            isActive: formData.get('isPublished') === 'true' || formData.get('isPublished') === 'on',
            metaTitle: formData.get('metaTitle') || '',
            metaDescription: formData.get('metaDescription') || '',
            keywords: formData.get('keywords') || '',
            weight: parseFloat(formData.get('weight')) || 0,
            length: parseFloat(formData.get('length')) || 0,
            width: parseFloat(formData.get('width')) || 0,
            height: parseFloat(formData.get('height')) || 0,
            features: formData.get('features') || ''
        };
        










        
        // Validate required fields
        if (!productData.name || !productData.categoryId) {
            throw new Error('Vui lòng điền đầy đủ thông tin bắt buộc (Tên, Danh mục)');
        }
        
        // Handle slug - generate if empty, clean if provided
        let cleanSlug = productData.slug;
        if (!cleanSlug || cleanSlug.trim() === '') {
            // If slug is empty, generate from product name
            cleanSlug = adminDashboard.generateSlug(productData.name);

        } else {
            // Clean existing slug
            cleanSlug = adminDashboard.generateSlug(cleanSlug);
        }
        
        if (cleanSlug !== productData.slug) {

            productData.slug = cleanSlug;
            // Update the form field
            const slugInput = document.getElementById('product-slug');
            if (slugInput) {
                slugInput.value = cleanSlug;
            }
        }
        
        // Validate slug format
        if (!/^[a-z0-9-]+$/.test(productData.slug)) {
            throw new Error('Slug chỉ được chứa chữ cái thường, số và dấu gạch ngang');
        }
        
        if (productData.slug.length < 3) {
            throw new Error('Slug phải có ít nhất 3 ký tự');
        }
        
        if (productData.price < 0) {
            throw new Error('Giá sản phẩm không được âm');
        }
        
        if (productData.stock < 0) {
            throw new Error('Số lượng tồn kho không được âm');
        }
        

        
        // Get images -> upload to server and convert to WebP
        const imageInput = document.getElementById('product-images');
        if (imageInput && imageInput.files && imageInput.files.length > 0) {

            
            // Show loading indicator
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = '⏳ Đang chuyển đổi ảnh...';
            submitBtn.disabled = true;
            
            try {
                const files = Array.from(imageInput.files);
                const webpUrls = await uploadImagesToWebP(files);
                productData.images = webpUrls;

                console.log('🖼️ Final product data before sending:', {
                    name: productData.name,
                    slug: productData.slug,
                    images: productData.images
                });
                
                // Restore button
                submitBtn.textContent = isUpdate ? '⏳ Đang cập nhật sản phẩm...' : '⏳ Đang tạo sản phẩm...';
                
            } catch (error) {
                // Restore button on error
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                throw error;
            }
        } else {
            // If editing and no new images, keep existing images
            if (isUpdate) {
                // Keep existing images from the product being edited
                // Get existing images from preview
                const previewImgs = document.querySelectorAll('#product-images-grid img');
                if (previewImgs.length > 0) {
                    productData.images = Array.from(previewImgs).map(img => img.getAttribute('src')).filter(Boolean);
                }
                // If no preview images, let server handle it (keep existing)
            } else {
                productData.images = [];
            }
        }
        
        // Create or update product
        let result;
        if (isUpdate) {

            result = await adminDashboard.updateProduct(window.editingProductId, productData);
        } else {

            result = await adminDashboard.createProduct(productData);
        }
        
        if (result) {
            if (isUpdate) {

            } else {

            }
            
            // Restore button state
            const submitBtn = form.querySelector('button[type="submit"]');
            if (isUpdate) {
                submitBtn.textContent = '✅ Cập nhật sản phẩm';
            } else {
            submitBtn.textContent = '✅ Tạo sản phẩm';
            }
            submitBtn.disabled = false;
            
            // Show success message - handled by adminDashboard methods
            // if (isUpdate) {
            //     alert('✅ Sản phẩm đã được cập nhật thành công!');
            // } else {
            //     alert('✅ Sản phẩm đã được tạo thành công!');
            // }
            
            // Reset form and hide it
            form.reset();
            const imagePreviewGrid = document.getElementById('image-preview-grid');
            if (imagePreviewGrid) {
                imagePreviewGrid.innerHTML = '';
            }
            adminDashboard.hideAddProductForm();
            
            // Clear editing state
            if (isUpdate) {
                window.editingProductId = null;
            }
            
            // Reload products list
            adminDashboard.loadProducts();
        }
        

        
    } catch (error) {
        console.error('❌ Error submitting product form:', error);
        alert('❌ Lỗi khi thêm sản phẩm: ' + error.message);
    }
}

// Image Upload and Preview Functions
function initializeImageUpload() {
    try {
        const imageInput = document.getElementById('product-images');
        if (!imageInput) {

            return;
        }

        imageInput.addEventListener('change', handleImageUpload);

    } catch (error) {
        console.error('Error initializing image upload:', error);
    }
}

// Helper: convert File objects to data URLs
async function filesToDataUrls(files) {
    const converters = files.map(file => new Promise((resolve, reject) => {
        try {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        } catch (e) {
            reject(e);
        }
    }));
    return Promise.all(converters);
}

// Helper: upload images to server and convert to WebP
async function uploadImagesToWebP(files) {
    try {
        const uploadPromises = files.map(async (file, index) => {
            try {
                const formData = new FormData();
                formData.append('image', file);
                
                // Generate a clean filename
                const baseName = file.name.replace(/[^a-zA-Z0-9-_]/g, '').replace(/\.[^/.]+$/, '') || 'image';
                formData.append('filename', `${baseName}-product-${index + 1}`);
                

                
                const response = await fetch('/api/admin/images/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                    },
                    body: formData
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Upload failed');
                }
                
                const result = await response.json();

                return result.url;
                
            } catch (error) {
                console.error(`❌ Failed to upload ${file.name}:`, error);
                throw new Error(`Không thể upload ảnh ${file.name}: ${error.message}`);
            }
        });
        
        const webpUrls = await Promise.all(uploadPromises);
        return webpUrls;
        
    } catch (error) {
        console.error('❌ Error uploading images:', error);
        throw error;
    }
}

function handleImageUpload(event) {
    try {
        const files = event.target.files;
        if (!files || files.length === 0) {

            return;
        }


        
        // Validate file count
        if (files.length > 5) {
            alert('❌ Chỉ được chọn tối đa 5 ảnh!');
            event.target.value = '';
            return;
        }

        // Validate file types and sizes
        const validFiles = Array.from(files).filter(file => {
            if (!file.type.startsWith('image/')) {
                console.warn(`❌ File ${file.name} không phải ảnh`);
                return false;
            }
            
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                console.warn(`❌ File ${file.name} quá lớn (>5MB)`);
                return false;
            }
            
            return true;
        });

        if (validFiles.length === 0) {
            alert('❌ Không có ảnh hợp lệ nào được chọn!');
            event.target.value = '';
            return;
        }


        createImagePreviews(validFiles);
        
    } catch (error) {
        console.error('Error handling image upload:', error);
        alert('❌ Lỗi khi xử lý ảnh: ' + error.message);
    }
}

function createImagePreviews(files) {
    try {
        const previewGrid = document.getElementById('image-preview-grid');
        if (!previewGrid) {
            console.error('Image preview grid not found');
            return;
        }

        // Clear existing previews
        previewGrid.innerHTML = '';
        
        files.forEach((file, index) => {
            try {
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const previewContainer = document.createElement('div');
                        previewContainer.className = 'image-preview-item';
                        previewContainer.innerHTML = `
                            <div class="image-preview-wrapper">
                                <img src="${e.target.result}" alt="Preview ${index + 1}" class="image-preview">
                                <div class="image-preview-overlay">
                                    <button type="button" class="remove-image-btn" onclick="removeImage(${index})" title="Xóa ảnh">✕</button>
                                    <span class="image-order">${index === 0 ? '🖼️ Chính' : index + 1}</span>
                                </div>
                                <div class="image-info">
                                    <span class="image-name">${file.name}</span>
                                    <span class="image-size">${(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                    <span class="image-format">→ WebP</span>
                                </div>
                            </div>
                        `;
                        previewGrid.appendChild(previewContainer);

                    } catch (error) {
                        console.error('Error creating preview container:', error);
                    }
                };
                reader.readAsDataURL(file);
                
            } catch (error) {
                console.error('Error processing file:', file.name, error);
            }
        });


        
    } catch (error) {
        console.error('Error creating image previews:', error);
    }
}

function removeImage(index) {
    try {

        
        const imageInput = document.getElementById('product-images');
        const previewGrid = document.getElementById('image-preview-grid');
        
        if (!imageInput || !previewGrid) {
            console.error('Required elements not found');
            return;
        }

        // Remove from preview grid
        const previewItems = previewGrid.querySelectorAll('.image-preview-item');
        if (previewItems[index]) {
            previewItems[index].remove();

        }

        // Create new FileList without the removed file
        const dt = new DataTransfer();
        const files = Array.from(imageInput.files);
        files.splice(index, 1);
        
        files.forEach(file => dt.items.add(file));
        imageInput.files = dt.files;
        

        
        // Reorder remaining previews
        reorderImagePreviews();
        
                } catch (error) {
        console.error('Error removing image:', error);
    }
}

function reorderImagePreviews() {
    try {
        const previewGrid = document.getElementById('image-preview-grid');
        if (!previewGrid) return;

        const previewItems = previewGrid.querySelectorAll('.image-preview-item');
        previewItems.forEach((item, index) => {
            try {
                const orderSpan = item.querySelector('.image-order');
                if (orderSpan) {
                    orderSpan.textContent = index === 0 ? '🖼️ Chính' : index + 1;
        }
    } catch (error) {
                console.error('Error updating order:', error);
            }
        });
        

        
    } catch (error) {
        console.error('Error reordering previews:', error);
    }
}

// Category Icon Upload Handler
function initializeCategoryIconUpload() {
    try {

        
        const iconFileInput = document.getElementById('category-icon-file');
        const iconPreview = document.getElementById('icon-preview');
        const currentIconSpan = document.getElementById('current-icon');
        const iconHiddenInput = document.getElementById('category-icon');
        
        if (!iconFileInput || !iconPreview || !currentIconSpan || !iconHiddenInput) {
            console.warn('⚠️ Category icon elements not found');
            return;
        }

        iconFileInput.addEventListener('change', handleCategoryIconUpload);

    } catch (error) {
        console.error('Error initializing category icon upload:', error);
    }
}

function handleCategoryIconUpload(event) {
    try {
        const file = event.target.files[0];
        if (!file) return;


        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('❌ Vui lòng chọn file ảnh!');
            event.target.value = '';
            return;
        }
        
        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('❌ File ảnh quá lớn! Tối đa 2MB.');
            event.target.value = '';
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const iconPreview = document.getElementById('icon-preview');
                const currentIconSpan = document.getElementById('current-icon');
                const iconHiddenInput = document.getElementById('category-icon');
                
                if (iconPreview && currentIconSpan && iconHiddenInput) {
                    // Store the image data URL in the hidden input
                    iconHiddenInput.value = e.target.result;
                    
                    // Update the preview to show the image
                    iconPreview.innerHTML = `<img src="${e.target.result}" alt="Icon Preview" style="width: 40px; height: 40px; object-fit: cover; border-radius: 8px;">`;
                    

                }
            } catch (error) {
                console.error('Error updating icon preview:', error);
            }
        };
        reader.readAsDataURL(file);
        
    } catch (error) {
        console.error('Error handling category icon upload:', error);
    }
}

// Category Form Submission Handler
function initializeCategoryFormSubmit() {
    try {

        const form = document.getElementById('category-form');
        if (!form) {
            console.warn('⚠️ Category form not found');
            return;
        }

        form.addEventListener('submit', handleCategoryFormSubmit);

    } catch (error) {
        console.error('Error initializing category form submit:', error);
    }
}

async function handleCategoryFormSubmit(event) {
    try {
        event.preventDefault();

        
        const form = event.target;
        const formData = new FormData(form);
        
        // Collect form data
        const categoryData = {
            name: formData.get('name') || '',
            slug: formData.get('slug') || '',
            icon: formData.get('icon') || '📦',
            description: formData.get('description') || ''
        };
        

        
        // Validate required fields
        if (!categoryData.name || !categoryData.slug) {
            throw new Error('Vui lòng điền đầy đủ thông tin bắt buộc (Tên, Slug)');
        }
        
        // Handle slug - generate if empty, clean if provided
        let cleanSlug = categoryData.slug;
        if (!cleanSlug || cleanSlug.trim() === '') {
            // If slug is empty, generate from category name
            cleanSlug = adminDashboard.generateSlug(categoryData.name);

        } else {
            // Clean existing slug
            cleanSlug = adminDashboard.generateSlug(cleanSlug);
        }
        
        if (cleanSlug !== categoryData.slug) {

            categoryData.slug = cleanSlug;
            // Update the form field
            const slugInput = document.getElementById('category-slug');
            if (slugInput) {
                slugInput.value = cleanSlug;
            }
        }
        
        // Validate slug format
        if (!/^[a-z0-9-]+$/.test(categoryData.slug)) {
            throw new Error('Slug chỉ được chứa chữ cái thường, số và dấu gạch ngang');
        }
        
        if (categoryData.slug.length < 3) {
            throw new Error('Slug phải có ít nhất 3 ký tự');
        }
        

        
        // Create category

        const result = await adminDashboard.createCategory(categoryData);
        
        if (result) {

            // Reset form and hide it
            form.reset();
            adminDashboard.hideAddCategoryForm();
        }
        

        
    } catch (error) {
        console.error('❌ Error submitting category form:', error);
        alert('❌ Lỗi khi thêm danh mục: ' + error.message);
    }
}

// Category Icon Upload Handler
function initializeCategoryIconUpload() {
    try {

        
        const iconFileInput = document.getElementById('category-icon-file');
        const iconPreview = document.getElementById('icon-preview');
        const currentIconSpan = document.getElementById('current-icon');
        const iconHiddenInput = document.getElementById('category-icon');
        
        if (!iconFileInput || !iconPreview || !currentIconSpan || !iconHiddenInput) {
            console.warn('⚠️ Category icon elements not found');
            return;
        }

        iconFileInput.addEventListener('change', handleCategoryIconUpload);

    } catch (error) {
        console.error('Error initializing category icon upload:', error);
    }
}

function handleCategoryIconUpload(event) {
    try {
        const file = event.target.files[0];
        if (!file) return;


        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('❌ Vui lòng chọn file ảnh!');
            event.target.value = '';
            return;
        }
        
        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('❌ File ảnh quá lớn! Tối đa 2MB.');
            event.target.value = '';
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const iconPreview = document.getElementById('icon-preview');
                const currentIconSpan = document.getElementById('current-icon');
                const iconHiddenInput = document.getElementById('category-icon');
                
                if (iconPreview && currentIconSpan && iconHiddenInput) {
                    // Store the image data URL in the hidden input
                    iconHiddenInput.value = e.target.result;
                    
                    // Update the preview to show the image
                    iconPreview.innerHTML = `<img src="${e.target.result}" alt="Icon Preview" style="width: 40px; height: 40px; object-fit: cover; border-radius: 8px;">`;
                    

                }
            } catch (error) {
                console.error('Error updating icon preview:', error);
            }
        };
        reader.readAsDataURL(file);
        
    } catch (error) {
        console.error('Error handling category icon upload:', error);
    }
}

// Category Form Submission Handler
function initializeCategoryFormSubmit() {
    try {

        const form = document.getElementById('category-form');
        if (!form) {
            console.warn('⚠️ Category form not found');
            return;
        }

        form.addEventListener('submit', handleCategoryFormSubmit);

    } catch (error) {
        console.error('Error initializing category form submit:', error);
    }
}

async function handleCategoryFormSubmit(event) {
    try {
        event.preventDefault();

        
        const form = event.target;
        const formData = new FormData(form);
        
        // Collect form data
        const categoryData = {
            name: formData.get('name') || '',
            slug: formData.get('slug') || '',
            icon: formData.get('icon') || '📦',
            description: formData.get('description') || ''
        };
        

        
        // Validate required fields
        if (!categoryData.name || !categoryData.slug) {
            throw new Error('Vui lòng điền đầy đủ thông tin bắt buộc (Tên, Slug)');
        }
        
        // Handle slug - generate if empty, clean if provided
        let cleanSlug = categoryData.slug;
        if (!cleanSlug || cleanSlug.trim() === '') {
            // If slug is empty, generate from category name
            cleanSlug = adminDashboard.generateSlug(categoryData.name);

        } else {
            // Clean existing slug
            cleanSlug = adminDashboard.generateSlug(cleanSlug);
        }
        
        if (cleanSlug !== categoryData.slug) {

            categoryData.slug = cleanSlug;
            // Update the form field
            const slugInput = document.getElementById('category-slug');
            if (slugInput) {
                slugInput.value = cleanSlug;
            }
        }
        
        // Validate slug format
        if (!/^[a-z0-9-]+$/.test(categoryData.slug)) {
            throw new Error('Slug chỉ được chứa chữ cái thường, số và dấu gạch ngang');
        }
        
        if (categoryData.slug.length < 3) {
            throw new Error('Slug phải có ít nhất 3 ký tự');
        }
        

        
        // Create category

        const result = await adminDashboard.createCategory(categoryData);
        
        if (result) {

            // Reset form and hide it
            form.reset();
            adminDashboard.hideAddCategoryForm();
        }
        

        
    } catch (error) {
        console.error('❌ Error submitting category form:', error);
        alert('❌ Lỗi khi thêm danh mục: ' + error.message);
    }
}

// Edit Product Form Submission Handler
function initializeEditProductFormSubmit() {
    try {

        const form = document.getElementById('edit-product-form-content');
        if (!form) {

            return;
        }

        // form.addEventListener('submit', handleEditProductFormSubmit); // Removed - using handleProductFormSubmit instead

    } catch (error) {
        console.error('Error initializing edit product form submit:', error);
    }
}

async function handleEditProductFormSubmit(event) {
    try {
        event.preventDefault();

        
        const form = event.target;
        const formData = new FormData(form);
        
        // Get product ID
        const productId = formData.get('productId');
        if (!productId) {
            throw new Error('Không có ID sản phẩm để cập nhật');
        }
        
        // Get basic product data
        const productData = {
            name: formData.get('name') || '',
            slug: formData.get('slug') || '',
            description: adminDashboard.getRichTextContent('edit-product-description') || '',
            fullDescription: adminDashboard.getRichTextContent('edit-product-full-description') || '',
            price: parseFloat(formData.get('price')) || 0,
            originalPrice: parseFloat(formData.get('originalPrice')) || 0,
            sku: formData.get('sku') || '',
            stock: parseInt(formData.get('stock')) || 0,
            categoryId: formData.get('categoryId') || '',
            isActive: formData.get('isActive') === 'true',
            tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag) : [],
            metaTitle: formData.get('metaTitle') || '',
            metaDescription: formData.get('metaDescription') || '',
            keywords: formData.get('keywords') || '',
            weight: parseFloat(formData.get('weight')) || 0,
            length: parseFloat(formData.get('length')) || 0,
            width: parseFloat(formData.get('width')) || 0,
            height: parseFloat(formData.get('height')) || 0,
            features: formData.get('features') || ''
        };
        

        
        // Validate required fields
        if (!productData.name || !productData.categoryId) {
            throw new Error('Vui lòng điền đầy đủ thông tin bắt buộc (Tên, Danh mục)');
        }
        
        // Validate rich text content
        if (!productData.description || productData.description.trim() === '') {
            throw new Error('Vui lòng nhập mô tả sản phẩm');
        }
        
        // Handle slug - generate if empty, clean if provided
        let cleanSlug = productData.slug;
        if (!cleanSlug || cleanSlug.trim() === '') {
            cleanSlug = adminDashboard.generateSlug(productData.name);

        } else {
            cleanSlug = adminDashboard.generateSlug(cleanSlug);
        }
        
        if (cleanSlug !== productData.slug) {

            productData.slug = cleanSlug;
            // Update the form field
            const slugInput = document.getElementById('edit-product-slug');
            if (slugInput) {
                slugInput.value = cleanSlug;
            }
        }
        
        // Validate slug format
        if (!/^[a-z0-9-]+$/.test(productData.slug)) {
            throw new Error('Slug chỉ được chứa chữ cái thường, số và dấu gạch ngang');
        }
        
        if (productData.slug.length < 3) {
            throw new Error('Slug phải có ít nhất 3 ký tự');
        }
        
        if (productData.price < 0) {
            throw new Error('Giá sản phẩm không được âm');
        }
        
        if (productData.stock < 0) {
            throw new Error('Số lượng tồn kho không được âm');
        }
        

        
        // Collect images for update:
        // - If new files selected in edit input, UPLOAD and convert to WebP via API (/api/admin/images/upload)
        // - Else, reuse current preview image URLs
        // - If existing URLs are not WebP, convert them via /api/admin/images/convert and replace urls
        try {
            const editImageInput = document.getElementById('product-images');
            let images = [];
            if (editImageInput && editImageInput.files && editImageInput.files.length > 0) {

                const files = Array.from(editImageInput.files);
                images = await uploadImagesToWebP(files);

            } else {
                const previewImgs = document.querySelectorAll('#product-images-grid img');
                images = Array.from(previewImgs).map(img => img.getAttribute('src')).filter(Boolean);

                // Convert non-webp images
                const converted = [];
                for (const url of images) {
                    if (typeof url === 'string' && !url.toLowerCase().endsWith('.webp')) {
                        try {
                            const resp = await fetch('/api/admin/images/convert', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                                },
                                body: JSON.stringify({ url })
                            });
                            if (resp.ok) {
                                const data = await resp.json();

                                converted.push(data.url);
                            } else {
                                console.warn('⚠️ Convert failed, keep original:', url);
                                converted.push(url);
                            }
                        } catch (e) {
                            console.warn('⚠️ Convert error, keep original:', url, e);
                            converted.push(url);
                        }
                    } else {
                        converted.push(url);
                    }
                }
                images = converted;
            }
            productData.images = images;
        } catch (imgErr) {
            console.error('❌ Error collecting/editing images:', imgErr);
        }

        // Update product

        const result = await adminDashboard.updateProduct(productId, productData);
        
        if (result) {

            // Hide form and refresh products list
            adminDashboard.hideEditProductForm();
            adminDashboard.loadProducts();
        }
        

        
    } catch (error) {
        console.error('❌ Error submitting edit product form:', error);
        alert('❌ Lỗi khi cập nhật sản phẩm: ' + error.message);
    }
}

// Edit Product Image Upload Handler
function initializeEditProductImageUpload() {
    try {

        
        const imageInput = document.getElementById('edit-product-images');
        if (!imageInput) {

            return;
        }

        imageInput.addEventListener('change', handleEditProductImageUpload);

    } catch (error) {
        console.error('Error initializing edit product image upload:', error);
    }
}

function handleEditProductImageUpload(event) {
    try {
        const files = event.target.files;
        if (!files || files.length === 0) {

            return;
        }


        
        // Validate file count
        if (files.length > 5) {
            alert('❌ Chỉ được chọn tối đa 5 ảnh!');
            event.target.value = '';
            return;
        }

        // Validate file types and sizes
        const validFiles = Array.from(files).filter(file => {
            if (!file.type.startsWith('image/')) {
                console.warn(`❌ File ${file.name} không phải ảnh`);
                return false;
            }
            
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                console.warn(`❌ File ${file.name} quá lớn (>5MB)`);
                return false;
            }
            
            return true;
        });

        if (validFiles.length === 0) {
            alert('❌ Không có ảnh hợp lệ nào được chọn!');
            event.target.value = '';
            return;
        }


        createEditProductImagePreviews(validFiles);
        
    } catch (error) {
        console.error('Error handling edit product image upload:', error);
        alert('❌ Lỗi khi xử lý ảnh edit: ' + error.message);
    }
}

function createEditProductImagePreviews(files) {
    try {
        const previewGrid = document.getElementById('edit-image-preview-grid');
        if (!previewGrid) {
            console.error('Edit image preview grid not found');
            return;
        }

        // Clear existing previews
        previewGrid.innerHTML = '';
        
        files.forEach((file, index) => {
            try {
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const previewContainer = document.createElement('div');
                        previewContainer.className = 'image-preview-item';
                        previewContainer.innerHTML = `
                            <div class="image-preview-wrapper">
                                <img src="${e.target.result}" alt="Edit Preview ${index + 1}" class="image-preview">
                                <div class="image-preview-overlay">
                                    <button type="button" class="remove-image-btn" onclick="adminDashboard.removeEditImage(${index})" title="Xóa ảnh">✕</button>
                                    <span class="image-order">${index === 0 ? '🖼️ Chính' : index + 1}</span>
                                </div>
                                <div class="image-info">
                                    <span class="image-name">${file.name}</span>
                                    <span class="image-size">${(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                </div>
                            </div>
                        `;
                        previewGrid.appendChild(previewContainer);

                    } catch (error) {
                        console.error('Error creating edit preview container:', error);
                    }
                };
                reader.readAsDataURL(file);
                
            } catch (error) {
                console.error('Error processing edit file:', file.name, error);
            }
        });


        
    } catch (error) {
        console.error('Error creating edit image previews:', error);
    }
}

// Admin logout (avoid polluting global `logout` used by user auth)
function adminLogout() {
    try {
        localStorage.removeItem('adminToken');

    } catch (error) {
        console.error('Error during admin logout:', error);
    } finally {
        window.location.href = '/admin-login.html';
    }
}
// Expose a namespaced version for templates if needed
window.adminLogout = adminLogout;

// ===== TUTORIAL CATEGORIES MANAGEMENT =====

// Show add tutorial category form
function showAddTutorialCategoryForm() {
    try {
        const form = document.getElementById('add-tutorial-category-form');
        if (form) {
            form.style.display = 'block';
            
            // Setup form event listeners
            setupTutorialCategoryFormListeners();
            

        } else {
            console.warn('⚠️ Add tutorial category form not found');
        }
    } catch (error) {
        console.error('Error showing add tutorial category form:', error);
    }
}

// Setup tutorial category form event listeners
function setupTutorialCategoryFormListeners() {
    try {
        // Form submit handler
        const form = document.getElementById('tutorial-category-form');
        if (form) {
            form.addEventListener('submit', handleTutorialCategorySubmit);
        }
        
        // Icon preview handler
        const iconInput = document.getElementById('tutorial-category-icon');
        if (iconInput) {
            iconInput.addEventListener('input', updateTutorialIconPreview);
        }
        
        // Color preview handler
        const colorInput = document.getElementById('tutorial-category-color');
        if (colorInput) {
            colorInput.addEventListener('input', updateTutorialColorPreview);
        }
        
        // Auto-generate slug from name
        const nameInput = document.getElementById('tutorial-category-name');
        if (nameInput) {
            nameInput.addEventListener('input', autoGenerateTutorialSlug);
        }
        

    } catch (error) {
        console.error('Error setting up tutorial category form listeners:', error);
    }
}

// Handle tutorial category form submit
async function handleTutorialCategorySubmit(event) {
    try {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        
        const categoryData = {
            name: formData.get('name'),
            description: formData.get('description'),
            slug: formData.get('slug'),
            icon: formData.get('icon'),
            color: formData.get('color'),
            level: formData.get('level'),
            subject: formData.get('subject'),
            sortOrder: parseInt(formData.get('sortOrder')) || 0,
            requirements: formData.get('requirements'),
            isActive: formData.get('tutorial-isActive') === 'true'
        };
        
        // Validate required fields
        if (!categoryData.name || !categoryData.slug) {
            alert('Vui lòng điền đầy đủ tên danh mục và slug');
            return;
        }
        
        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '⏳ Đang lưu...';
        submitBtn.disabled = true;
        
        const response = await fetch('/api/admin/tutorial-categories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify(categoryData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('Thêm danh mục bài giảng thành công!');
            hideAddTutorialCategoryForm();
            loadTutorialCategories();
            loadAdminStats();
        } else {
            alert(`Lỗi: ${result.error}`);
        }
        
    } catch (error) {
        console.error('Error submitting tutorial category:', error);
        alert('Lỗi khi thêm danh mục bài giảng');
    } finally {
        // Reset button state
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '💾 Lưu danh mục bài giảng';
            submitBtn.disabled = false;
        }
    }
}

// Update tutorial icon preview
function updateTutorialIconPreview(event) {
    try {
        const icon = event.target.value || '📚';
        const preview = document.getElementById('tutorial-icon-preview');
        if (preview) {
            preview.textContent = icon;
        }
    } catch (error) {
        console.error('Error updating tutorial icon preview:', error);
    }
}

// Update tutorial color preview
function updateTutorialColorPreview(event) {
    try {
        const color = event.target.value;
        const preview = document.getElementById('tutorial-color-preview');
        if (preview) {
            preview.style.backgroundColor = color;
        }
    } catch (error) {
        console.error('Error updating tutorial color preview:', error);
    }
}

// Auto-generate tutorial slug from name
function autoGenerateTutorialSlug(event) {
    try {
        const name = event.target.value;
        const slugInput = document.getElementById('tutorial-category-slug');
        
        if (slugInput && name) {
            // Generate slug from name
            const slug = name
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
                .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
                .replace(/\s+/g, '-') // Replace spaces with hyphens
                .replace(/-+/g, '-') // Replace multiple hyphens with single
                .trim();
            
            slugInput.value = slug;
        }
    } catch (error) {
        console.error('Error auto-generating tutorial slug:', error);
    }
}

// Hide add tutorial category form
function hideAddTutorialCategoryForm() {
    try {
        const form = document.getElementById('add-tutorial-category-form');
        if (form) {
            form.style.display = 'none';
            
            // Reset form
            const tutorialForm = document.getElementById('tutorial-category-form');
            if (tutorialForm) {
                tutorialForm.reset();
                
                // Reset preview elements
                const iconPreview = document.getElementById('tutorial-icon-preview');
                if (iconPreview) {
                    iconPreview.textContent = '📚';
                }
                
                const colorPreview = document.getElementById('tutorial-color-preview');
                if (colorPreview) {
                    colorPreview.style.backgroundColor = '#8b5cf6';
                }
            }
            

        }
    } catch (error) {
        console.error('Error hiding add tutorial category form:', error);
    }
}

// Add tutorial category
async function addTutorialCategory() {
    try {
        const form = document.getElementById('add-tutorial-category-form');
        const formData = new FormData(form);
        
        const categoryData = {
            name: formData.get('name'),
            description: formData.get('description'),
            slug: formData.get('slug'),
            icon: formData.get('icon'),
            color: formData.get('color')
        };
        
        // Validate required fields
        if (!categoryData.name || !categoryData.slug) {
            alert('Vui lòng điền đầy đủ tên danh mục và slug');
            return;
        }
        
        const response = await fetch('/api/admin/tutorial-categories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify(categoryData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('Thêm danh mục bài giảng thành công!');
            hideAddTutorialCategoryForm();
            loadTutorialCategories();
            loadAdminStats();
        } else {
            alert(`Lỗi: ${result.error}`);
        }
        
    } catch (error) {
        console.error('Error adding tutorial category:', error);
        alert('Lỗi khi thêm danh mục bài giảng');
    }
}

// Load tutorial categories
async function loadTutorialCategories() {
    try {
        const response = await fetch('/api/tutorial-categories');
        const categories = await response.json();
        
        const tbody = document.getElementById('tutorial-categories-table-body');
        if (!tbody) return;
        
        if (categories.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">Chưa có danh mục bài giảng nào</td></tr>';
            return;
        }
        
        tbody.innerHTML = categories.map(category => `
            <tr>
                <td>
                    <div class="category-info">
                        <span class="category-icon" style="color: ${category.color}">${category.icon}</span>
                        <div class="category-details">
                            <span class="category-name">${category.name}</span>
                            <div class="category-meta">
                                <span class="category-level">${getLevelText(category.level)}</span>
                                <span class="category-subject">${getSubjectText(category.subject)}</span>
                            </div>
                        </div>
                    </div>
                </td>
                <td>${category.description || '-'}</td>
                <td><code>${category.slug}</code></td>
                <td>
                    <span class="status-badge ${category.isActive ? 'status-active' : 'status-inactive'}">
                        ${category.isActive ? 'Hoạt động' : 'Không hoạt động'}
                    </span>
                </td>
                <td>0</td>
                <td>
                    <div class="action-buttons">
                        <button class="edit-btn" onclick="editTutorialCategory('${category._id}')" title="Sửa">
                            <span>✏️</span>
                        </button>
                        <button class="delete-btn" onclick="deleteTutorialCategory('${category._id}')" title="Xóa">
                            <span>🗑️</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        

        
    } catch (error) {
        console.error('Error loading tutorial categories:', error);
        const tbody = document.getElementById('tutorial-categories-table-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="error">Lỗi khi tải danh mục bài giảng</td></tr>';
        }
    }
}

// Edit tutorial category
async function editTutorialCategory(categoryId) {
    try {
        // Get category data
        const response = await fetch('/api/tutorial-categories');
        const categories = await response.json();
        const category = categories.find(cat => cat._id === categoryId);
        
        if (!category) {
            alert('Không tìm thấy danh mục bài giảng');
            return;
        }
        
        // Show edit form (you can create a modal or inline edit)
        const newName = prompt('Tên danh mục mới:', category.name);
        if (!newName) return;
        
        const newDescription = prompt('Mô tả mới:', category.description || '');
        const newSlug = prompt('Slug mới:', category.slug);
        if (!newSlug) return;
        
        const newIcon = prompt('Icon mới:', category.icon);
        const newColor = prompt('Màu mới (hex):', category.color);
        
        const updateData = {
            name: newName,
            description: newDescription,
            slug: newSlug,
            icon: newIcon,
            color: newColor
        };
        
        const updateResponse = await fetch(`/api/admin/tutorial-categories/${categoryId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify(updateData)
        });
        
        const result = await updateResponse.json();
        
        if (updateResponse.ok) {
            alert('Cập nhật danh mục bài giảng thành công!');
            loadTutorialCategories();
        } else {
            alert(`Lỗi: ${result.error}`);
        }
        
    } catch (error) {
        console.error('Error editing tutorial category:', error);
        alert('Lỗi khi sửa danh mục bài giảng');
    }
}

// Delete tutorial category
async function deleteTutorialCategory(categoryId) {
    try {
        if (!confirm('Bạn có chắc chắn muốn xóa danh mục bài giảng này?')) {
            return;
        }
        
        const response = await fetch(`/api/admin/tutorial-categories/${categoryId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('Xóa danh mục bài giảng thành công!');
            loadTutorialCategories();
            loadAdminStats();
        } else {
            alert(`Lỗi: ${result.error}`);
        }
        
    } catch (error) {
        console.error('Error deleting tutorial category:', error);
        alert('Lỗi khi xóa danh mục bài giảng');
    }
}

// Helper functions for tutorial categories
function getLevelText(level) {
    const levels = {
        'beginner': 'Cơ bản',
        'intermediate': 'Trung cấp',
        'advanced': 'Nâng cao',
        'expert': 'Chuyên sâu'
    };
    return levels[level] || 'Cơ bản';
}

function getSubjectText(subject) {
    const subjects = {
        'programming': 'Lập trình',
        'electronics': 'Điện tử',
        'robotics': 'Robot',
        'ai': 'Trí tuệ nhân tạo',
        'math': 'Toán học',
        'science': 'Khoa học',
        'engineering': 'Kỹ thuật',
        'other': 'Khác'
    };
    return subjects[subject] || 'Lập trình';
}

// Load admin stats
async function loadAdminStats() {
    try {
        const response = await fetch('/api/admin/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            
            // Update products count
            const productsElement = document.getElementById('total-products');
            if (productsElement) {
                productsElement.textContent = stats.products || stats.totalProducts || 0;
            }

            // Update categories count
            const categoriesElement = document.getElementById('total-categories');
            if (categoriesElement) {
                categoriesElement.textContent = stats.categories || stats.totalCategories || 0;
            }

            // Update tutorial categories count
            const tutorialCategoriesElement = document.getElementById('total-tutorial-categories');
            if (tutorialCategoriesElement) {
                tutorialCategoriesElement.textContent = stats.tutorialCategories || stats.totalTutorialCategories || 0;
            }

            // Update news categories count
            const newsCategoriesElement = document.getElementById('total-news-categories');
            if (newsCategoriesElement) {
                newsCategoriesElement.textContent = stats.newsCategories || stats.totalNewsCategories || 0;
            }
            
            // Update tutorials count
            const tutorialsElement = document.getElementById('total-tutorials');
            if (tutorialsElement) {
                tutorialsElement.textContent = stats.tutorials || stats.totalTutorials || 0;
            }

            // Update projects count
            const projectsElement = document.getElementById('total-projects');
            if (projectsElement) {
                projectsElement.textContent = stats.projects || 0;
            }
            

        }
    } catch (error) {
        console.error('Error loading admin stats:', error);
    }
}

// ===== TUTORIALS MANAGEMENT =====

// Show add tutorial form
function showAddTutorialForm() {
    try {
        console.log('🚀 BẮT ĐẦU MỞ FORM THÊM BÀI GIẢNG');
        
        // Clear editing state
        window.editingTutorialId = null;
        
        const form = document.getElementById('add-tutorial-form');
        if (form) {
            console.log('✅ Tìm thấy form, đang hiển thị...');
            form.style.display = 'block';
            form.scrollIntoView({ behavior: 'smooth' });
            
            // Reset form title
            const formTitle = document.querySelector('#add-tutorial-form h3');
            if (formTitle) {
                formTitle.textContent = '📝 Thêm Bài giảng Mới';
            }
            
            // Setup form event listeners
            setupTutorialFormListeners();
            
            // Load tutorial categories
            console.log('🔄 ĐANG GỌI loadTutorialCategoriesForForm()...');
            loadTutorialCategoriesForForm();
            
            // Reset form to add mode
            resetFormToAddMode();
            
            // Clear form
            const tutorialForm = document.getElementById('tutorial-form');
            if (tutorialForm) {
                tutorialForm.reset();
            }

        } else {
            console.warn('⚠️ Add tutorial form not found');
        }
    } catch (error) {
        console.error('Error showing add tutorial form:', error);
        alert('Lỗi khi hiển thị form thêm bài giảng');
    }
}

// ===== PROJECTS (FEATURED) MANAGEMENT =====
function showAddProjectForm() {
    try {
        const form = document.getElementById('add-project-form');
        if (form) {
            form.style.display = 'block';
            // attach submit handler once
            const projectForm = document.getElementById('project-form');
            if (projectForm && !projectForm.dataset.bound) {
                projectForm.addEventListener('submit', handleProjectSubmit);
                projectForm.dataset.bound = 'true';
            }
            // init rich text editor for project description
            initializeProjectRichTextEditor();
        }
    } catch (error) {
        console.error('Error showing add project form:', error);
    }
}

function hideAddProjectForm() {
    try {
        const form = document.getElementById('add-project-form');
        if (form) {
            form.style.display = 'none';
            const projectForm = document.getElementById('project-form');
            if (projectForm) projectForm.reset();
        }
    } catch (error) {
        console.error('Error hiding add project form:', error);
    }
}

async function handleProjectSubmit(event) {
    try {
        event.preventDefault();
        const form = event.target;
        // sync editor HTML to hidden input
        try {
            const editor = document.getElementById('project-content');
            const hidden = document.getElementById('project-content-hidden');
            if (editor && hidden) hidden.value = editor.innerHTML;
        } catch(_) {}
        const data = new FormData(form);
        const project = {
            name: data.get('name'),
            description: data.get('description'), // HTML
            slug: data.get('slug'),
            shortDescription: data.get('shortDescription'),
            tags: data.get('tags') ? data.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag) : [],
            duration: data.get('duration'),
            link: data.get('link'),
            category: data.get('category'),
            level: data.get('level'),
            price: parseInt(data.get('price')) || 0,
            seo: {
                title: data.get('seoTitle') || '',
                description: data.get('seoDescription') || '',
                keywords: data.get('seoKeywords') ? data.get('seoKeywords').split(',').map(k => k.trim()).filter(k => k) : [],
                canonical: data.get('canonical') || '',
                ogTitle: data.get('ogTitle') || '',
                ogDescription: data.get('ogDescription') || '',
                ogImage: data.get('ogImage') || ''
            }
        };
        if (!project.name) {
            alert('Vui lòng nhập tên dự án');
            return;
        }
        alert('Chức năng lưu dự án sẽ được bật sau khi thêm API.');
        hideAddProjectForm();
    } catch (error) {
        console.error('Error submitting project:', error);
        alert('Lỗi khi lưu dự án');
    }
}

// Handle edit project form submit
async function handleEditProjectSubmit(event) {
    try {
        event.preventDefault();
        const form = event.target;
        
        // Sync editor HTML to hidden input
        try {
            const editor = document.getElementById('edit-project-content');
            const hidden = document.getElementById('edit-project-content-hidden');
            if (editor && hidden) hidden.value = editor.innerHTML;
        } catch(_) {}
        
        const data = new FormData(form);
        const project = {
            name: data.get('name'),
            description: data.get('description'), // HTML
            slug: data.get('slug'),
            shortDescription: data.get('shortDescription'),
            tags: data.get('tags') ? data.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag) : [],
            duration: data.get('duration'),
            link: data.get('link'),
            category: data.get('category'),
            level: data.get('level'),
            price: parseInt(data.get('price')) || 0,
            seo: {
                title: data.get('seoTitle') || '',
                description: data.get('seoDescription') || '',
                keywords: data.get('seoKeywords') ? data.get('seoKeywords').split(',').map(k => k.trim()).filter(k => k) : [],
                canonical: data.get('canonical') || '',
                ogTitle: data.get('ogTitle') || '',
                ogDescription: data.get('ogDescription') || '',
                ogImage: data.get('ogImage') || ''
            }
        };
        
        if (!project.name) {
            alert('Vui lòng nhập tên dự án');
            return;
        }
        
        if (!window.editingProjectId) {
            alert('Không tìm thấy ID dự án cần sửa');
            return;
        }
        
        // Send update request
        const response = await fetch(`/api/admin/projects/${window.editingProjectId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify(project)
        });
        
        if (response.ok) {
            alert('Cập nhật dự án thành công!');
            hideEditProjectForm();
            loadProjects(); // Reload projects list
        } else {
            const error = await response.json();
            alert('Lỗi: ' + (error.error || 'Không thể cập nhật dự án'));
        }
        
    } catch (error) {
        console.error('Error updating project:', error);
        alert('Lỗi khi cập nhật dự án');
    }
}

// Project Rich Text Editor init
function initializeProjectRichTextEditor() {
    try {
        // Initialize both add and edit forms
        initializeProjectEditor('project-content', 'project-editor-toolbar');
        initializeProjectEditor('edit-project-content', 'edit-project-editor-toolbar');
    } catch (error) {
        console.error('Error initializing project rich text editor:', error);
    }
}

function initializeProjectEditor(editorId, toolbarId) {
    try {
        const editor = document.getElementById(editorId);
        const toolbar = document.getElementById(toolbarId);
        if (!editor || !toolbar) return;
        
        // Check if already initialized
        if (editor.dataset.initialized === 'true') return;

        // Delegate to the same executor used for tutorials
        toolbar.addEventListener('click', function(e) {
            if (e.target.classList.contains('toolbar-btn')) {
                e.preventDefault();
                const button = e.target;
                const command = button.getAttribute('data-command');
                executeEditorCommand(command, editor, button);
            }
        });

        // Sync hidden input on input
        editor.addEventListener('input', function() {
            const hidden = document.getElementById(editorId + '-hidden');
            if (hidden) hidden.value = editor.innerHTML;
        });

        // Reuse paste handler (upload + alt from filename)
        editor.addEventListener('paste', function(e) {
            e.preventDefault();
            const clipboardData = e.clipboardData || window.clipboardData;
            const items = clipboardData && clipboardData.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.type.indexOf('image') !== -1) {
                    const file = item.getAsFile();
                    if (file) { handleImagePaste(file, editor); return; }
                }
            }
            const text = clipboardData.getData('text/plain');
            if (text) { document.execCommand('insertText', false, text); }
        });
        
        // Add keyboard shortcuts
        addEditorKeyboardShortcuts(editor);
        
        // Mark as initialized
        editor.dataset.initialized = 'true';

        // paste image support
        editor.addEventListener('paste', async (e) => {
            try {
                const items = e.clipboardData && e.clipboardData.items;
                if (!items) return;
                for (const item of items) {
                    if (item.type && item.type.indexOf('image') !== -1) {
                        e.preventDefault();
                        const file = item.getAsFile();
                        if (!file) return;
                        // try upload via admin image API if available
                        const adminToken = localStorage.getItem('adminToken');
                        const fd = new FormData();
                        fd.append('image', file);
                        const res = await fetch('/api/admin/upload-image', {
                            method: 'POST',
                            headers: adminToken ? { 'Authorization': `Bearer ${adminToken}` } : {},
                            body: fd
                        });
                        if (res.ok) {
                            const { url } = await res.json();
                            const img = document.createElement('img');
                            img.src = url;
                            img.alt = generateAltFromFilename(file && file.name);
                            img.style.maxWidth = '100%';
                            editor.appendChild(img);
                        }
                        break;
                    }
                }
            } catch (err) {
                console.error('paste image error:', err);
            }
        });
    } catch (error) {
        console.error('Error initializing project editor:', error);
    }
}

// Hide add tutorial form
function hideAddTutorialForm() {
    try {
        const form = document.getElementById('add-tutorial-form');
        if (form) {
            form.style.display = 'none';
            
            // Reset form
            const tutorialForm = document.getElementById('tutorial-form');
            if (tutorialForm) {
                tutorialForm.reset();
            }
            
            // Reset featured image
            clearFeaturedImage();
            
            // Clear validation errors
            const hiddenInputs = tutorialForm.querySelectorAll('input[style*="display: none"]');
            hiddenInputs.forEach(input => {
                input.setCustomValidity('');
                input.removeAttribute('required');
            });
            
            // Reset form to add mode
            resetFormToAddMode();
            

        }
    } catch (error) {
        console.error('Error hiding add tutorial form:', error);
    }
}

// Setup tutorial form event listeners
function setupTutorialFormListeners() {
    try {
        // Form submit handler
        const form = document.getElementById('tutorial-form');
        if (form) {
            form.addEventListener('submit', handleTutorialSubmit);


        } else {

        }
        
        // Auto-generate slug from title
        const titleInput = document.getElementById('tutorial-title');
        if (titleInput) {
            titleInput.addEventListener('input', autoGenerateTutorialSlug);
        }
        
        // Initialize rich text editor
        initializeTutorialRichTextEditor();
        
        // Initialize featured image upload
        initializeFeaturedImageUpload();
        
        // Setup form validation handling
        setupFormValidationHandling();
        

    } catch (error) {
        console.error('Error setting up tutorial form listeners:', error);
    }
}

// Initialize tutorial rich text editor
function initializeTutorialRichTextEditor() {
    try {
        console.log('🔄 Initializing tutorial rich text editor...');
        // Initialize tutorial content editor
        initializeTutorialEditor('tutorial-content', 'tutorial-editor-toolbar');
    } catch (error) {
        console.error('Error initializing tutorial rich text editor:', error);
    }
}

function initializeTutorialEditor(editorId, toolbarId) {
    try {
        const editor = document.getElementById(editorId);
        const toolbar = document.getElementById(toolbarId);
        if (!editor || !toolbar) return;
        
        // Check if already initialized
        if (editor.dataset.initialized === 'true') return;

        // Delegate to the same executor used for other editors
        toolbar.addEventListener('click', function(e) {
            if (e.target.classList.contains('toolbar-btn')) {
                e.preventDefault();
                const button = e.target;
                const command = button.getAttribute('data-command');
                executeEditorCommand(command, editor, button);
            }
        });

        // Sync hidden input on input
        editor.addEventListener('input', function() {
            const hidden = document.getElementById(editorId + '-hidden');
            if (hidden) hidden.value = editor.innerHTML;
        });

        // Add keyboard shortcuts
        addEditorKeyboardShortcuts(editor);
        
        // Mark as initialized
        editor.dataset.initialized = 'true';
        console.log('✅ Tutorial rich text editor initialized');
    } catch (error) {
        console.error('Error initializing tutorial editor:', error);
    }
}

// Handle image paste in rich text editor
async function handleImagePaste(file, editor) {
    try {
        // Validate file
        if (!file.type.startsWith('image/')) {
            alert('Chỉ có thể paste ảnh');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            alert('Ảnh không được vượt quá 5MB');
            return;
        }
        
        // Show loading indicator
        const loadingText = document.createElement('span');
        loadingText.innerHTML = '⏳ Đang upload ảnh...';
        loadingText.style.color = '#6b7280';
        loadingText.style.fontStyle = 'italic';
        document.execCommand('insertHTML', false, loadingText.outerHTML);
        
        // Upload image
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch('/api/admin/upload-image', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Remove loading text
            const loadingElements = editor.querySelectorAll('span');
            loadingElements.forEach(el => {
                if (el.textContent.includes('Đang upload ảnh')) {
                    el.remove();
                }
            });
            
            // Insert image
            const img = document.createElement('img');
            img.src = result.url;
            img.alt = generateAltFromFilename(file && file.name);
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.borderRadius = '0.375rem';
            img.style.margin = '0.5rem 0';
            
            // Try modern approach first
            if (window.getSelection && window.getSelection().rangeCount > 0) {
                const selection = window.getSelection();
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(img);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
                // Fallback to execCommand
                document.execCommand('insertHTML', false, img.outerHTML);
            }
            

        } else {
            const error = await response.json();
            console.error('Upload error:', error);
            
            // Remove loading text
            const loadingElements = editor.querySelectorAll('span');
            loadingElements.forEach(el => {
                if (el.textContent.includes('Đang upload ảnh')) {
                    el.remove();
                }
            });
            
            // Show error
            const errorText = document.createElement('span');
            errorText.innerHTML = '❌ Lỗi upload ảnh';
            errorText.style.color = '#ef4444';
            errorText.style.fontStyle = 'italic';
            document.execCommand('insertHTML', false, errorText.outerHTML);
        }
        
    } catch (error) {
        console.error('Error handling image paste:', error);
        
        // Remove loading text
        const loadingElements = editor.querySelectorAll('span');
        loadingElements.forEach(el => {
            if (el.textContent.includes('Đang upload ảnh')) {
                el.remove();
            }
        });
        
        // Show error
        const errorText = document.createElement('span');
        errorText.innerHTML = '❌ Lỗi khi paste ảnh';
        errorText.style.color = '#ef4444';
        errorText.style.fontStyle = 'italic';
        document.execCommand('insertHTML', false, errorText.outerHTML);
    }
}

// Add keyboard shortcuts to editor
function addEditorKeyboardShortcuts(editor) {
    editor.addEventListener('keydown', function(e) {
        if (e.ctrlKey) {
            switch(e.key) {
                case '1':
                    e.preventDefault();
                    document.execCommand('formatBlock', false, 'h1');
                    break;
                case '2':
                    e.preventDefault();
                    document.execCommand('formatBlock', false, 'h2');
                    break;
                case '3':
                    e.preventDefault();
                    document.execCommand('formatBlock', false, 'h3');
                    break;
                case '0':
                    e.preventDefault();
                    document.execCommand('formatBlock', false, 'p');
                    break;
            }
        }
    });
}

// Execute editor commands
function executeEditorCommand(command, editor, button) {
    try {
        editor.focus();
        
        const value = button ? button.getAttribute('data-value') : null;
        
        switch (command) {
            case 'bold':
            case 'italic':
            case 'underline':
                document.execCommand(command, false, null);
                break;
            case 'formatBlock':
                document.execCommand('formatBlock', false, value);
                break;
            case 'removeFormat':
                document.execCommand('removeFormat', false, null);
                break;
            case 'insertUnorderedList':
                document.execCommand('insertUnorderedList', false, null);
                break;
            case 'insertOrderedList':
                document.execCommand('insertOrderedList', false, null);
                break;
            case 'justifyLeft':
            case 'justifyCenter':
            case 'justifyRight':
                document.execCommand(command, false, null);
                break;
            case 'insertImage':
                showImageUploadModal();
                break;
            case 'createLink':
                const url = prompt('Nhập URL:');
                if (url) {
                    document.execCommand('createLink', false, url);
                }
                break;
            case 'insertCode':
                showCodeModal();
                break;
            case 'insertArduinoCode':
                showArduinoCodePopup();
                break;
            case 'insertTableOfContents':
                insertTableOfContents(editor);
                break;
            case 'insertYouTube':
                insertYouTubeEmbed(editor);
                break;
            case 'moveYouTubeUp':
                moveNearestYouTube(editor, -1);
                break;
            case 'moveYouTubeDown':
                moveNearestYouTube(editor, 1);
                break;
        }
        
        // Update button states
        updateToolbarStates(editor);
    } catch (error) {
        console.error('Error executing editor command:', error);
    }
}

// Update toolbar button states
function updateToolbarStates(editor) {
    try {
        const toolbar = editor.parentElement.querySelector('.editor-toolbar');
        const buttons = toolbar.querySelectorAll('.toolbar-btn');
        
        buttons.forEach(button => {
            const command = button.getAttribute('data-command');
            if (['bold', 'italic', 'underline'].includes(command)) {
                if (document.queryCommandState(command)) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
            } else if (['justifyLeft', 'justifyCenter', 'justifyRight'].includes(command)) {
                if (document.queryCommandState(command)) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
            }
        });
    } catch (error) {
        console.error('Error updating toolbar states:', error);
    }
}

// Insert table of contents into editor
function insertTableOfContents(editor) {
    try {
        // Get all headings in the editor
        const headings = editor.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        if (headings.length === 0) {
            alert('Không tìm thấy tiêu đề nào trong nội dung. Vui lòng thêm các tiêu đề (H1, H2, H3...) trước khi tạo mục lục.');
            return;
        }
        
        // Create table of contents HTML
        let tocHTML = '<div class="table-of-contents" style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 1.5rem; margin: 1rem 0;">';
        tocHTML += '<h3 style="margin: 0 0 1rem 0; color: #495057; font-size: 1.1rem;">📑 Mục lục</h3>';
        tocHTML += '<ul style="margin: 0; padding-left: 1.5rem; list-style: none;">';
        
        headings.forEach((heading, index) => {
            const id = `heading-${index}`;
            heading.id = id;
            
            const level = parseInt(heading.tagName.charAt(1));
            const indent = (level - 1) * 20;
            
            tocHTML += `<li style="margin-bottom: 0.5rem; padding-left: ${indent}px;">`;
            tocHTML += `<a href="#${id}" style="color: #007bff; text-decoration: none; font-size: 0.9rem;">`;
            tocHTML += heading.textContent;
            tocHTML += '</a></li>';
        });
        
        tocHTML += '</ul></div>';
        
        // Insert at cursor position
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = tocHTML;
            const tocElement = tempDiv.firstElementChild;
            
            range.insertNode(tocElement);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            // Insert at the beginning if no selection
            editor.insertAdjacentHTML('afterbegin', tocHTML);
        }
        
        // Update hidden input
        const hiddenInput = document.getElementById('tutorial-content-hidden');
        if (hiddenInput) {
            hiddenInput.value = editor.innerHTML;
        }
        

        
    } catch (error) {
        console.error('❌ Error inserting table of contents:', error);
        alert('Có lỗi khi tạo mục lục. Vui lòng thử lại.');
    }
}

// Insert YouTube embed into editor from URL
function insertYouTubeEmbed(editor) {
    try {
        const url = prompt('Dán link YouTube (ví dụ: https://www.youtube.com/watch?v=dQw4w9WgXcQ):');
        if (!url) return;

        // Extract video ID from various YouTube URL formats
        const idMatch = url.match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{11})/);
        const videoId = idMatch ? idMatch[1] : null;
        if (!videoId) {
            alert('Link YouTube không hợp lệ.');
            return;
        }

        const iframeHtml = `
<div class="yt-embed" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px; border: 1px solid #e5e7eb; margin: 1rem 0;">
  <iframe src="https://www.youtube.com/embed/${videoId}" title="YouTube video"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
    frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen></iframe>
</div>`;

        // Insert iframe at caret
        if (window.getSelection && window.getSelection().rangeCount > 0) {
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const temp = document.createElement('div');
            temp.innerHTML = iframeHtml;
            const node = temp.firstElementChild;
            range.insertNode(node);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            editor.insertAdjacentHTML('beforeend', iframeHtml);
        }

        // Update hidden input if present
        const hiddenInput = document.getElementById('tutorial-content-hidden');
        if (hiddenInput) hiddenInput.value = editor.innerHTML;

    } catch (error) {
        console.error('Error inserting YouTube embed:', error);
        alert('Không chèn được YouTube, vui lòng thử lại.');
    }
}

// Move nearest YouTube embed block up/down by one sibling
function moveNearestYouTube(editor, direction) {
    try {
        const selection = window.getSelection();
        let anchorNode = selection && selection.anchorNode ? selection.anchorNode : editor;
        // Find closest yt-embed container from selection
        let current = anchorNode.nodeType === 1 ? anchorNode : anchorNode.parentElement;
        while (current && current !== editor && !current.classList.contains('yt-embed')) {
            current = current.parentElement;
        }
        // If caret not inside a yt-embed, pick nearest one relative to caret
        if (!current || current === editor) {
            const embeds = Array.from(editor.querySelectorAll('.yt-embed'));
            if (embeds.length === 0) return;
            // choose the last embed before caret, else first
            const range = selection.rangeCount ? selection.getRangeAt(0) : null;
            if (!range) {
                current = embeds[0];
            } else {
                let chosen = embeds[0];
                const caretPos = range.startContainer;
                for (const el of embeds) {
                    if (el.compareDocumentPosition(caretPos) & Node.DOCUMENT_POSITION_FOLLOWING) break;
                    chosen = el;
                }
                current = chosen;
            }
        }
        if (!current || !current.classList.contains('yt-embed')) return;

        if (direction < 0) {
            const prev = current.previousElementSibling;
            if (prev) prev.before(current);
        } else {
            const next = current.nextElementSibling;
            if (next) next.after(current);
        }

        // Update hidden input
        const hiddenInput = document.getElementById('tutorial-content-hidden');
        if (hiddenInput) hiddenInput.value = editor.innerHTML;

    } catch (error) {
        console.error('Error moving YouTube embed:', error);
        alert('Không di chuyển được YouTube.');
    }
}

// Show image upload modal
function showImageUploadModal() {
    try {
        const modal = document.getElementById('image-upload-modal');
        if (modal) {
            modal.style.display = 'block';
        }
    } catch (error) {
        console.error('Error showing image upload modal:', error);
    }
}

// Close image upload modal
function closeImageUploadModal() {
    try {
        const modal = document.getElementById('image-upload-modal');
        if (modal) {
            modal.style.display = 'none';
            // Clear form
            document.getElementById('image-url').value = '';
            document.getElementById('image-file').value = '';
            document.getElementById('image-preview').style.display = 'none';
        }
    } catch (error) {
        console.error('Error closing image upload modal:', error);
    }
}

// Insert image from URL
function insertImageFromUrl() {
    try {
        const url = document.getElementById('image-url').value.trim();
        if (!url) {
            alert('Vui lòng nhập URL ảnh');
            return;
        }
        
        const editor = document.getElementById('tutorial-content');
        const img = document.createElement('img');
        img.src = url;
        img.alt = prompt('Nhập mô tả (alt) cho ảnh', generateAltFromUrl(url)) || generateAltFromUrl(url);
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        
        document.execCommand('insertHTML', false, img.outerHTML);
        closeImageUploadModal();
    } catch (error) {
        console.error('Error inserting image from URL:', error);
        alert('Lỗi khi chèn ảnh');
    }
}

// Helpers to derive alt text
function generateAltFromFilename(name) {
    if (!name) return 'image';
    try {
        const base = name.replace(/\.[a-zA-Z0-9]+$/, '');
        return base.replace(/[-_]+/g, ' ').trim();
    } catch(_) { return 'image'; }
}

function generateAltFromUrl(url) {
    try {
        const pathname = new URL(url).pathname;
        const file = pathname.split('/').pop();
        return generateAltFromFilename(file);
    } catch(_) {
        const parts = url.split('/');
        return generateAltFromFilename(parts[parts.length - 1] || 'image');
    }
}

// Upload image file
async function uploadImageFile() {
    try {
        const fileInput = document.getElementById('image-file');
        const file = fileInput.files[0];
        
        if (!file) {
            alert('Vui lòng chọn file ảnh');
            return;
        }
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Vui lòng chọn file ảnh hợp lệ');
            return;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File ảnh không được vượt quá 5MB');
            return;
        }
        
        // Create FormData
        const formData = new FormData();
        formData.append('image', file);
        
        // Show loading
        const uploadBtn = event.target;
        const originalText = uploadBtn.textContent;
        uploadBtn.textContent = '⏳ Đang upload...';
        uploadBtn.disabled = true;
        
        // Upload to server
        const response = await fetch('/api/admin/upload-image', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Insert image into editor
            const editor = document.getElementById('tutorial-content');
            const img = document.createElement('img');
            img.src = result.url;
            img.alt = generateAltFromFilename((document.getElementById('image-file').files[0] || {}).name);
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            
            document.execCommand('insertHTML', false, img.outerHTML);
            closeImageUploadModal();
        } else {
            const error = await response.json();
            alert(`Lỗi upload: ${error.error}`);
        }
        
    } catch (error) {
        console.error('Error uploading image:', error);
        alert('Lỗi khi upload ảnh');
    } finally {
        // Reset button
        const uploadBtn = event.target;
        uploadBtn.textContent = 'Upload & Chèn';
        uploadBtn.disabled = false;
    }
}

// Initialize featured image upload
function initializeFeaturedImageUpload() {
    try {
        const fileInput = document.getElementById('tutorial-featured-image-file');
        const uploadArea = document.querySelector('.image-upload-area');
        
        if (!fileInput || !uploadArea) return;
        
        // File input change handler
        fileInput.addEventListener('change', handleFeaturedImageSelect);
        
        // Drag and drop handlers
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleDrop);
        

    } catch (error) {
        console.error('Error initializing featured image upload:', error);
    }
}

// Handle featured image file selection
async function handleFeaturedImageSelect(event) {
    try {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validate file
        if (!file.type.startsWith('image/')) {
            alert('Vui lòng chọn file ảnh hợp lệ');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            alert('File ảnh không được vượt quá 5MB');
            return;
        }
        
        // Show preview immediately
        showFeaturedImagePreview(file);
        
        // Upload to server
        await uploadFeaturedImage(file);
        
    } catch (error) {
        console.error('Error handling featured image select:', error);
        alert('Lỗi khi xử lý ảnh');
    }
}

// Show featured image preview
function showFeaturedImagePreview(file) {
    try {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('featured-image-preview');
            const placeholder = document.getElementById('featured-image-placeholder');
            const clearBtn = document.getElementById('clear-featured-btn');
            
            if (preview && placeholder && clearBtn) {
                preview.src = e.target.result;
                preview.style.display = 'block';
                placeholder.style.display = 'none';
                clearBtn.style.display = 'inline-block';
            }
        };
        reader.readAsDataURL(file);
    } catch (error) {
        console.error('Error showing featured image preview:', error);
    }
}

// Upload featured image to server
async function uploadFeaturedImage(file) {
    try {
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch('/api/admin/upload-image', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Update hidden input with uploaded image URL
            const hiddenInput = document.getElementById('tutorial-featured-image');
            if (hiddenInput) {
                hiddenInput.value = result.url;
            }
            

        } else {
            const error = await response.json();
            console.error('Upload error:', error);
            alert(`Lỗi upload: ${error.error}`);
        }
        
    } catch (error) {
        console.error('Error uploading featured image:', error);
        alert('Lỗi khi upload ảnh');
    }
}

// Clear featured image
function clearFeaturedImage() {
    try {
        const fileInput = document.getElementById('tutorial-featured-image-file');
        const hiddenInput = document.getElementById('tutorial-featured-image');
        const preview = document.getElementById('featured-image-preview');
        const placeholder = document.getElementById('featured-image-placeholder');
        const clearBtn = document.getElementById('clear-featured-btn');
        
        if (fileInput) fileInput.value = '';
        if (hiddenInput) hiddenInput.value = '';
        if (preview) preview.style.display = 'none';
        if (placeholder) placeholder.style.display = 'block';
        if (clearBtn) clearBtn.style.display = 'none';
        
    } catch (error) {
        console.error('Error clearing featured image:', error);
    }
}

// Initialize featured image preview
function initializeFeaturedImagePreview() {
    try {
        const featuredInput = document.getElementById('tutorial-featured-image');
        if (featuredInput) {
            featuredInput.addEventListener('input', function() {
                let url = this.value.trim();
                const preview = document.getElementById('featured-image-preview');
                const previewImg = document.getElementById('featured-image-preview-img');
                const placeholder = document.getElementById('featured-image-placeholder');
                const clearBtn = document.getElementById('clear-featured-btn');
                
                // Clear any validation errors
                this.setCustomValidity('');
                
                if (url && preview && previewImg && placeholder && clearBtn) {
                    // Auto-add domain if user only enters path
                    if (url.startsWith('/images/') && !url.startsWith('http')) {
                        url = 'https://smartsteam.vn' + url;
                        this.value = url; // Update the input with full URL
                    }
                    
                    // Validate URL format
                    try {
                        new URL(url);
                        previewImg.src = url;
                        preview.style.display = 'block';
                        placeholder.style.display = 'none';
                        clearBtn.style.display = 'inline-block';

                    } catch (error) {

                        // Don't show preview for invalid URLs
                        preview.style.display = 'none';
                        placeholder.style.display = 'block';
                        clearBtn.style.display = 'none';
                    }
                } else if (preview && placeholder && clearBtn) {
                    preview.style.display = 'none';
                    placeholder.style.display = 'block';
                    clearBtn.style.display = 'none';
                }
            });
            
            // Add blur event to validate URL when user leaves input
            featuredInput.addEventListener('blur', function() {
                const url = this.value.trim();
                if (url) {
                    try {
                        new URL(url);
                        this.setCustomValidity('');
                    } catch (error) {
                        this.setCustomValidity('URL không hợp lệ. Vui lòng nhập URL đúng định dạng (ví dụ: https://example.com/image.jpg)');
                    }
                }
            });
            

        }
    } catch (error) {
        console.error('Error initializing featured image preview:', error);
    }
}

// Drag and drop handlers
function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#3b82f6';
    e.currentTarget.style.backgroundColor = '#f0f9ff';
}

function handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#d1d5db';
    e.currentTarget.style.backgroundColor = '#f9fafb';
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#d1d5db';
    e.currentTarget.style.backgroundColor = '#f9fafb';
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const fileInput = document.getElementById('tutorial-featured-image-file');
        if (fileInput) {
            fileInput.files = files;
            handleFeaturedImageSelect({ target: fileInput });
        }
    }
}

// Helper function to insert content into editor
function insertContentIntoEditor(element) {
    try {

        
        const editor = document.getElementById('tutorial-content');
        if (!editor) {
            console.error('❌ Editor not found');
            return false;
        }
        

        editor.focus();
        
        // Try modern approach first
        if (window.getSelection && window.getSelection().rangeCount > 0) {

            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(element);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);

            return true;
        } else {

            const result = document.execCommand('insertHTML', false, element.outerHTML);

            
            if (!result) {

                // Last resort: append to editor
                editor.appendChild(element);
                return true;
            }
            
            return result;
        }
    } catch (error) {
        console.error('❌ Error inserting content:', error);
        return false;
    }
}

// Setup form validation handling
function setupFormValidationHandling() {
    try {
        const form = document.getElementById('tutorial-form');
        if (!form) return;
        
        // Disable validation for hidden inputs
        const hiddenInputs = form.querySelectorAll('input[style*="display: none"]');
        hiddenInputs.forEach(input => {
            input.removeAttribute('required');
            input.setCustomValidity('');
        });
        
        // Add form submit handler to clear validation errors
        form.addEventListener('submit', function(event) {
            // Clear validation errors on hidden inputs
            hiddenInputs.forEach(input => {
                input.setCustomValidity('');
                input.removeAttribute('required');
            });
        });
        

    } catch (error) {
        console.error('Error setting up form validation handling:', error);
    }
}

// Show Code modal
function showCodeModal() {
    try {

        const modal = document.getElementById('code-modal');
        const input = document.getElementById('code-input');
        
        if (!modal) {
            console.error('❌ Code modal not found');
            alert('Modal Code không tìm thấy');
            return;
        }
        
        if (!input) {
            console.error('❌ Code input not found');
            alert('Input Code không tìm thấy');
            return;
        }
        
        modal.style.display = 'block';
        input.value = `// Nhập code của bạn ở đây
function example() {

    return true;
}`;
        
        // Initialize preview
        updateCodePreview();
        
        // Add event listener for real-time preview
        input.addEventListener('input', updateCodePreview);
        

    } catch (error) {
        console.error('Error showing code modal:', error);
        alert('Lỗi khi mở modal Code: ' + error.message);
    }
}

// Show Arduino code popup
function showArduinoCodePopup() {
    try {

        const popup = document.getElementById('arduino-code-popup');
        const textarea = document.getElementById('arduino-code-textarea');
        
        if (!popup) {
            console.error('❌ Arduino popup not found');
            alert('Popup Arduino không tìm thấy');
            return;
        }
        
        if (!textarea) {
            console.error('❌ Arduino textarea not found');
            alert('Textarea Arduino không tìm thấy');
            return;
        }
        
        popup.style.display = 'block';
        textarea.value = ''; // Clear textarea
        textarea.focus(); // Focus on textarea
        

    } catch (error) {
        console.error('Error showing Arduino code popup:', error);
        alert('Lỗi khi mở popup Arduino: ' + error.message);
    }
}

// Close Code modal
function closeCodeModal() {
    try {
        const modal = document.getElementById('code-modal');
        const input = document.getElementById('code-input');
        
        if (modal && input) {
            modal.style.display = 'none';
            input.value = '';
            input.removeEventListener('input', updateCodePreview);
        }
    } catch (error) {
        console.error('Error closing code modal:', error);
    }
}

// Update Code preview
function updateCodePreview() {
    try {
        const input = document.getElementById('code-input');
        const preview = document.getElementById('code-preview');
        
        if (!input || !preview) return;
        
        const code = input.value;
        const highlightedCode = highlightCode(code);
        preview.innerHTML = highlightedCode;
    } catch (error) {
        console.error('Error updating code preview:', error);
    }
}

// Code syntax highlighting
function highlightCode(code) {
    try {
        // Always escape HTML characters first, regardless of existing tags
        
        // Escape HTML characters first
        code = code.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;');
        
        // Basic syntax highlighting for common languages
        code = code
            // Comments
            .replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>')
            .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>')
            // Strings
            .replace(/(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g, '<span class="string">$1$2$1</span>')
            // Keywords
            .replace(/\b(function|const|let|var|if|else|for|while|return|class|import|export|from|default|async|await|try|catch|finally|throw|new|this|super|extends|implements|interface|type|enum|namespace|module|declare|public|private|protected|static|readonly|abstract|virtual|override|sealed|internal|extern|volatile|register|auto|signed|unsigned|short|long|int|char|float|double|void|bool|true|false|null|undefined|NaN|Infinity)\b/g, '<span class="keyword">$1</span>')
            // Numbers
            .replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>')
            // Functions
            .replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, '<span class="function">$1</span>')
            // Operators
            .replace(/([+\-*/%=<>!&|^~?:;,])/g, '<span class="operator">$1</span>')
            // Punctuation
            .replace(/([{}[\]();.])/g, '<span class="punctuation">$1</span>');
        
        return code;
    } catch (error) {
        console.error('Error highlighting code:', error);
        return code;
    }
}

// Insert Code into editor
function insertCode() {
    try {

        
        const input = document.getElementById('code-input');
        const editor = document.getElementById('tutorial-content');
        


        
        if (!input) {
            console.error('❌ Input not found');
            alert('Không tìm thấy input Code');
            return;
        }
        
        if (!editor) {
            console.error('❌ Editor not found');
            alert('Không tìm thấy editor');
            return;
        }
        
        const code = input.value.trim();

        
        if (!code) {
            alert('Vui lòng nhập code');
            return;
        }
        
        // Create code block
        const codeBlock = document.createElement('div');
        codeBlock.className = 'code-block';
        codeBlock.innerHTML = `<code>${highlightCode(code)}</code>`;
        


        
        // Insert into editor
        const success = insertContentIntoEditor(codeBlock);

        
        if (!success) {
            alert('Lỗi khi chèn code vào editor');
            return;
        }
        
        // Close modal
        closeCodeModal();
        

        alert('✅ Đã chèn code thành công!');
    } catch (error) {
        console.error('Error inserting code:', error);
        alert('Lỗi khi chèn code: ' + error.message);
    }
}

// Close Arduino code popup
function closeArduinoCodePopup() {
    try {
        const popup = document.getElementById('arduino-code-popup');
        const textarea = document.getElementById('arduino-code-textarea');
        
        if (popup && textarea) {
            popup.style.display = 'none';
            textarea.value = '';
        }
        

    } catch (error) {
        console.error('Error closing Arduino code popup:', error);
    }
}

// Show Image Library
function showImageLibrary() {
    const popup = document.getElementById('image-library-popup');
    if (popup) {
        popup.style.display = 'flex';
        loadImageLibrary();
    }
}

// Close Image Library
function closeImageLibrary() {
    const popup = document.getElementById('image-library-popup');
    if (popup) {
        popup.style.display = 'none';
    }
}

// Load images from server
async function loadImageLibrary() {
    try {
        const response = await fetch('/api/admin/images', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load images');
        }
        
        const images = await response.json();
        renderImageLibrary(images);
    } catch (error) {
        console.error('Error loading image library:', error);
        // Fallback: show upload option
        renderImageLibrary([]);
    }
}

// Render image library
function renderImageLibrary(images) {
    const container = document.getElementById('image-library-container');
    if (!container) return;
    
    if (images.length === 0) {
        container.innerHTML = `
            <div class="no-images">
                <p>Chưa có hình ảnh nào</p>
                <button onclick="showImageUpload()" class="btn btn-primary">📤 Tải lên hình ảnh</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = images.map(image => `
        <div class="image-item" onclick="selectImageFromLibrary('${image.url}', '${image.alt || ''}')">
            <img src="${image.url}" alt="${image.alt || ''}" />
            <div class="image-info">
                <span class="image-name">${image.name || 'Unnamed'}</span>
                <span class="image-size">${image.size || 'Unknown size'}</span>
            </div>
        </div>
    `).join('');
}

// Select image from library
function selectImageFromLibrary(url, alt) {
    try {


        
        // Check if we're targeting a specific input (like featured image)
        if (currentLibraryTarget && currentLibraryTarget.includes('tutorial-featured-image')) {

            // Handle featured image input
            const featuredInput = document.getElementById('tutorial-featured-image');
            if (featuredInput) {
                // Auto-add domain if URL starts with /images/
                let finalUrl = url;
                if (url.startsWith('/images/') && !url.startsWith('http')) {
                    finalUrl = 'https://smartsteam.vn' + url;
                }
                featuredInput.value = finalUrl;

                
                // Show preview
                const preview = document.getElementById('featured-image-preview');
                const previewImg = document.getElementById('featured-image-preview-img');
                const placeholder = document.getElementById('featured-image-placeholder');
                const clearBtn = document.getElementById('clear-featured-btn');
                
                if (preview && previewImg && placeholder && clearBtn) {
                    previewImg.src = finalUrl;
                    preview.style.display = 'block';
                    placeholder.style.display = 'none';
                    clearBtn.style.display = 'inline-block';

                } else {

                }
            } else {

            }
        } else if (currentLibraryTarget && currentLibraryTarget.includes('product-images')) {

            // Add image to product images preview
            const imagePreviewGrid = document.getElementById('product-images-grid');
            if (imagePreviewGrid) {
                // Show preview container
                const previewContainer = document.getElementById('product-images-preview');
                if (previewContainer) {
                    previewContainer.style.display = 'block';
                }
                
                // Add image to grid
                const imageItem = document.createElement('div');
                imageItem.className = 'image-preview-item';
                imageItem.innerHTML = `
                    <img src="${url}" alt="${alt || ''}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px;">
                    <div class="image-actions" style="padding: 8px; text-align: center;">
                        <button type="button" onclick="removeEditImage(${imagePreviewGrid.children.length})" style="background: #dc2626; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">Xóa</button>
                    </div>
                `;
                imagePreviewGrid.appendChild(imageItem);

            } else {

            }
        } else {

            // Handle rich text editor insertion
            const editor = document.getElementById(currentLibraryTarget);
            if (editor) {
                const img = document.createElement('img');
                img.src = url;
                img.alt = alt || '';
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                editor.appendChild(img);

            } else {

            }
        }
        
        closeLibraryPicker();
    } catch (error) {
        console.error('Error inserting image:', error);
    }
}

// Upload image to server
async function uploadImageToServer(blob, success, failure) {
    try {
        const formData = new FormData();
        formData.append('image', blob, 'image.jpg');
        
        const response = await fetch('/api/admin/upload-image', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Upload failed');
        }
        
        const result = await response.json();
        success(result.url);
    } catch (error) {
        console.error('Error uploading image:', error);
        failure('Upload failed: ' + error.message);
    }
}

// Show image upload
function showImageUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    
    input.onchange = async function(e) {
        const files = Array.from(e.target.files);
        for (const file of files) {
            try {
                await uploadImageToServer(file, (url) => {

                }, (error) => {
                    console.error('Upload failed:', error);
                });
            } catch (error) {
                console.error('Error uploading file:', error);
            }
        }
    };
    
    input.click();
}

// Update Arduino code preview with syntax highlighting
function updateArduinoCodePreview() {
    try {
        const input = document.getElementById('arduino-code-input');
        const preview = document.getElementById('arduino-code-preview');
        
        if (!input || !preview) return;
        
        const code = input.value;
        // Escape HTML characters but don't add syntax highlighting
        const escapedCode = code.replace(/&/g, '&amp;')
                              .replace(/</g, '&lt;')
                              .replace(/>/g, '&gt;')
                              .replace(/"/g, '&quot;')
                              .replace(/'/g, '&#39;');
        preview.innerHTML = `<div class="arduino-code"><pre>${escapedCode}</pre></div>`;
    } catch (error) {
        console.error('Error updating Arduino code preview:', error);
    }
}

// Arduino syntax highlighting
function highlightArduinoCode(code) {
    try {
        // Always escape HTML characters first, regardless of existing tags
        code = code.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&#39;');
        
        // Arduino keywords
        const keywords = [
            'void', 'setup', 'loop', 'int', 'float', 'double', 'char', 'bool', 'byte',
            'unsigned', 'long', 'short', 'const', 'static', 'volatile', 'if', 'else',
            'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'return',
            'true', 'false'
        ];
        
        // Arduino constants
        const constants = [
            'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP'
        ];
        
        // Arduino functions
        const functions = [
            'pinMode', 'digitalWrite', 'digitalRead', 'analogWrite', 'analogRead',
            'Serial.begin', 'Serial.print', 'Serial.println', 'delay', 'millis',
            'micros', 'tone', 'noTone', 'attachInterrupt', 'detachInterrupt'
        ];
        
        let highlighted = code;
        
        // Highlight comments first (they can contain other syntax)
        highlighted = highlighted.replace(/\/\/.*$/gm, (match) => {
            return `<span class="comment">${match}</span>`;
        });
        highlighted = highlighted.replace(/\/\*[\s\S]*?\*\//g, (match) => {
            return `<span class="comment">${match}</span>`;
        });
        
        // Highlight strings
        highlighted = highlighted.replace(/&quot;([^&]*?)&quot;/g, '<span class="string">&quot;$1&quot;</span>');
        highlighted = highlighted.replace(/&#39;([^&]*?)&#39;/g, '<span class="string">&#39;$1&#39;</span>');
        
        // Highlight numbers
        highlighted = highlighted.replace(/\b\d+\.?\d*\b/g, '<span class="number">$&</span>');
        
        // Highlight keywords
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'g');
            highlighted = highlighted.replace(regex, '<span class="keyword">$&</span>');
        });
        
        // Highlight constants
        constants.forEach(constant => {
            const regex = new RegExp(`\\b${constant}\\b`, 'g');
            highlighted = highlighted.replace(regex, '<span class="constant">$&</span>');
        });
        
        // Highlight functions (including pinMode)
        functions.forEach(func => {
            const regex = new RegExp(`\\b${func}\\b`, 'g');
            highlighted = highlighted.replace(regex, '<span class="function">$&</span>');
        });
        
        // Highlight operators
        highlighted = highlighted.replace(/([+\-*/%=<>!&|^~])/g, '<span class="operator">$1</span>');
        
        // Highlight punctuation
        highlighted = highlighted.replace(/([{}();,])/g, '<span class="punctuation">$1</span>');
        
        return highlighted;
    } catch (error) {
        console.error('Error highlighting Arduino code:', error);
        return code;
    }
}

// Insert Arduino code into editor
function insertArduinoCode() {
    try {

        
        const input = document.getElementById('arduino-code-input');
        // Try to find the active editor (could be tutorial-content or edit-tutorial-content)
        let editor = document.getElementById('tutorial-content');
        if (!editor) {
            editor = document.getElementById('edit-tutorial-content');
        }
        if (!editor) {
            // Fallback: find any contenteditable div
            editor = document.querySelector('[contenteditable="true"]');
        }
        


        
        if (!input) {
            console.error('❌ Input not found');
            alert('Không tìm thấy input Arduino');
            return;
        }
        
        if (!editor) {
            console.error('❌ Editor not found');
            alert('Không tìm thấy editor');
            return;
        }
        
        const code = input.value.trim();

        
        if (!code) {
            alert('Vui lòng nhập code Arduino');
            return;
        }
        
        // Create Arduino code block with proper formatting
        const codeBlock = document.createElement('div');
        codeBlock.className = 'arduino-code';
        codeBlock.style.margin = '1rem 0';
        codeBlock.style.padding = '1rem';
        codeBlock.style.backgroundColor = '#f8f9fa';
        codeBlock.style.border = '1px solid #dee2e6';
        codeBlock.style.borderRadius = '0.5rem';
        codeBlock.style.fontFamily = 'monospace';
        codeBlock.style.fontSize = '14px';
        codeBlock.style.lineHeight = '1.6';
        codeBlock.style.whiteSpace = 'pre-wrap';
        codeBlock.style.overflow = 'auto';
        
        // Escape HTML characters but don't add syntax highlighting
        const escapedCode = code.replace(/&/g, '&amp;')
                              .replace(/</g, '&lt;')
                              .replace(/>/g, '&gt;')
                              .replace(/"/g, '&quot;')
                              .replace(/'/g, '&#39;');
        codeBlock.textContent = code; // Use textContent instead of innerHTML
        


        
        // Insert into editor
        const success = insertContentIntoEditor(codeBlock);

        
        if (!success) {
            alert('Lỗi khi chèn code vào editor');
            return;
        }
        
        // Close popup
        closeArduinoCodePopup();
        

        alert('✅ Đã chèn code Arduino thành công!');
    } catch (error) {
        console.error('Error inserting Arduino code:', error);
        alert('Lỗi khi chèn code Arduino: ' + error.message);
    }
}

// Insert plain text at cursor position
function insertPlainTextAtCursor(editor, text) {
    try {

        
        // Focus the editor first
        editor.focus();
        
        // Method 1: Try execCommand first (most reliable for contenteditable)
        try {
            const result = document.execCommand('insertText', false, text);
            if (result) {

                return true;
            }
        } catch (execError) {

        }
        
        // Method 2: Use range selection
        const selection = window.getSelection();

        
        if (selection.rangeCount > 0) {
            // Get the current range
            const range = selection.getRangeAt(0);

            
            // Check if the range is within the editor
            if (editor.contains(range.commonAncestorContainer) || editor === range.commonAncestorContainer) {
                // Delete any selected content
                range.deleteContents();
                
                // Insert the text at cursor position
                range.insertNode(document.createTextNode(text));
                
                // Move cursor after the inserted text
                range.setStartAfter(range.endContainer);
                range.setEndAfter(range.endContainer);
                selection.removeAllRanges();
                selection.addRange(range);
                

                return true;
            } else {
                // Range is not in editor, append to end
                editor.appendChild(document.createTextNode(text));

                return true;
            }
        } else {
            // No selection, try to create one at the end of editor
            const range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false); // Collapse to end
            selection.removeAllRanges();
            selection.addRange(range);
            
            // Now insert
            range.insertNode(document.createTextNode(text));
            range.setStartAfter(range.endContainer);
            range.setEndAfter(range.endContainer);
            selection.removeAllRanges();
            selection.addRange(range);
            

            return true;
        }
    } catch (error) {
        console.error('❌ Error inserting text at cursor:', error);
        // Final fallback: append to end
        editor.appendChild(document.createTextNode(text));

        return true;
    }
}

// Insert code at cursor position
function insertCodeAtCursor(editor, codeBlock) {
    try {

        
        // Focus the editor first
        editor.focus();
        
        // Method 1: Try execCommand first (most reliable for contenteditable)
        try {
            const result = document.execCommand('insertHTML', false, codeBlock.outerHTML);
            if (result) {

                return true;
            }
        } catch (execError) {

        }
        
        // Method 2: Use range selection
        const selection = window.getSelection();

        
        if (selection.rangeCount > 0) {
            // Get the current range
            const range = selection.getRangeAt(0);

            
            // Check if the range is within the editor
            if (editor.contains(range.commonAncestorContainer) || editor === range.commonAncestorContainer) {
                // Delete any selected content
                range.deleteContents();
                
                // Insert the code block at cursor position
                range.insertNode(codeBlock);
                
                // Move cursor after the inserted code
                range.setStartAfter(codeBlock);
                range.setEndAfter(codeBlock);
                selection.removeAllRanges();
                selection.addRange(range);
                

                return true;
            } else {
                // Range is not in editor, append to end
                editor.appendChild(codeBlock);

                return true;
            }
        } else {
            // No selection, try to create one at the end of editor
            const range = document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false); // Collapse to end
            selection.removeAllRanges();
            selection.addRange(range);
            
            // Now insert
            range.insertNode(codeBlock);
            range.setStartAfter(codeBlock);
            range.setEndAfter(codeBlock);
            selection.removeAllRanges();
            selection.addRange(range);
            

            return true;
        }
    } catch (error) {
        console.error('❌ Error inserting code at cursor:', error);
        // Final fallback: append to end
        editor.appendChild(codeBlock);

        return true;
    }
}

// Insert Arduino code from popup
function insertArduinoCodeFromPopup() {
    try {

        
        const textarea = document.getElementById('arduino-code-textarea');
        
        if (!textarea) {
            console.error('❌ Textarea not found');
            alert('Không tìm thấy textarea Arduino');
            return;
        }
        
        const code = textarea.value.trim();

        
        if (!code) {
            alert('Vui lòng nhập code Arduino');
            return;
        }
        

        
        // Close popup
        closeArduinoCodePopup();
        

        alert('✅ Đã chèn code Arduino thành công!');
    } catch (error) {
        console.error('Error inserting Arduino code from popup:', error);
        alert('Lỗi khi chèn code Arduino: ' + error.message);
    }
}

// Preview tutorial
function previewTutorial() {
    try {
        // Get form data
        const title = document.getElementById('tutorial-title')?.value || '';
        const description = document.getElementById('tutorial-description')?.value || '';
        const author = document.getElementById('tutorial-author')?.value || '';
        const difficulty = document.getElementById('tutorial-difficulty')?.value || '';
        const duration = document.getElementById('tutorial-duration')?.value || '';
        const tags = document.getElementById('tutorial-tags')?.value || '';
        const content = document.getElementById('tutorial-content')?.innerHTML || '';
        const featuredImage = document.getElementById('tutorial-featured-image')?.value || '';
        
        // Get category name
        const categoryId = document.getElementById('tutorial-category')?.value || '';
        const categoryName = getCategoryNameById(categoryId) || 'Chưa chọn danh mục';
        
        // Build preview HTML
        const previewHTML = buildTutorialPreviewHTML({
            title,
            description,
            author,
            difficulty,
            duration,
            tags,
            content,
            featuredImage,
            categoryName
        });
        
        // Show modal
        const modal = document.getElementById('tutorial-preview-modal');
        const previewContent = document.getElementById('tutorial-preview-content');
        
        if (modal && previewContent) {
            previewContent.innerHTML = previewHTML;
            modal.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error previewing tutorial:', error);
        alert('Lỗi khi xem trước bài giảng');
    }
}

// Close tutorial preview
function closeTutorialPreview() {
    try {
        const modal = document.getElementById('tutorial-preview-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    } catch (error) {
        console.error('Error closing tutorial preview:', error);
    }
}

// Build tutorial preview HTML
function buildTutorialPreviewHTML(data) {
    try {
        const difficultyText = getDifficultyText(data.difficulty);
        const tagsArray = data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
        
        return `
            <div class="tutorial-preview-header">
                <h1 class="tutorial-preview-title">${data.title || 'Chưa có tiêu đề'}</h1>
                <div class="tutorial-preview-meta">
                    <span>👤 ${data.author || 'Chưa có tác giả'}</span>
                    <span>📚 ${data.categoryName}</span>
                    <span>⚡ ${difficultyText}</span>
                    <span>⏱️ ${data.duration || '0'} phút</span>
                </div>
            </div>
            
            ${data.featuredImage ? `
                <div style="margin-bottom: 2rem;">
                    <img src="${data.featuredImage}" alt="Featured image" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 0.5rem;">
                </div>
            ` : ''}
            
            ${data.description ? `
                <div class="tutorial-preview-description">
                    ${data.description}
                </div>
            ` : ''}
            
            <div class="tutorial-preview-content">
                ${data.content || '<p style="color: #6b7280; font-style: italic;">Chưa có nội dung</p>'}
            </div>
            
            ${tagsArray.length > 0 ? `
                <div class="tutorial-preview-tags">
                    <h4>🏷️ Tags:</h4>
                    <div class="tutorial-tags">
                        ${tagsArray.map(tag => `<span class="tutorial-tag">${tag}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    } catch (error) {
        console.error('Error building tutorial preview HTML:', error);
        return '<p style="color: #ef4444;">Lỗi khi tạo preview</p>';
    }
}

// Get category name by ID
function getCategoryNameById(categoryId) {
    try {
        if (!categoryId) return null;
        
        // Try to find in global categories
        if (window.globalCategories && Array.isArray(window.globalCategories)) {
            const category = window.globalCategories.find(cat => 
                cat._id === categoryId || cat.id === categoryId || cat._id?.toString() === categoryId
            );
            return category ? category.name : null;
        }
        
        return null;
    } catch (error) {
        console.error('Error getting category name:', error);
        return null;
    }
}

// Ensure editor is ready before form submission
async function ensureTinyMCEReady() {
    return new Promise((resolve) => {

            resolve();
    });
}

// Handle tutorial form submit
async function handleTutorialSubmit(event) {
    try {



        event.preventDefault();
        
        // Ensure editor is ready before submitting
        await ensureTinyMCEReady();
        
        // Clear validation errors on hidden inputs before validation
        const form = event.target;
        const hiddenInputs = form.querySelectorAll('input[style*="display: none"]');
        hiddenInputs.forEach(input => {
            input.setCustomValidity('');
            input.removeAttribute('required');
        });
        const formData = new FormData(form);
        
        // Get content from rich text editor
        let content = '';
        try {
            // Try to get content from contenteditable div
            const editor = document.getElementById('tutorial-content');
            if (editor) {
                content = editor.innerHTML;

            } else {
                // Fallback to hidden input
                const hiddenInput = document.getElementById('tutorial-content-hidden');
                if (hiddenInput) {
                    content = hiddenInput.value;

                } else {
                    content = formData.get('content') || '';

                }
            }
        } catch (error) {
            console.error('❌ Error getting content:', error);
            // Fallback to form data
            content = formData.get('content') || '';

        }
        
        const tutorialData = {
            title: formData.get('title'),
            content: content,
            author: formData.get('author'),
            categoryId: formData.get('categoryId') || null,
            slug: formData.get('slug'),
            description: formData.get('description'),
            difficulty: formData.get('difficulty'),
            duration: parseInt(formData.get('duration')) || 0,
            tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()) : [],
            isPublished: formData.get('isPublished') === 'true',
            featuredImage: formData.get('featuredImage'),
            videoUrl: formData.get('videoUrl'),
            seo: {
                title: formData.get('seoTitle') || '',
                description: formData.get('seoDescription') || '',
                keywords: (formData.get('seoKeywords') || '').split(',').map(s=>s.trim()).filter(Boolean),
                canonical: formData.get('seoCanonical') || '',
                ogTitle: formData.get('ogTitle') || '',
                ogDescription: formData.get('ogDescription') || '',
                ogImage: formData.get('ogImage') || ''
            }
        };
        
        // Validate required fields
        if (!tutorialData.title || !tutorialData.content || !tutorialData.author) {
            alert('Vui lòng điền đầy đủ tiêu đề, nội dung và tác giả');
            return;
        }
        
        // Validate featured image URL if provided
        if (tutorialData.featuredImage && tutorialData.featuredImage.trim() !== '') {
            try {
                new URL(tutorialData.featuredImage);
            } catch (error) {
                alert('URL ảnh đại diện không hợp lệ. Vui lòng nhập URL đúng định dạng (ví dụ: https://example.com/image.jpg)');
                const featuredImageInput = document.getElementById('tutorial-featured-image');
                if (featuredImageInput) {
                    featuredImageInput.focus();
                }
                return;
            }
        }
        
        // Clear any validation errors on hidden inputs (already selected above)
        hiddenInputs.forEach(input => {
            input.setCustomValidity('');
        });
        
        // Clear validation errors on featured image input
        const featuredImageInput = document.getElementById('tutorial-featured-image');
        if (featuredImageInput) {
            featuredImageInput.setCustomValidity('');
        }
        
        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '⏳ Đang lưu...';
        submitBtn.disabled = true;
        
        // Determine if this is an update or create
        const isUpdate = window.editingTutorialId;
        const url = isUpdate ? `/api/admin/tutorials/${window.editingTutorialId}` : '/api/admin/tutorials';
        const method = isUpdate ? 'PUT' : 'POST';
        


        

        
        const token = localStorage.getItem('adminToken');


        
        if (!token) {
            alert('Bạn cần đăng nhập lại');
            window.location.href = '/admin-login.html';
            return;
        }
        
        // Check if token is expired
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Date.now() / 1000;
            if (payload.exp && payload.exp < now) {

                alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminUser');
                window.location.href = '/admin-login.html';
                return;
            }
        } catch (error) {

            alert('Token không hợp lệ. Vui lòng đăng nhập lại.');
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
            window.location.href = '/admin-login.html';
            return;
        }
        




        console.log('🚀 Headers:', {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        });

        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(tutorialData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            const message = isUpdate ? 'Cập nhật bài giảng thành công!' : 'Thêm bài giảng thành công!';
            alert(message);
            hideAddTutorialForm();
            loadTutorials();
            loadAdminStats();
            
            // Clear editing state
            if (isUpdate) {
                window.editingTutorialId = null;
            }
        } else {
            alert(`Lỗi: ${result.error}`);
        }
        
    } catch (error) {
        console.error('Error submitting tutorial:', error);
        alert('Lỗi khi thêm bài giảng');
    } finally {
        // Reset button state (resolve form safely)
        let formEl = null;
        try { formEl = document.getElementById('tutorial-form'); } catch (_) {}
        if (!formEl) {
            try { formEl = (typeof event !== 'undefined' && event && event.target) ? event.target : null; } catch (_) {}
        }
        if (formEl) {
            const submitBtn = formEl.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '💾 Lưu Bài giảng';
                submitBtn.disabled = false;
            }
        }
    }
}

// Auto-generate tutorial slug from title
function autoGenerateTutorialSlug(event) {
    try {
        const title = event.target.value;
        const slugInput = document.getElementById('tutorial-slug');
        
        if (slugInput && title) {
            // Generate slug from title
            const slug = title
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
                .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
                .replace(/\s+/g, '-') // Replace spaces with hyphens
                .replace(/-+/g, '-') // Replace multiple hyphens with single
                .trim();
            
            slugInput.value = slug;
        }
    } catch (error) {
        console.error('Error auto-generating tutorial slug:', error);
    }
}

// Load tutorial categories for edit form (preserves current value)
async function loadTutorialCategoriesForEditForm() {
    try {
        console.log('🔄 Loading tutorial categories for edit form...');
        
        const response = await fetch('/api/tutorial-categories', {
            method: 'GET'
        });
        
        console.log('📡 API Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const categories = await response.json();
        console.log('📋 Categories received:', categories.length, 'categories');
        
        const select = document.getElementById('tutorial-category');
        if (!select) {
            console.error('❌ Tutorial category select element not found');
            return;
        }
        
        console.log('✅ Found tutorial category select element');
        
        // Store current value before clearing
        const currentValue = select.value;
        console.log('💾 Current value before loading:', currentValue);
        
        // Clear existing options except first one
        select.innerHTML = '<option value="">Chọn danh mục</option>';
        
        if (categories && categories.length > 0) {
            console.log('📝 BẮT ĐẦU THÊM CÁC DANH MỤC VÀO DROPDOWN:');
            categories.forEach((category, index) => {
                const option = document.createElement('option');
                option.value = category._id;
                option.textContent = category.name;
                select.appendChild(option);
                console.log(`   ${index + 1}. ✅ Added: ${category.name} (${category._id})`);
            });
            console.log(`🎉 HOÀN THÀNH! Đã thêm ${categories.length} danh mục vào dropdown`);
            
            // Restore the current value (only if it's not null/empty)
            if (currentValue && currentValue !== 'null' && currentValue !== '') {
                select.value = currentValue;
                console.log('🔄 Restored value to:', currentValue);
            } else {
                console.log('ℹ️ No category selected (value is null/empty)');
            }
        } else {
            console.warn('⚠️ No tutorial categories found');
        }
        
    } catch (error) {
        console.error('❌ Error loading tutorial categories for edit form:', error);
    }
}

// Load tutorial categories for form
async function loadTutorialCategoriesForForm() {
    try {
        console.log('🔄 Loading tutorial categories for form...');
        
        const response = await fetch('/api/tutorial-categories', {
            method: 'GET'
        });
        
        console.log('📡 API Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const categories = await response.json();
        console.log('📋 Categories received:', categories.length, 'categories');
        console.log('📋 Categories data:', categories);
        console.log('🔢 SỐ DANH MỤC LOAD ĐƯỢC:', categories.length);
        console.log('🎯 TỔNG SỐ DANH MỤC:', categories.length);
        console.log('📝 DANH SÁCH DANH MỤC:');
        categories.forEach((cat, index) => {
            console.log(`   ${index + 1}. ${cat.name} (ID: ${cat._id})`);
        });
        
        const select = document.getElementById('tutorial-category');
        console.log('🔍 Đang tìm element với ID: tutorial-category');
        console.log('🔍 Element tìm được:', select);
        if (!select) {
            console.error('❌ Tutorial category select element not found');
            console.error('❌ Có thể form chưa được mở hoặc element chưa tồn tại');
            return;
        }
        
        console.log('✅ Found tutorial category select element');
        
        // Clear existing options except first one
        select.innerHTML = '<option value="">Chọn danh mục</option>';
        console.log('🧹 Đã xóa options cũ, bắt đầu thêm options mới...');
        
        if (categories && categories.length > 0) {
            console.log('📝 BẮT ĐẦU THÊM CÁC DANH MỤC VÀO DROPDOWN:');
            categories.forEach((category, index) => {
                const option = document.createElement('option');
                option.value = category._id;
                option.textContent = category.name;
                select.appendChild(option);
                console.log(`   ${index + 1}. ✅ Added: ${category.name} (${category._id})`);
            });
            console.log(`🎉 HOÀN THÀNH! Đã thêm ${categories.length} danh mục vào dropdown`);
            
            // Kiểm tra số options trong dropdown
            const totalOptions = select.options.length;
            console.log(`🔍 TỔNG SỐ OPTIONS TRONG DROPDOWN: ${totalOptions}`);
            console.log('📋 DANH SÁCH OPTIONS TRONG DROPDOWN:');
            for (let i = 0; i < select.options.length; i++) {
                console.log(`   ${i + 1}. "${select.options[i].textContent}" (value: "${select.options[i].value}")`);
            }
        } else {
            console.warn('⚠️ No tutorial categories found');
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Chưa có danh mục nào';
            option.disabled = true;
            select.appendChild(option);
        }
        
    } catch (error) {
        console.error('❌ Error loading tutorial categories for form:', error);
        
        // Show error in dropdown
        const select = document.getElementById('tutorial-category');
        if (select) {
            select.innerHTML = '<option value="">Lỗi tải danh mục</option>';
        }
    }
}

// Test function to manually load categories (for debugging)
async function testLoadTutorialCategories() {
    console.log('🧪 Testing tutorial categories loading...');
    await loadTutorialCategoriesForForm();
}

// Function to check dropdown status
function checkDropdownStatus() {
    const select = document.getElementById('tutorial-category');
    if (!select) {
        console.log('❌ Dropdown element not found!');
        return;
    }
    
    console.log('🔍 KIỂM TRA DROPDOWN HIỆN TẠI:');
    console.log(`📊 Tổng số options: ${select.options.length}`);
    console.log('📋 Danh sách options:');
    for (let i = 0; i < select.options.length; i++) {
        console.log(`   ${i + 1}. "${select.options[i].textContent}" (value: "${select.options[i].value}")`);
    }
    
    // Kiểm tra dropdown có hiển thị không
    const isVisible = select.offsetParent !== null;
    console.log(`👁️ Dropdown có hiển thị không: ${isVisible ? 'CÓ' : 'KHÔNG'}`);
    console.log(`📏 Kích thước dropdown: width=${select.offsetWidth}px, height=${select.offsetHeight}px`);
}

// Make test functions available globally
window.testLoadTutorialCategories = testLoadTutorialCategories;
window.checkDropdownStatus = checkDropdownStatus;

// Load projects - CLEAN VERSION
async function loadProjects() {
    try {

        
        const response = await fetch('/api/admin/projects', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const projects = await response.json();

        
        const tbody = document.getElementById('projects-table-body');
        if (!tbody) {
            console.error('Projects table body not found');
            return;
        }
        
        let html = '';
        
        // Add test row
        // html += `
        //     <tr>
        //         <td>TEST</td>
        //         <td>Test Project</td>
        //         <td>Test Description</td>
        //         <td>30 phút</td>
        //         <td>https://test.com</td>
        //         <td>
        //             <div class="action-buttons">
        //                 <button class="btn-edit" onclick="alert('TEST EDIT')">Sửa</button>
        //                 <button class="btn-delete" onclick="alert('TEST DELETE')">Xóa</button>
        //             </div>
        //         </td>
        //     </tr>
        // `;
        
        // Add real projects
        if (projects && projects.length > 0) {
            projects.forEach(project => {
                html += `
                    <tr>
                        <td>${project._id || 'N/A'}</td>
                        <td>${project.name || 'N/A'}</td>
                        <td>${project.description ? project.description.substring(0, 50) + '...' : 'N/A'}</td>
                        <td>${project.duration || 'N/A'}</td>
                        <td>${project.link || 'N/A'}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn-edit" onclick="editProject('${project._id}')">Sửa</button>
                                <button class="btn-delete" onclick="deleteProject('${project._id}')">Xóa</button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        } else {
            html += `
                <tr>
                    <td colspan="6" class="no-data">Không có dự án nào</td>
                </tr>
            `;
        }
        
        tbody.innerHTML = html;

        
        // Initialize rich text editors after loading
        initializeProjectRichTextEditor();
        
        // Add event listener for edit form
        const editForm = document.getElementById('edit-project-form-submit');
        if (editForm) {
            editForm.addEventListener('submit', handleEditProjectSubmit);
        }
        
    } catch (error) {
        console.error('❌ Error loading projects:', error);
        const tbody = document.getElementById('projects-table-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="no-data">Lỗi: ${error.message}</td>
                </tr>
            `;
        }
    }
}

// Edit project
async function editProject(projectId) {
    try {

        
        // Fetch specific project data
        const response = await fetch(`/api/admin/projects/${projectId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const project = await response.json();
        

        
        if (!project) {
            alert('Không tìm thấy dự án');
            return;
        }
        
        // Fill edit form with project data

        
        document.getElementById('edit-project-name').value = project.name || '';
        document.getElementById('edit-project-slug').value = project.slug || '';
        document.getElementById('edit-project-short-description').value = project.shortDescription || '';
        document.getElementById('edit-project-tags').value = Array.isArray(project.tags) ? project.tags.join(', ') : (project.tags || '');
        document.getElementById('edit-project-duration').value = project.duration || '';
        document.getElementById('edit-project-link').value = project.link || '';
        document.getElementById('edit-project-category').value = project.category || '';
        document.getElementById('edit-project-level').value = project.level || 'beginner';
        document.getElementById('edit-project-price').value = project.price || 0;
        

        
        // Fill SEO fields
        if (project.seo) {

            document.getElementById('edit-project-seo-title').value = project.seo.title || '';
            document.getElementById('edit-project-seo-description').value = project.seo.description || '';
            document.getElementById('edit-project-seo-keywords').value = Array.isArray(project.seo.keywords) ? project.seo.keywords.join(', ') : (project.seo.keywords || '');
            document.getElementById('edit-project-canonical').value = project.seo.canonical || '';
            document.getElementById('edit-project-og-title').value = project.seo.ogTitle || '';
            document.getElementById('edit-project-og-description').value = project.seo.ogDescription || '';
            document.getElementById('edit-project-og-image').value = project.seo.ogImage || '';

        } else {

        }
        
        // Set rich text content

        const contentDiv = document.getElementById('edit-project-content');
        const contentHidden = document.getElementById('edit-project-content-hidden');
        
        if (contentDiv) {
            // Clear content first to avoid duplication
            contentDiv.innerHTML = '';
            contentDiv.innerHTML = project.description || '';

        }
        if (contentHidden) {
            contentHidden.value = project.description || '';

        }
        
        // Store editing project ID
        window.editingProjectId = projectId;
        
        // Show edit form
        showEditProjectForm();
        
        // Initialize rich text editor for edit form
        setTimeout(() => {
            initializeProjectRichTextEditor();
        }, 100);
        
    } catch (error) {
        console.error('Error editing project:', error);
        alert('Lỗi khi tải dữ liệu dự án');
    }
}

// Delete project (remove featured status)
async function deleteProject(projectId) {
    try {
        if (!confirm('Bạn có chắc chắn muốn xóa dự án này khỏi danh sách tiêu biểu?')) {
            return;
        }
        

        
        const response = await fetch(`/api/admin/projects/${projectId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('Xóa dự án thành công!');
            loadProjects();
            loadAdminStats();
        } else {
            alert(`Lỗi: ${result.error}`);
        }
        
    } catch (error) {
        console.error('Error deleting project:', error);
        alert('Lỗi khi xóa dự án');
    }
}

// Initialize project form submit
function initializeProjectFormSubmit() {
    try {
        const form = document.getElementById('project-form');
        if (!form) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitProjectForm();
        });
        

    } catch (error) {
        console.error('Error initializing project form submit:', error);
    }
}

// Submit project form
async function submitProjectForm() {
    try {
        const form = document.getElementById('project-form');
        if (!form) return;
        
        const formData = new FormData(form);
        
        // Get rich text content
        const content = document.getElementById('project-content')?.innerHTML || '';
        formData.set('description', content);
        
        // Get form data
        const projectData = {
            name: formData.get('name'),
            description: formData.get('description'),
            duration: formData.get('duration'),
            link: formData.get('link'),
            slug: formData.get('slug') || '',
            tags: (formData.get('tags') || '').split(',').map(t=>t.trim()).filter(Boolean),
            seo: {
                title: formData.get('seoTitle') || '',
                description: formData.get('seoDescription') || '',
                keywords: (formData.get('seoKeywords') || '').split(',').map(s=>s.trim()).filter(Boolean),
                canonical: formData.get('seoCanonical') || '',
                ogTitle: formData.get('ogTitle') || '',
                ogDescription: formData.get('ogDescription') || '',
                ogImage: formData.get('ogImage') || ''
            }
        };
        

        
        const response = await fetch('/api/admin/projects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify(projectData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('Thêm dự án thành công!');
            hideAddProjectForm();
            loadProjects();
            loadAdminStats();
            form.reset();
        } else {
            alert(`Lỗi: ${result.error}`);
        }
        
    } catch (error) {
        console.error('Error submitting project form:', error);
        alert('Lỗi khi thêm dự án');
    }
}

// Show add project form

// Initialize edit project form submit
function initializeEditProjectFormSubmit() {
    try {
        const form = document.getElementById('edit-project-form-submit');
        if (!form) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitEditProjectForm();
        });
        

    } catch (error) {
        console.error('Error initializing edit project form submit:', error);
    }
}

// Submit edit project form
async function submitEditProjectForm() {
    try {
        const form = document.getElementById('edit-project-form-submit');
        if (!form) return;
        
        const projectId = window.editingProjectId;
        if (!projectId) {
            alert('Không tìm thấy ID dự án');
            return;
        }
        
        const formData = new FormData(form);
        
        // Get rich text content
        const content = document.getElementById('edit-project-content')?.innerHTML || '';
        formData.set('description', content);
        
        // Get form data
        const projectData = {
            name: formData.get('name'),
            description: formData.get('description'),
            duration: formData.get('duration'),
            link: formData.get('link'),
            category: 'Dự án STEAM',
            level: 'beginner',
            price: 0
        };
        

        
        const response = await fetch(`/api/admin/projects/${projectId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify(projectData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            hideEditProjectForm();
            loadProjects();
            loadAdminStats();
            form.reset();
            window.editingProjectId = null;
        } else {
            alert(`Lỗi: ${result.error}`);
        }
        
    } catch (error) {
        console.error('Error submitting edit project form:', error);
        alert('Lỗi khi cập nhật dự án');
    }
}

// Show edit project form
function showEditProjectForm() {
    try {
        const form = document.getElementById('edit-project-form');
        if (form) {
            form.style.display = 'block';
            try { form.scrollIntoView({ behavior: 'auto' }); } catch (error) { try { window.scrollTo(0, form.getBoundingClientRect().top + window.pageYOffset); } catch (_) {} }
        }
    } catch (error) {
        console.error('Error showing edit project form:', error);
    }
}

// Hide edit project form
function hideEditProjectForm() {
    try {
        const form = document.getElementById('edit-project-form');
        if (form) {
            form.style.display = 'none';
        }
        window.editingProjectId = null;
    } catch (error) {
        console.error('Error hiding edit project form:', error);
    }
}

// Load tutorials
async function loadTutorials() {
    try {

        
        const token = localStorage.getItem('adminToken');

        
        if (!token) {

            window.location.href = '/login.html';
            return;
        }
        
        const tutorialsResponse = await fetch('/api/tutorials', {
            method: 'GET'
        });
        
        if (!tutorialsResponse.ok) {
            throw new Error(`HTTP ${tutorialsResponse.status}: ${tutorialsResponse.statusText}`);
        }
        
        const data = await tutorialsResponse.json();
        

        
        // Handle both direct array and paginated response
        const tutorials = data.tutorials || data;
        

        
        const tbody = document.getElementById('tutorials-table-body');
        if (!tbody) {
            console.warn('⚠️ Tutorials table body not found');
            return;
        }
        
        if (!tutorials || tutorials.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="no-data">Chưa có bài giảng nào</td></tr>';

            return;
        }
        
        // Load categories for display
        let categoryMap = {};
        try {
            const categoriesResponse = await fetch('/api/tutorial-categories');
            if (categoriesResponse.ok) {
                const categories = await categoriesResponse.json();
                categories.forEach(cat => {
                    categoryMap[cat._id] = cat.name;
                });

            }
        } catch (catError) {
            console.warn('⚠️ Could not load categories for display:', catError);
        }
        
        tbody.innerHTML = tutorials.map(tutorial => {
            try {
                const views = tutorial.views || 0;
                return `
                    <tr>
                        <td>
                            <div class="tutorial-info">
                                <div class="tutorial-title">${tutorial.title || 'Không có tiêu đề'}</div>
                                <div class="tutorial-meta">
                                    <span class="tutorial-slug">/${tutorial.slug || 'no-slug'}</span>
                                </div>
                            </div>
                        </td>
                        <td>${tutorial.author || 'N/A'}</td>
                        <td>${tutorial.categoryId ? (categoryMap[tutorial.categoryId] || 'N/A') : 'N/A'}</td>
                        <td>
                            <span class="difficulty-badge difficulty-${tutorial.difficulty || 'beginner'}">
                                ${getDifficultyText(tutorial.difficulty)}
                            </span>
                        </td>
                        <td>
                            <span class="status-badge ${tutorial.isPublished ? 'status-active' : 'status-inactive'}">
                                ${tutorial.isPublished ? 'Đã xuất bản' : 'Bản nháp'}
                            </span>
                        </td>
                        <td>
                            <span class="view-count" title="View count from database">${views}</span>
                            ${views > 0 ? '<span class="view-indicator">📊</span>' : ''}
                        </td>
                        <td>${tutorial.createdAt ? new Date(tutorial.createdAt).toLocaleDateString('vi-VN') : 'N/A'}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="edit-btn" onclick="editTutorial('${tutorial._id}')" title="Sửa">
                                    <span>✏️</span>
                                </button>
                                <button class="delete-btn" onclick="deleteTutorial('${tutorial._id}')" title="Xóa">
                                    <span>🗑️</span>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            } catch (renderError) {
                console.error('❌ Error rendering tutorial row:', renderError, tutorial);
                return `
                    <tr>
                        <td colspan="8" class="error">Lỗi hiển thị bài giảng: ${tutorial._id}</td>
                    </tr>
                `;
            }
        }).join('');
        

        
    } catch (error) {
        console.error('❌ Error loading tutorials:', error);
        const tbody = document.getElementById('tutorials-table-body');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" class="error">Lỗi khi tải bài giảng: ${error.message}</td></tr>`;
        }
    }
}

// Edit tutorial
async function editTutorial(tutorialId) {
    try {

        
        // Fetch tutorials data
        const response = await fetch('/api/tutorials', {
            method: 'GET'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const tutorials = Array.isArray(data) ? data : (data.tutorials || []);
        const tutorial = tutorials.find(t => (t._id === tutorialId) || (t.id === tutorialId));
        

        
        if (!tutorial) {
            alert('Không tìm thấy bài giảng');
            return;
        }
        
        // Fill edit form with tutorial data

        
        const titleInput = document.getElementById('tutorial-title');
        if (titleInput) titleInput.value = tutorial.title || '';
        
        const slugInput = document.getElementById('tutorial-slug');
        if (slugInput) slugInput.value = tutorial.slug || '';
        
        const descriptionInput = document.getElementById('tutorial-description');
        if (descriptionInput) descriptionInput.value = tutorial.description || '';
        
        const authorInput = document.getElementById('tutorial-author');
        if (authorInput) authorInput.value = tutorial.author || '';
        
        const tagsInput = document.getElementById('tutorial-tags');
        if (tagsInput) tagsInput.value = Array.isArray(tutorial.tags) ? tutorial.tags.join(', ') : (tutorial.tags || '');
        
        const durationInput = document.getElementById('tutorial-duration');
        if (durationInput) durationInput.value = tutorial.duration || 0;
        
        const videoInput = document.getElementById('tutorial-video');
        if (videoInput) videoInput.value = tutorial.videoUrl || '';
        
        // Load tutorial categories first
        console.log('🔄 Loading tutorial categories for edit form...');
        await loadTutorialCategoriesForEditForm();
        
        const categoryInput = document.getElementById('tutorial-category');
        if (categoryInput) {
            const categoryId = tutorial.categoryId || '';
            categoryInput.value = categoryId;
            console.log('✅ Set category value to:', categoryId);
            console.log('📋 Tutorial category data:', {
                categoryId: tutorial.categoryId,
                categoryName: tutorial.categoryName || 'N/A',
                hasCategory: !!tutorial.categoryId
            });
        }
        
        const difficultyInput = document.getElementById('tutorial-difficulty');
        if (difficultyInput) difficultyInput.value = tutorial.difficulty || 'beginner';
        
        const publishedInput = document.getElementById('tutorial-published');
        if (publishedInput) publishedInput.checked = tutorial.isPublished || false;
        

        
        // Set rich text content

        const contentEditor = document.getElementById('tutorial-content');
        
        if (contentEditor) {
            // For contenteditable div, use innerHTML
            contentEditor.innerHTML = tutorial.content || '';

            
            // Also update hidden input if it exists
            const hiddenInput = document.getElementById('tutorial-content-hidden');
            if (hiddenInput) {
                hiddenInput.value = tutorial.content || '';
            }
        }
        
        // Featured image
        if (tutorial.featuredImage) {
            const featuredImageInput = document.getElementById('tutorial-featured-image');
            if (featuredImageInput) {
                featuredImageInput.value = tutorial.featuredImage;
                
                // Show preview
                const preview = document.getElementById('featured-image-preview');
                const previewImg = document.getElementById('featured-image-preview-img');
                const placeholder = document.getElementById('featured-image-placeholder');
                const clearBtn = document.getElementById('clear-featured-btn');
                
                if (preview && previewImg && placeholder && clearBtn) {
                    previewImg.src = tutorial.featuredImage;
                    preview.style.display = 'block';
                    placeholder.style.display = 'none';
                    clearBtn.style.display = 'inline-block';
                }
            }
        }
        
        // Store editing tutorial ID
        window.editingTutorialId = tutorialId;
        
        // Show edit form
        showEditTutorialForm(tutorial);
        
        // Initialize rich text editor for edit form
        setTimeout(() => {
            if (window.adminDashboard && window.adminDashboard.initializeFallbackRichTextEditors) {
                window.adminDashboard.initializeFallbackRichTextEditors();
            } else {
                initializeTutorialRichTextEditor();
            }
        }, 100);
        
    } catch (error) {
        console.error('Error editing tutorial:', error);
        alert('Lỗi khi tải dữ liệu bài giảng');
    }
}

// Reset form to add mode
function resetFormToAddMode() {
    try {
        // Clear editing state
        window.editingTutorialId = null;
        
        // Reset form title and submit button
        const formTitle = document.querySelector('#add-tutorial-form h3');
        if (formTitle) {
            formTitle.textContent = '📝 Thêm Bài giảng Mới';
        }
        
        const submitBtn = document.querySelector('#tutorial-form button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = '💾 Lưu Bài giảng';
        }
        

    } catch (error) {
        console.error('Error resetting form to add mode:', error);
    }
}

// Show edit tutorial form
function showEditTutorialForm(tutorial) {
    try {

        
        // Show the add form (we'll reuse it for editing)
        const form = document.getElementById('add-tutorial-form');
        if (form) {

            form.style.display = 'block';


            try { form.scrollIntoView({ behavior: 'auto' }); } catch (error) { try { window.scrollTo(0, form.getBoundingClientRect().top + window.pageYOffset); } catch (_) {} }
        } else {
            console.error('❌ Form not found: add-tutorial-form');
        }
        
        // Change form title and submit button
        const formTitle = document.querySelector('#add-tutorial-form h3');
        if (formTitle) {
            formTitle.textContent = '✏️ Chỉnh sửa Bài giảng';

        } else {
            console.warn('⚠️ Form title not found');
        }
        
        const submitBtn = document.querySelector('#tutorial-form button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = '💾 Cập nhật Bài giảng';

        } else {
            console.warn('⚠️ Submit button not found');
        }
        

        
    } catch (error) {
        console.error('Error showing edit tutorial form:', error);
    }
}


// Delete tutorial
async function deleteTutorial(tutorialId) {
    try {
        if (!confirm('Bạn có chắc chắn muốn xóa bài giảng này?')) {
            return;
        }
        
        const response = await fetch(`/api/admin/tutorials/${tutorialId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('Xóa bài giảng thành công!');
            loadTutorials();
            loadAdminStats();
        } else {
            alert(`Lỗi: ${result.error}`);
        }
        
    } catch (error) {
        console.error('Error deleting tutorial:', error);
        alert('Lỗi khi xóa bài giảng');
    }
}

// Helper function for difficulty text
function getDifficultyText(difficulty) {
    const difficulties = {
        'beginner': 'Cơ bản',
        'intermediate': 'Trung cấp',
        'advanced': 'Nâng cao',
        'expert': 'Chuyên sâu'
    };
    return difficulties[difficulty] || 'Cơ bản';
}

// Edit Category Form Submission Handler
function initializeEditCategoryFormSubmit() {
    try {

        const form = document.getElementById('edit-category-form-content');
        if (!form) {
            console.warn('⚠️ Edit category form not found');
            return;
        }

        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            
            try {
                // Get form data
                const formData = new FormData(form);
                const categoryId = document.getElementById('edit-category-id').value;
                
                if (!categoryId) {
                    throw new Error('Category ID is required');
                }
                
                const categoryData = {
                    name: formData.get('name'),
                    slug: formData.get('slug'),
                    description: formData.get('description'),
                    icon: formData.get('icon')
                };
                

                
                // Validate required fields
                if (!categoryData.name || !categoryData.slug) {
                    throw new Error('Tên danh mục và slug là bắt buộc');
                }
                
                // Call updateCategory function
                await adminDashboard.updateCategory(categoryId, categoryData);
                

                
            } catch (error) {
                console.error('❌ Error submitting edit category form:', error);
                alert('❌ Lỗi khi cập nhật danh mục: ' + error.message);
            }
        });
        

    } catch (error) {
        console.error('❌ Error initializing edit category form submit:', error);
    }
}

// Edit Category Icon Upload Handler
function initializeEditCategoryIconUpload() {
    try {

        
        const iconFileInput = document.getElementById('edit-category-icon-file');
        const iconPreview = document.getElementById('edit-icon-preview');
        const currentIconSpan = document.getElementById('edit-current-icon');
        const iconHiddenInput = document.getElementById('edit-category-icon');
        
        if (!iconFileInput || !iconPreview || !currentIconSpan || !iconHiddenInput) {
            console.warn('⚠️ Edit category icon upload elements not found');
            return;
        }
        
        iconFileInput.addEventListener('change', function(e) {
            try {
                const file = e.target.files[0];
                if (!file) return;
                

                
                // Validate file type
                if (!file.type.startsWith('image/')) {
                    alert('Vui lòng chọn file ảnh hợp lệ');
                    return;
                }
                
                // Validate file size (max 2MB)
                if (file.size > 2 * 1024 * 1024) {
                    alert('Kích thước file không được vượt quá 2MB');
                    return;
                }
                
                // Create FileReader to convert to base64
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const base64String = e.target.result;

                        
                        // Update preview
                        currentIconSpan.innerHTML = `<img src="${base64String}" alt="Icon" style="width: 24px; height: 24px; object-fit: cover; border-radius: 4px;">`;
                        
                        // Update hidden input
                        iconHiddenInput.value = base64String;
                        

                    } catch (error) {
                        console.error('❌ Error processing edit category icon:', error);
                    }
                };
                
                reader.readAsDataURL(file);
                
            } catch (error) {
                console.error('❌ Error handling edit category icon upload:', error);
            }
        });
        

    } catch (error) {
        console.error('❌ Error initializing edit category icon upload:', error);
    }
}

// Hero Slider Management
class HeroSliderManagement {
    constructor() {
        this.slides = [];
        this.editingSlide = null;
        this.init();
    }

    async init() {
        try {

            await this.loadSlides();
            this.setupEventListeners();

        } catch (error) {
            console.error('❌ Error initializing Hero Slider Management:', error);
        }
    }

    setupEventListeners() {
        // Form submission
        const form = document.getElementById('hero-slide-form-content');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });
        }
    }

    async loadSlides() {
        try {

            const response = await fetch('/api/hero-slides');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const slidesData = await response.json();

            
            // Get all slides (including inactive ones) for admin management
            const allSlidesResponse = await fetch('/api/admin/hero-slides');
            if (allSlidesResponse.ok) {
                this.slides = await allSlidesResponse.json();
            } else {
                this.slides = slidesData; // Fallback to active slides only
            }
            
            this.renderSlides();
        } catch (error) {
            console.error('Error loading slides:', error);
            this.slides = [];
            this.renderSlides();
        }
    }

    renderSlides() {
        const container = document.getElementById('hero-slides-list');
        if (!container) return;

        if (this.slides.length === 0) {
            container.innerHTML = '<div class="text-center" style="padding: 2rem; color: #6b7280;">Chưa có slide nào. Hãy thêm slide đầu tiên!</div>';
            return;
        }

        container.innerHTML = this.slides
            .sort((a, b) => a.order - b.order)
            .map(slide => `
                <div class="hero-slide-item">
                    <div class="hero-slide-preview" style="background-image: url('${slide.image}')">
                        <div class="hero-slide-preview-content">
                            <div class="hero-slide-preview-title">${slide.title}</div>
                            <div class="hero-slide-preview-subtitle">${slide.subtitle}</div>
                        </div>
                    </div>
                    <div class="hero-slide-info">
                        <div class="hero-slide-title">${slide.title}</div>
                        <div class="hero-slide-meta">
                            <span>Thứ tự: ${slide.order}</span>
                            <span class="hero-slide-status ${slide.isActive ? 'active' : 'inactive'}">
                                ${slide.isActive ? 'Hiển thị' : 'Ẩn'}
                            </span>
                        </div>
                        <div class="hero-slide-actions">
                            <button class="btn btn-primary btn-sm" onclick="heroSliderManagement.editSlide('${slide._id}')">
                                ✏️ Sửa
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="heroSliderManagement.deleteSlide('${slide._id}')">
                                🗑️ Xóa
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
    }

    showAddForm() {
        this.editingSlide = null;
        document.getElementById('hero-slide-form-title').textContent = 'Thêm Slide Mới';
        document.getElementById('hero-slide-form').style.display = 'block';
        this.clearForm();
    }

    editSlide(id) {
        const slide = this.slides.find(s => s._id === id);
        if (!slide) return;

        this.editingSlide = slide;
        document.getElementById('hero-slide-form-title').textContent = 'Sửa Slide';
        document.getElementById('hero-slide-form').style.display = 'block';
        this.fillForm(slide);
    }

    fillForm(slide) {
        document.getElementById('hero-slide-id').value = slide._id;
        document.getElementById('hero-slide-title').value = slide.title;
        document.getElementById('hero-slide-subtitle').value = slide.subtitle || '';
        document.getElementById('hero-slide-button-text').value = slide.buttonText || '';
        document.getElementById('hero-slide-button-link').value = slide.buttonLink || '';
        document.getElementById('hero-slide-button2-text').value = slide.button2Text || '';
        document.getElementById('hero-slide-button2-link').value = slide.button2Link || '';
        document.getElementById('hero-slide-order').value = slide.order;
        document.getElementById('hero-slide-active').value = slide.isActive.toString();
        document.getElementById('hero-slide-image').value = slide.image;

        // Show image preview
        if (slide.image) {
            const preview = document.getElementById('hero-slide-image-preview');
            const img = document.getElementById('hero-slide-preview-img');
            img.src = slide.image;
            preview.style.display = 'block';
        }
    }

    clearForm() {
        document.getElementById('hero-slide-form-content').reset();
        document.getElementById('hero-slide-image-preview').style.display = 'none';
    }

    hideForm() {
        document.getElementById('hero-slide-form').style.display = 'none';
        this.editingSlide = null;
    }

    async handleSubmit() {
        try {
            const formData = new FormData(document.getElementById('hero-slide-form-content'));
            const slideData = {
                title: formData.get('title'),
                subtitle: formData.get('subtitle'),
                buttonText: formData.get('buttonText'),
                buttonLink: formData.get('buttonLink'),
                button2Text: formData.get('button2Text'),
                button2Link: formData.get('button2Link'),
                order: parseInt(formData.get('order')),
                isActive: formData.get('isActive') === 'true',
                image: formData.get('image')
            };

            if (this.editingSlide) {
                // Update existing slide
                slideData._id = this.editingSlide._id;
                slideData.id = this.editingSlide._id; // For compatibility
                // Keep original createdAt for updates
                if (this.editingSlide.createdAt) {
                    slideData.createdAt = this.editingSlide.createdAt;
                }
            }

            // Send to API
            const response = await fetch('/api/hero-slides', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(slideData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }


            
            // Reload slides from API
            await this.loadSlides();
            this.hideForm();
            alert('Slide đã được lưu thành công!');
            
        } catch (error) {
            console.error('Error saving slide:', error);
            alert('Có lỗi xảy ra khi lưu slide!');
        }
    }

    async deleteSlide(id) {
        if (!confirm('Bạn có chắc chắn muốn xóa slide này?')) return;

        try {
            // Send delete request to API
            const response = await fetch(`/api/hero-slides/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }


            
            // Reload slides from API
            await this.loadSlides();
            alert('Slide đã được xóa thành công!');
            
        } catch (error) {
            console.error('Error deleting slide:', error);
            alert('Có lỗi xảy ra khi xóa slide!');
        }
    }
}

// Global functions for hero slider
function showAddHeroSlideForm() {
    window.heroSliderManagement.showAddForm();
}

function hideHeroSlideForm() {
    window.heroSliderManagement.hideForm();
}

function previewHeroSlideImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('hero-slide-image-preview');
            const img = document.getElementById('hero-slide-preview-img');
            img.src = e.target.result;
            preview.style.display = 'block';
            
            // Store image data
            document.getElementById('hero-slide-image').value = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function removeHeroSlideImage() {
    document.getElementById('hero-slide-image-preview').style.display = 'none';
    document.getElementById('hero-slide-image').value = '';
    document.getElementById('hero-slide-image-input').value = '';
}

// Custom Smart Steam Admin Navigation Functionality
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Check admin authentication first
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {

            window.location.href = '/admin-login.html';
            return;
        }

        // Verify token validity
        fetch('/api/admin/verify-token', {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        }).then(response => {
            if (!response.ok) {

                localStorage.removeItem('adminToken');
                window.location.href = '/admin-login.html';
                return;
            }

        }).catch(error => {
            console.error('Error verifying token:', error);
            localStorage.removeItem('adminToken');
            window.location.href = '/admin-login.html';
            return;
        });
        
        // Initialize Admin Dashboard
        adminDashboard.init();

        // Initialize Sidebar Panel
        sidebarPanel.init();
        
        // Initialize User Management if on admin-main page
        if (window.location.pathname.includes('admin-main')) {
            window.userManager = new UserManagement();
        }
        
        // Load admin stats
        loadAdminStats();
        
        // Initialize Image Upload functionality
        initializeImageUpload();
        
        // Initialize Featured Image Preview
        initializeFeaturedImagePreview();
        
        // Initialize Hero Slider Management
        window.heroSliderManagement = new HeroSliderManagement();
        
        // Initialize Category Icon Upload
        initializeCategoryIconUpload();
        
        // Initialize Product Form Submit
        initializeProductFormSubmit();
        
        // Initialize Project Form Submit
        initializeProjectFormSubmit();
        
        // Initialize Edit Project Form Submit
        initializeEditProjectFormSubmit();
        
        // Initialize Category Form Submit
        initializeCategoryFormSubmit();
        
        // Initialize Edit Product Form Submit - REMOVED (using initializeProductFormSubmit instead)
        // initializeEditProductFormSubmit();
        
        // Initialize Edit Product Image Upload
        initializeEditProductImageUpload();
        
        // Initialize Edit Category Form Submit
        initializeEditCategoryFormSubmit();
        
        // Initialize Edit Category Icon Upload
        initializeEditCategoryIconUpload();
        
        // Initialize News Category Form Submit
        initializeNewsCategoryFormSubmit();
        
        // Initialize Edit News Category Form Submit
        initializeEditNewsCategoryFormSubmit();
        
        // Initialize Image Library
        initializeAdminImageLibrary();

    } catch (error) {
        console.error('Error in DOMContentLoaded:', error);
    }
});

// News Categories Management Functions

function initializeAdminImageLibrary(){
    try {
        const uploadInput = document.getElementById('image-upload-input');
        const pasteArea = document.getElementById('image-paste-area');
        if (uploadInput) {
            uploadInput.addEventListener('change', async function(){
                const file = this.files && this.files[0];
                if (!file) return;
                try {
                    const form = new FormData();
                    form.append('image', file);
                    const customName = (document.getElementById('image-filename-input') || {}).value || '';
                    if (customName) form.append('filename', customName);
                    const res = await fetch('/api/admin/images/upload', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
                        },
                        body: form
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Upload failed');
                    await loadAdminImages();
                    this.value = '';
                } catch (e) {
                    alert('Upload lỗi');
                }
            });
            loadAdminImages();
        }

        if (pasteArea) {
            const pasteUploadBtn = document.getElementById('image-paste-upload-btn');
            let pastedBlob = null;

            pasteArea.addEventListener('paste', async function(e){
                try {
                    const items = (e.clipboardData || window.clipboardData).items;
                    if (!items) return;
                    for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        if (item.type && item.type.indexOf('image') !== -1) {
                            e.preventDefault();
                            const file = item.getAsFile();
                            if (!file) continue;
                            pastedBlob = file;
                            // preview
                            const reader = new FileReader();
                            reader.onload = function(ev){
                                pasteArea.innerHTML = `<img src="${ev.target.result}" alt="preview" style="max-width:100%; height:auto; border-radius:6px;">`;
                                if (pasteUploadBtn) pasteUploadBtn.disabled = false;
                            };
                            reader.readAsDataURL(file);
                            break;
                        }
                    }
                } catch (_) {}
            });

            if (pasteUploadBtn) {
                pasteUploadBtn.addEventListener('click', async function(){
                    if (!pastedBlob) return;
                    try {
                        const form = new FormData();
                        form.append('image', pastedBlob, 'pasted.png');
                        const customName = (document.getElementById('image-filename-input') || {}).value || '';
                        if (customName) form.append('filename', customName);
                        const res = await fetch('/api/admin/images/upload', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
                            },
                            body: form
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Upload failed');
                        await loadAdminImages();
                        pasteArea.innerHTML = '<span style="color:#6b7280;">Dán ảnh trực tiếp (Ctrl + V) vào đây để upload</span>';
                        pastedBlob = null;
                        pasteUploadBtn.disabled = true;
                    } catch (err) {
                        alert('Upload lỗi');
                    }
                });
            }
        }

        const manualBtn = document.getElementById('image-upload-btn');
        if (manualBtn && uploadInput) {
            manualBtn.addEventListener('click', function(){
                uploadInput.click();
            });
        }
    } catch (e) {}
}

async function loadAdminImages(){
    try {
        const grid = document.getElementById('images-grid');
        if (!grid) return;
        grid.innerHTML = '<div class="loading">Đang tải...</div>';
        const res = await fetch('/api/admin/images', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
            }
        });
        const images = await res.json();
        if (!Array.isArray(images) || images.length === 0) {
            grid.innerHTML = '<p>Chưa có ảnh nào</p>';
            return;
        }
        grid.innerHTML = images.map(img => `
            <div class="image-preview-item">
                <img src="${img.url}" alt="${img.filename}">
                <div class="image-info">
                    <span>${img.filename}</span>
                    <div style="display:flex; gap:6px; align-items:center;">
                        <button class="remove-image" onclick="deleteAdminImage('${img.filename}')">✕</button>
                        <button class="btn btn-sm" onclick="pickLibraryImage('${img.url}')">Chèn</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (e) {}
}

// ============== Library Picker for editors ==============
let currentLibraryTarget = null;
let allLibraryImages = []; // Lưu trữ tất cả ảnh để tìm kiếm

function openLibraryPicker(targetEditorId){
    if (!targetEditorId) {
        const sel = document.getElementById('images-insert-target');
        currentLibraryTarget = sel ? sel.value : null;
    } else {
        currentLibraryTarget = targetEditorId;
    }
    const modal = document.getElementById('library-picker-modal');
    const grid = document.getElementById('library-grid');
    const searchInput = document.getElementById('library-search-input');
    const stats = document.getElementById('library-stats');
    
    if (!modal || !grid) {

        return;
    }
    modal.style.display = 'block';
    
    // Clear search input
    if (searchInput) {
        searchInput.value = '';
    }
    
    (async () => {
        grid.innerHTML = '<div class="loading">Đang tải...</div>';
        const res = await fetch('/api/admin/images', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}` }
        });
        const images = await res.json();
        if (!Array.isArray(images) || images.length === 0) {
            grid.innerHTML = '<p>Chưa có ảnh nào</p>';
            allLibraryImages = [];
            if (stats) stats.textContent = '0 ảnh';
            return;
        }
        
        // Lưu trữ tất cả ảnh để tìm kiếm
        allLibraryImages = images;
        
        // Hiển thị tất cả ảnh
        renderLibraryImages(images);
        
        // Cập nhật thống kê
        if (stats) {
            stats.textContent = `${images.length} ảnh`;
        }
    })();
}

function closeLibraryPicker(){
    const modal = document.getElementById('library-picker-modal');
    if (modal) modal.style.display = 'none';
}

// Render ảnh trong thư viện
function renderLibraryImages(images) {
    const grid = document.getElementById('library-grid');
    const stats = document.getElementById('library-stats');
    
    if (!grid) return;
    
    if (images.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Không tìm thấy ảnh nào</p>';
        if (stats) stats.textContent = '0 ảnh';
        return;
    }
    
    grid.innerHTML = images.map(img => `
        <div class="image-preview-item" style="cursor:pointer" onclick="selectImageFromLibrary('${img.url}', '${img.filename}')">
            <img src="${img.url}" alt="${img.filename}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px;">
            <div class="image-info" style="padding: 8px; text-align: center;">
                <span style="font-size: 12px; color: #333; word-break: break-all;">${img.filename}</span>
            </div>
        </div>
    `).join('');
    
    if (stats) {
        stats.textContent = `${images.length} ảnh`;
    }
}

// Tìm kiếm ảnh theo tên
function searchLibraryImages() {
    const searchInput = document.getElementById('library-search-input');
    if (!searchInput || !allLibraryImages.length) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        // Hiển thị tất cả ảnh nếu không có từ khóa tìm kiếm
        renderLibraryImages(allLibraryImages);
        return;
    }
    
    // Lọc ảnh theo tên
    const filteredImages = allLibraryImages.filter(img => 
        img.filename.toLowerCase().includes(searchTerm)
    );
    
    renderLibraryImages(filteredImages);
}

// Xóa tìm kiếm và hiển thị tất cả ảnh
function clearLibrarySearch() {
    const searchInput = document.getElementById('library-search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    renderLibraryImages(allLibraryImages);
}

function pickLibraryImage(url){
    try {
        if (!currentLibraryTarget) return;
        if (currentLibraryTarget === 'admin-avatar-target') {
            const avatar = document.getElementById('user-avatar');
            if (avatar) {
                avatar.style.backgroundImage = `url('${url}')`;
                avatar.style.backgroundSize = 'cover';
                avatar.style.backgroundPosition = 'center';
                avatar.textContent = '';
            }
        } else if (currentLibraryTarget === 'news') {
            const imgEl = document.getElementById('news-author-avatar');
            if (imgEl) { imgEl.src = url; imgEl.style.display = 'inline-block'; }
        } else if (currentLibraryTarget === 'edit-news') {
            const imgEl = document.getElementById('edit-news-author-avatar');
            if (imgEl) { imgEl.src = url; imgEl.style.display = 'inline-block'; }
        } else if (currentLibraryTarget === 'tutorial') {
            const imgEl = document.getElementById('tutorial-author-avatar');
            if (imgEl) { imgEl.src = url; imgEl.style.display = 'inline-block'; }
        } else if (currentLibraryTarget === 'news-image') {
            const input = document.getElementById('news-image');
            const prev = document.getElementById('news-image-preview');
            if (input) {
                const absoluteUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
                input.value = absoluteUrl;
                try { input.dispatchEvent(new Event('input', { bubbles: true })); } catch(_) {}
                try { input.dispatchEvent(new Event('change', { bubbles: true })); } catch(_) {}
            }
            if (prev) { prev.src = url; prev.style.display = 'inline-block'; }
        } else if (currentLibraryTarget === 'edit-news-image') {
            const input = document.getElementById('edit-news-image');
            const prev = document.getElementById('edit-news-image-preview');
            if (input) {
                const absoluteUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
                input.value = absoluteUrl;
                try { input.dispatchEvent(new Event('input', { bubbles: true })); } catch(_) {}
                try { input.dispatchEvent(new Event('change', { bubbles: true })); } catch(_) {}
            }
            if (prev) { prev.src = url; prev.style.display = 'inline-block'; }
        } else {
            const img = document.createElement('img');
            img.src = url;
            img.alt = generateAltFromUrl(url);
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            const html = img.outerHTML;
            const editor = document.getElementById(currentLibraryTarget);
            if (editor) {
                document.execCommand('insertHTML', false, html);
            }
        }
        closeLibraryPicker();
    } catch (_) {}
}

function openAvatarPicker(scope){
    // scope: 'news' | 'edit-news' | 'tutorial'
    openLibraryPicker(scope);
}

async function deleteAdminImage(filename){
    if (!confirm('Xóa ảnh này?')) return;
    try {
        const res = await fetch(`/api/admin/images/${encodeURIComponent(filename)}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}`
            }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Delete failed');
        await loadAdminImages();
    } catch (e) {
        alert('Xóa thất bại');
    }
}

// Load news categories
async function loadNewsCategories() {
    try {

        
        const response = await fetch('/api/admin/news-categories', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const categories = await response.json();

        
        displayNewsCategories(categories);
        loadAdminStats(); // Update stats after loading categories
    } catch (error) {
        console.error('❌ Error loading news categories:', error);
        showNewsCategoriesError();
    }
}

// Display news categories in table
function displayNewsCategories(categories) {
    try {
        const tbody = document.getElementById('news-categories-table-body');
        if (!tbody) {

            return;
        }
        
        if (!categories || categories.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="no-data">Chưa có danh mục tin tức nào</td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = categories.map(category => `
            <tr>
                <td>${category._id ? category._id.substring(0, 8) + '...' : 'N/A'}</td>
                <td>
                    <div class="category-info">
                        <span class="category-icon" style="color: ${category.color || '#10b981'}">
                            ${category.icon && (category.icon.startsWith('http') || category.icon.startsWith('/')) 
                                ? `<img src="${category.icon}" alt="Icon" style="width: 20px; height: 20px; object-fit: contain;">` 
                                : (category.icon || '📰')}
                        </span>
                        <span class="category-name">${category.name}</span>
                    </div>
                </td>
                <td><code>${category.slug}</code></td>
                <td>
                    ${category.icon && (category.icon.startsWith('http') || category.icon.startsWith('/')) 
                        ? `<img src="${category.icon}" alt="Icon" style="width: 20px; height: 20px; object-fit: contain;">` 
                        : (category.icon || '📰')}
                </td>
                <td>
                    <span class="color-preview" style="background-color: ${category.color || '#10b981'}"></span>
                    ${category.color || '#10b981'}
                </td>
                <td>${category.description || '-'}</td>
                <td>
                    <span class="status-badge ${category.isActive ? 'active' : 'inactive'}">
                        ${category.isActive ? 'Kích hoạt' : 'Tạm khóa'}
                    </span>
                </td>
                <td>0</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="editNewsCategory('${category._id}')">
                            ✏️ Sửa
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteNewsCategory('${category._id}')">
                            🗑️ Xóa
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        

    } catch (error) {
        console.error('❌ Error displaying news categories:', error);
    }
}

// Show news categories error
function showNewsCategoriesError() {
    const tbody = document.getElementById('news-categories-table-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="error">Lỗi khi tải danh mục tin tức</td>
            </tr>
        `;
    }
}

// Show add news category form
function showAddNewsCategoryForm() {
    try {
        const form = document.getElementById('add-news-category-form');
        if (form) {
            form.style.display = 'block';
            try { form.scrollIntoView({ behavior: 'auto' }); } catch (error) { try { window.scrollTo(0, form.getBoundingClientRect().top + window.pageYOffset); } catch (_) {} }
        }
    } catch (error) {
        console.error('❌ Error showing add news category form:', error);
    }
}

// Hide add news category form
function hideAddNewsCategoryForm() {
    try {
        const form = document.getElementById('add-news-category-form');
        if (form) {
            form.style.display = 'none';
            form.reset();
        }
    } catch (error) {
        console.error('❌ Error hiding add news category form:', error);
    }
}

// Show edit news category form
function showEditNewsCategoryForm() {
    try {
        const form = document.getElementById('edit-news-category-form');
        if (form) {
            form.style.display = 'block';
            try { form.scrollIntoView({ behavior: 'auto' }); } catch (error) { try { window.scrollTo(0, form.getBoundingClientRect().top + window.pageYOffset); } catch (_) {} }
        }
    } catch (error) {
        console.error('❌ Error showing edit news category form:', error);
    }
}

// Hide edit news category form
function hideEditNewsCategoryForm() {
    try {
        const form = document.getElementById('edit-news-category-form');
        if (form) {
            form.style.display = 'none';
            form.reset();
        }
    } catch (error) {
        console.error('❌ Error hiding edit news category form:', error);
    }
}

// Initialize news category form submit
function initializeNewsCategoryFormSubmit() {
    try {
        const form = document.getElementById('news-category-form');
        if (form) {
            form.addEventListener('submit', submitNewsCategoryForm);
        }
    } catch (error) {
        console.error('❌ Error initializing news category form submit:', error);
    }
}

// Submit news category form
async function submitNewsCategoryForm(e) {
    e.preventDefault();
    
    try {

        
        const formData = new FormData(e.target);
        const categoryData = {
            name: formData.get('name'),
            slug: formData.get('slug') || generateSlug(formData.get('name')),
            description: formData.get('description'),
            icon: formData.get('icon') || '📰',
            color: formData.get('color') || '#10b981',
            isActive: formData.get('isActive') === 'on'
        };
        

        
        const response = await fetch('/api/admin/news-categories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify(categoryData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create news category');
        }
        
        const result = await response.json();

        
        // Hide form and reload data
        hideAddNewsCategoryForm();
        loadNewsCategories();
        
        // Show success message
        alert('Danh mục tin tức đã được tạo thành công!');
        
    } catch (error) {
        console.error('❌ Error submitting news category form:', error);
        alert('Lỗi khi tạo danh mục tin tức: ' + error.message);
    }
}

// Initialize edit news category form submit
function initializeEditNewsCategoryFormSubmit() {
    try {
        const form = document.getElementById('edit-news-category-form-data');
        if (form) {
            form.addEventListener('submit', submitEditNewsCategoryForm);
        }
    } catch (error) {
        console.error('❌ Error initializing edit news category form submit:', error);
    }
}

// Submit edit news category form
async function submitEditNewsCategoryForm(e) {
    e.preventDefault();
    
    try {

        
        const formData = new FormData(e.target);
        const categoryId = formData.get('id');
        
        if (!categoryId) {
            throw new Error('Category ID is required');
        }
        
        const categoryData = {
            name: formData.get('name'),
            slug: formData.get('slug'),
            description: formData.get('description'),
            icon: formData.get('icon'),
            color: formData.get('color'),
            isActive: formData.get('isActive') === 'on'
        };
        

        
        const response = await fetch(`/api/admin/news-categories/${categoryId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify(categoryData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update news category');
        }
        
        const result = await response.json();

        
        // Hide form and reload data
        hideEditNewsCategoryForm();
        loadNewsCategories();
        
        // Show success message
        alert('Danh mục tin tức đã được cập nhật thành công!');
        
    } catch (error) {
        console.error('❌ Error submitting edit news category form:', error);
        alert('Lỗi khi cập nhật danh mục tin tức: ' + error.message);
    }
}

// Edit news category
async function editNewsCategory(categoryId) {
    try {

        
        const response = await fetch(`/api/admin/news-categories/${categoryId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const category = await response.json();

        
        // Populate edit form
        document.getElementById('edit-news-category-id').value = category._id;
        document.getElementById('edit-news-category-name').value = category.name;
        document.getElementById('edit-news-category-slug').value = category.slug;
        document.getElementById('edit-news-category-description').value = category.description || '';
        document.getElementById('edit-news-category-icon').value = category.icon || '📰';
        document.getElementById('edit-news-category-color').value = category.color || '#10b981';
        document.getElementById('edit-news-category-active').checked = category.isActive !== false;
        
        // Update icon preview
        updateIconPreview('edit-news-category-icon');
        
        // Show edit form
        showEditNewsCategoryForm();
        
    } catch (error) {
        console.error('❌ Error editing news category:', error);
        alert('Lỗi khi tải thông tin danh mục tin tức: ' + error.message);
    }
}

// Delete news category
async function deleteNewsCategory(categoryId) {
    try {
        if (!confirm('Bạn có chắc chắn muốn xóa danh mục tin tức này?')) {
            return;
        }
        

        
        const response = await fetch(`/api/admin/news-categories/${categoryId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete news category');
        }
        

        
        // Reload data
        loadNewsCategories();
        
        // Show success message
        alert('Danh mục tin tức đã được xóa thành công!');
        
    } catch (error) {
        console.error('❌ Error deleting news category:', error);
        alert('Lỗi khi xóa danh mục tin tức: ' + error.message);
    }
}


// Handle icon paste (text/URL)
async function handleIconPaste(inputId, event) {
    try {
        // Wait for paste to complete
        setTimeout(async () => {
            const input = document.getElementById(inputId);
            const pastedText = input.value;
            
            // Check if pasted text is a URL
            if (pastedText.startsWith('http') || pastedText.startsWith('data:')) {
                // If it's a data URL (base64 image), use it directly
                if (pastedText.startsWith('data:')) {
                    updateIconPreview(inputId);
                    return;
                }
                
                // If it's a regular URL, validate it's an image
                try {
                    const response = await fetch(pastedText, { method: 'HEAD' });
                    const contentType = response.headers.get('content-type');
                    
                    if (contentType && contentType.startsWith('image/')) {
                        updateIconPreview(inputId);
                    } else {
                        alert('URL không phải là hình ảnh hợp lệ');
                        input.value = '';
                        updateIconPreview(inputId);
                    }
                } catch (error) {
                    alert('Không thể truy cập URL hình ảnh');
                    input.value = '';
                    updateIconPreview(inputId);
                }
            } else {
                // Regular text/emoji, update preview
                updateIconPreview(inputId);
            }
        }, 10);
        
    } catch (error) {
        console.error('Error handling icon paste:', error);
    }
}

// Handle image paste (from clipboard)
async function handleImagePaste(inputId, event) {
    try {
        event.preventDefault();
        
        const clipboardData = event.clipboardData || window.clipboardData;
        const items = clipboardData.items;
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            // Check if the item is an image
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                
                if (file) {
                    // Convert to base64 data URL
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const dataURL = e.target.result;
                        
                        // Update the input field
                        const input = document.getElementById(inputId);
                        if (input) {
                            input.value = dataURL;

                        }
                        
                        // Update preview
                        setTimeout(() => {
                            updateIconPreview(inputId);
                        }, 100);
                        
                        // Clear the paste area
                        const pasteArea = event.target;
                        pasteArea.innerHTML = '';
                        
                        alert('Ảnh đã được paste thành công!');
                    };
                    reader.readAsDataURL(file);
                    return;
                }
            }
        }
        
        // If no image found, try to get text
        const text = clipboardData.getData('text');
        if (text) {
            const input = document.getElementById(inputId);
            if (input) {
                input.value = text;

                setTimeout(() => {
                    updateIconPreview(inputId);
                }, 100);
            }
            
            // Clear the paste area
            const pasteArea = event.target;
            pasteArea.innerHTML = '';
        }
        
    } catch (error) {
        console.error('Error handling image paste:', error);
        alert('Lỗi khi paste ảnh: ' + error.message);
    }
}

// Update icon preview
function updateIconPreview(inputId) {
    try {

        const input = document.getElementById(inputId);
        const previewId = inputId + '-preview';
        const preview = document.getElementById(previewId);
        


        
        if (!input || !preview) {
            console.error('Input or preview element not found');
            return;
        }
        
        const value = input.value || '📰';

        
        // Check if it's a URL (uploaded image) or emoji
        if (value.startsWith('http') || value.startsWith('data:') || value.startsWith('/')) {

            preview.innerHTML = `<img src="${value}" alt="Icon" onerror="this.parentElement.textContent='📰'">`;
        } else {

            preview.textContent = value;
        }
        

        
    } catch (error) {
        console.error('Error updating icon preview:', error);
    }
}

// Update icon preview when input changes
document.addEventListener('input', function(event) {
    if (event.target.id === 'news-category-icon' || event.target.id === 'edit-news-category-icon') {
        updateIconPreview(event.target.id);
    }
});

// Initialize paste areas
document.addEventListener('DOMContentLoaded', function() {
    // Add paste event listeners to paste areas
    const pasteAreas = document.querySelectorAll('.paste-area');
    pasteAreas.forEach(area => {
        area.addEventListener('paste', function(event) {
            const inputId = this.id.replace('-paste-area', '');
            handleImagePaste(inputId, event);
        });
        
        // Prevent default paste behavior
        area.addEventListener('paste', function(event) {
            event.preventDefault();
        });
    });
    
    // Test preview on load
    setTimeout(() => {

        
        // Test with emoji
        const testInput = document.getElementById('news-category-icon');
        if (testInput) {
            testInput.value = '🎯';

            updateIconPreview('news-category-icon');
        }
        
        // Also test edit form
        const editInput = document.getElementById('edit-news-category-icon');
        if (editInput) {
            editInput.value = '📰';
            updateIconPreview('edit-news-category-icon');
        }
    }, 1000);
});

// ============================================================================
// NEWS MANAGEMENT FUNCTIONS
// ============================================================================

// Load admin news
async function loadAdminNews() {
    try {

        
        const response = await fetch('/api/admin/news', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const news = await response.json();

        
        displayNews(news);
        loadAdminStats();
        
    } catch (error) {
        console.error('❌ Error loading news:', error);
        showNewsError();
    }
}

// Display news in table
function displayNews(news) {
    try {
        const tbody = document.getElementById('news-table-body');
        if (!tbody) {
            console.error('News table body not found');
            return;
        }
        
        if (!news || news.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="no-data">Chưa có tin tức nào</td></tr>';
            return;
        }
        
        tbody.innerHTML = news.map(article => `
            <tr>
                <td>${article._id ? article._id.substring(0, 8) + '...' : 'N/A'}</td>
                <td>
                    <div class="news-title">
                        <strong>${article.title}</strong>
                        ${article.isFeatured ? '<span class="featured-badge">⭐ Nổi bật</span>' : ''}
                    </div>
                </td>
                <td>
                    <span class="category-badge">${article.categoryName || 'Chưa phân loại'}</span>
                </td>
                <td>${article.author || 'N/A'}</td>
                <td>
                    <span class="status-badge ${article.status}">
                        ${getStatusText(article.status)}
                    </span>
                </td>
                <td>${formatDate(article.createdAt)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="editNews('${article._id}')">
                            ✏️ Sửa
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteNews('${article._id}')">
                            🗑️ Xóa
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error displaying news:', error);
    }
}

// Get status text
function getStatusText(status) {
    const statusMap = {
        'published': 'Xuất bản',
        'draft': 'Bản nháp',
        'pending': 'Chờ duyệt'
    };
    return statusMap[status] || 'Không xác định';
}

// Format date

// Show add news form
function showAddNewsForm() {
    try {
        const form = document.getElementById('add-news-form');
        if (form) {
            form.style.display = 'block';
            try { form.scrollIntoView({ behavior: 'auto' }); } catch (error) { try { window.scrollTo(0, form.getBoundingClientRect().top + window.pageYOffset); } catch (_) {} }
            
            // Load categories
            loadNewsCategoriesForSelect('news-category');
            
            // Initialize rich text editor
            setTimeout(() => {
                initializeNewsRichTextEditor();
            }, 100);
        }
    } catch (error) {
        console.error('Error showing add news form:', error);
    }
}

// Hide add news form
function hideAddNewsForm() {
    try {
        const form = document.getElementById('add-news-form');
        if (form) {
            form.style.display = 'none';
            form.reset();
        }
    } catch (error) {
        console.error('Error hiding add news form:', error);
    }
}

// Show edit news form
function showEditNewsForm() {
    try {

        const form = document.getElementById('edit-news-form');
        if (form) {

            
            // Force show the form by removing inline style and setting display
            form.removeAttribute('style');
            form.style.setProperty('display', 'block', 'important');
            
            // Also ensure it's visible with multiple methods
            form.style.visibility = 'visible';
            form.style.opacity = '1';
            
            try { form.scrollIntoView({ behavior: 'auto' }); } catch (error) { try { window.scrollTo(0, form.getBoundingClientRect().top + window.pageYOffset); } catch (_) {} }


        } else {
            console.error('❌ Edit news form not found in DOM');
        }
    } catch (error) {
        console.error('❌ Error showing edit news form:', error);
    }
}

// Hide edit news form
function hideEditNewsForm() {
    try {
        const form = document.getElementById('edit-news-form');
        if (form) {
            form.style.display = 'none';
            form.reset();
        }
    } catch (error) {
        console.error('Error hiding edit news form:', error);
    }
}

// Load news categories for select
async function loadNewsCategoriesForSelect(selectId) {
    try {
        const response = await fetch('/api/admin/news-categories', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        if (!response.ok) return;
        
        const categories = await response.json();
        const select = document.getElementById(selectId);
        
        if (select) {
            // Clear existing options except first
            select.innerHTML = '<option value="">Chọn danh mục</option>';
            
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category._id;
                option.textContent = category.name;
                select.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('Error loading news categories for select:', error);
    }
}

// Generate news slug
function generateNewsSlug() {
    try {
        const titleInput = document.getElementById('news-title');
        const slugInput = document.getElementById('news-slug');
        
        if (titleInput && slugInput) {
            const title = titleInput.value;
            if (title) {
                const slug = adminDashboard.generateSlug(title);
                slugInput.value = slug;
            }
        }
    } catch (error) {
        console.error('Error generating news slug:', error);
    }
}

// Generate edit news slug
function generateEditNewsSlug() {
    try {
        const titleInput = document.getElementById('edit-news-title');
        const slugInput = document.getElementById('edit-news-slug');
        
        if (titleInput && slugInput) {
            const title = titleInput.value;
            if (title) {
                const slug = adminDashboard.generateSlug(title);
                slugInput.value = slug;
            }
        }
    } catch (error) {
        console.error('Error generating edit news slug:', error);
    }
}

// Initialize news rich text editor
function initializeNewsRichTextEditor() {
    try {
        // Initialize both add and edit forms
        initializeNewsEditor('news-content', 'news-editor-toolbar');
        initializeNewsEditor('edit-news-content', 'edit-news-editor-toolbar');
    } catch (error) {
        console.error('Error initializing news rich text editor:', error);
    }
}

function initializeNewsEditor(editorId, toolbarId) {
    try {
        const editor = document.getElementById(editorId);
        const toolbar = document.getElementById(toolbarId);
        if (!editor || !toolbar) return;
        
        // Check if already initialized
        if (editor.dataset.initialized === 'true') return;

        // Delegate to the same executor used for tutorials
        toolbar.addEventListener('click', function(e) {
            if (e.target.classList.contains('toolbar-btn')) {
                e.preventDefault();
                const button = e.target;
                const command = button.getAttribute('data-command');
                executeEditorCommand(command, editor, button);
            }
        });

        // Sync hidden input on input
        editor.addEventListener('input', function() {
            const hidden = document.getElementById(editorId + '-hidden');
            if (hidden) hidden.value = editor.innerHTML;
        });

        // Reuse paste handler (upload + alt from filename)
        editor.addEventListener('paste', function(e) {
            e.preventDefault();
            const clipboardData = e.clipboardData || window.clipboardData;
            const items = clipboardData && clipboardData.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.type.indexOf('image') !== -1) {
                    const file = item.getAsFile();
                    if (file) { handleImagePaste(file, editor); return; }
                }
            }
            const text = clipboardData.getData('text/plain');
            if (text) { document.execCommand('insertText', false, text); }
        });
        
        // Add keyboard shortcuts
        addEditorKeyboardShortcuts(editor);
        
        // Mark as initialized
        editor.dataset.initialized = 'true';


    } catch (error) {
        console.error('Error initializing news editor:', error);
    }
}

// Initialize edit news rich text editor
function initializeEditNewsRichTextEditor() {
    try {
        // Use the same initialization function
        initializeNewsEditor('edit-news-content', 'edit-news-editor-toolbar');
    } catch (error) {
        console.error('Error initializing edit news rich text editor:', error);
    }
}

// Submit news form
async function submitNewsForm(e) {
    e.preventDefault();
    
    try {

        
        const formData = new FormData(e.target);
        
        // Get rich text content
        const content = document.getElementById('news-content')?.innerHTML || '';
        formData.set('content', content);
        
        const newsData = {
            title: formData.get('title'),
            slug: formData.get('slug') || generateSlug(formData.get('title')),
            excerpt: formData.get('excerpt'),
            content: formData.get('content'),
            categoryId: formData.get('categoryId'),
            author: formData.get('author'),
            image: formData.get('image'),
            tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag) : [],
            status: formData.get('status'),
            isFeatured: formData.get('isFeatured') === 'on',
            seo: {
                title: formData.get('seoTitle') || '',
                description: formData.get('seoDescription') || '',
                keywords: formData.get('seoKeywords') ? formData.get('seoKeywords').split(',').map(k => k.trim()).filter(k => k) : [],
                canonical: formData.get('canonical') || '',
                ogTitle: formData.get('ogTitle') || '',
                ogDescription: formData.get('ogDescription') || '',
                ogImage: formData.get('ogImage') || ''
            }
        };
        

        
        const response = await fetch('/api/admin/news', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify(newsData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create news');
        }
        
        const result = await response.json();

        
        // Hide form and reload data
        hideAddNewsForm();
        loadAdminNews();
        
        // Show success message
        alert('Tin tức đã được tạo thành công!');
        
    } catch (error) {
        console.error('❌ Error submitting news form:', error);
        alert('Lỗi khi tạo tin tức: ' + error.message);
    }
}

// Test function to check if edit form exists
function testEditFormExists() {
    const form = document.getElementById('edit-news-form');


    if (form) {



    }
    return !!form;
}

// Edit news
async function editNews(newsId) {
    try {

        
        // Test if form exists first
        testEditFormExists();
        
        const response = await fetch(`/api/admin/news/${newsId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const news = await response.json();

        
        // Populate edit form
        document.getElementById('edit-news-id').value = news._id;
        document.getElementById('edit-news-title').value = news.title;
        document.getElementById('edit-news-slug').value = news.slug;
        document.getElementById('edit-news-excerpt').value = news.excerpt || '';
        document.getElementById('edit-news-author').value = news.author;
        document.getElementById('edit-news-image').value = news.image || '';
        document.getElementById('edit-news-tags').value = Array.isArray(news.tags) ? news.tags.join(', ') : '';
        document.getElementById('edit-news-status').value = news.status;
        document.getElementById('edit-news-featured').checked = news.isFeatured || false;
        
        // Set rich text content
        const contentDiv = document.getElementById('edit-news-content');
        const contentHidden = document.getElementById('edit-news-content-hidden');
        if (contentDiv) {
            contentDiv.innerHTML = news.content || '';
        }
        if (contentHidden) {
            contentHidden.value = news.content || '';
        }
        
        // Load categories and set selected
        await loadNewsCategoriesForSelect('edit-news-category');
        setTimeout(() => {
            document.getElementById('edit-news-category').value = news.categoryId || '';
        }, 100);
        
        // Fill SEO fields
        if (news.seo) {
            document.getElementById('edit-news-seo-title').value = news.seo.title || '';
            document.getElementById('edit-news-seo-description').value = news.seo.description || '';
            document.getElementById('edit-news-seo-keywords').value = Array.isArray(news.seo.keywords) ? news.seo.keywords.join(', ') : '';
            document.getElementById('edit-news-canonical').value = news.seo.canonical || '';
            document.getElementById('edit-news-og-title').value = news.seo.ogTitle || '';
            document.getElementById('edit-news-og-description').value = news.seo.ogDescription || '';
            document.getElementById('edit-news-og-image').value = news.seo.ogImage || '';
        }
        
        // Show edit form with delay to ensure it's not overridden
        setTimeout(() => {
            showEditNewsForm();
        }, 200);
        
        // Initialize rich text editor
        setTimeout(() => {
            initializeEditNewsRichTextEditor();
        }, 300);
        
    } catch (error) {
        console.error('❌ Error editing news:', error);
        alert('Lỗi khi tải thông tin tin tức: ' + error.message);
    }
}

// Submit edit news form
async function submitEditNewsForm(e) {
    e.preventDefault();
    
    try {

        
        const formData = new FormData(e.target);
        const newsId = formData.get('id');
        
        if (!newsId) {
            throw new Error('News ID is required');
        }
        
        // Get rich text content
        const content = document.getElementById('edit-news-content')?.innerHTML || '';
        formData.set('content', content);
        
        const newsData = {
            title: formData.get('title'),
            slug: formData.get('slug'),
            excerpt: formData.get('excerpt'),
            content: formData.get('content'),
            categoryId: formData.get('categoryId'),
            author: formData.get('author'),
            image: formData.get('image'),
            tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag) : [],
            status: formData.get('status'),
            isFeatured: formData.get('isFeatured') === 'on',
            seo: {
                title: formData.get('seoTitle') || '',
                description: formData.get('seoDescription') || '',
                keywords: formData.get('seoKeywords') ? formData.get('seoKeywords').split(',').map(k => k.trim()).filter(k => k) : [],
                canonical: formData.get('canonical') || '',
                ogTitle: formData.get('ogTitle') || '',
                ogDescription: formData.get('ogDescription') || '',
                ogImage: formData.get('ogImage') || ''
            }
        };
        

        
        const response = await fetch(`/api/admin/news/${newsId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            },
            body: JSON.stringify(newsData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update news');
        }
        
        const result = await response.json();

        
        // Hide form and reload data
        hideEditNewsForm();
        loadAdminNews();
        
        // Show success message
        alert('Tin tức đã được cập nhật thành công!');
        
    } catch (error) {
        console.error('❌ Error submitting edit news form:', error);
        alert('Lỗi khi cập nhật tin tức: ' + error.message);
    }
}

// Delete news
async function deleteNews(newsId) {
    try {
        if (!confirm('Bạn có chắc chắn muốn xóa tin tức này?')) {
            return;
        }
        

        
        const response = await fetch(`/api/admin/news/${newsId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete news');
        }
        

        
        // Reload data
        loadAdminNews();
        
        // Show success message
        alert('Tin tức đã được xóa thành công!');
        
    } catch (error) {
        console.error('❌ Error deleting news:', error);
        alert('Lỗi khi xóa tin tức: ' + error.message);
    }
}

// Show news error
function showNewsError() {
    const tbody = document.getElementById('news-table-body');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" class="error">Lỗi khi tải dữ liệu tin tức</td></tr>';
    }
}

// Initialize news form submit
function initializeNewsFormSubmit() {
    try {
        const form = document.getElementById('news-form');
        if (form) {
            form.addEventListener('submit', submitNewsForm);
        }
        
        const editForm = document.getElementById('edit-news-form-data');
        if (editForm) {
            editForm.addEventListener('submit', submitEditNewsForm);
        }
    } catch (error) {
        console.error('Error initializing news form submit:', error);
    }
}

// Edit product
async function editProduct(productId) {
    try {

        
        const token = localStorage.getItem('adminToken');
        if (!token) {
            alert('Bạn cần đăng nhập lại');
            window.location.href = '/admin-login.html';
            return;
        }
        
        // Fetch all products and find the specific one
        const response = await fetch('/api/admin/products', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const products = await response.json();
        const product = products.find(p => p._id === productId);

        
        if (!product) {
            alert('Không tìm thấy sản phẩm');
            return;
        }
        
        // Show edit form
        showEditProductForm(product);
        
    } catch (error) {
        console.error('Error editing product:', error);
        alert('Lỗi khi tải dữ liệu sản phẩm');
    }
}

// Delete product
async function deleteProduct(productId) {
    try {
        if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
            return;
        }
        
        const response = await fetch(`/api/admin/products/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
            }
        });
        
        if (response.ok) {
            alert('Xóa sản phẩm thành công!');
            adminDashboard.loadProducts(); // Reload products list
        } else {
            const error = await response.json();
            alert(`Lỗi: ${error.error}`);
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Lỗi khi xóa sản phẩm');
    }
}

// Show edit product form
function showEditProductForm(product) {
    try {

        
        // Store editing product ID
        window.editingProductId = product._id;
        
        // Show the add product form (we'll reuse it for editing)
        const addForm = document.getElementById('add-product-form');
        if (addForm) {
            addForm.style.display = 'block';
            addForm.scrollIntoView({ behavior: 'smooth' });
        }
        
        // Update form title
        const formTitle = document.querySelector('#add-product-form h3');
        if (formTitle) {
            formTitle.textContent = '✏️ Sửa Sản phẩm';
        }
        
        // Populate form fields
        const nameInput = document.getElementById('product-name');
        if (nameInput) nameInput.value = product.name || '';
        
        const slugInput = document.getElementById('product-slug');
        if (slugInput) slugInput.value = product.slug || '';
        
        const descriptionInput = document.getElementById('product-description');
        if (descriptionInput) descriptionInput.value = product.description || '';
        
        // Set full description in rich text editor
        const fullDescriptionEditor = document.getElementById('product-content');
        if (fullDescriptionEditor) {
            fullDescriptionEditor.innerHTML = product.fullDescription || '';

        } else {

        }
        
        const priceInput = document.getElementById('product-price');
        if (priceInput) priceInput.value = product.price || '';
        
        const stockInput = document.getElementById('product-stock');
        if (stockInput) stockInput.value = product.stock || '';
        
        const tagsInput = document.getElementById('product-tags');
        if (tagsInput) tagsInput.value = product.tags ? product.tags.join(', ') : '';
        
        // Set category dropdown
        const categorySelect = document.getElementById('product-category');
        if (categorySelect) {
            categorySelect.value = product.categoryId || '';

        } else {

        }
        
        const publishedCheckbox = document.getElementById('product-published');
        if (publishedCheckbox) {
            publishedCheckbox.checked = product.isActive || false;

        } else {

        }
        
        // Handle product images
        if (product.images && product.images.length > 0) {

            // Show preview container
            const previewContainer = document.getElementById('product-images-preview');
            if (previewContainer) {
                previewContainer.style.display = 'block';
            }
            // Display existing images in preview
            const imagePreviewGrid = document.getElementById('product-images-grid');
            if (imagePreviewGrid) {
                imagePreviewGrid.innerHTML = '';
                product.images.forEach((imageUrl, index) => {
                    const imageItem = document.createElement('div');
                    imageItem.className = 'image-preview-item';
                    imageItem.innerHTML = `
                        <img src="${imageUrl}" alt="Product image ${index + 1}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px;">
                        <div class="image-actions" style="padding: 8px; text-align: center;">
                            <button type="button" onclick="removeEditImage(${index})" style="background: #dc2626; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">Xóa</button>
                        </div>
                    `;
                    imagePreviewGrid.appendChild(imageItem);
                });

            } else {

            }
        } else {

            // Hide preview container
            const previewContainer = document.getElementById('product-images-preview');
            if (previewContainer) {
                previewContainer.style.display = 'none';
            }
            // Clear any existing preview
            const imagePreviewGrid = document.getElementById('product-images-grid');
            if (imagePreviewGrid) {
                imagePreviewGrid.innerHTML = '';
            }
        }
        
        // Update submit button
        const submitBtn = document.querySelector('#add-product-form button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = '💾 Cập nhật Sản phẩm';
        }
        

        
    } catch (error) {
        console.error('Error showing edit product form:', error);
        alert('Lỗi khi hiển thị form sửa sản phẩm');
    }
}

// Remove image from edit form
function removeEditImage(imageIndex) {
    try {

        
        // Remove from preview
        const imagePreviewGrid = document.getElementById('product-images-grid');
        if (imagePreviewGrid) {
            const imageItems = imagePreviewGrid.querySelectorAll('.image-preview-item');
            if (imageItems[imageIndex]) {
                imageItems[imageIndex].remove();

            } else {

            }
        } else {

        }
        
    } catch (error) {
        console.error('Error removing image:', error);
    }
}


// Hide add tutorial form
function hideAddTutorialForm() {
    try {

        
        // Hide the form
        const addForm = document.getElementById('add-tutorial-form');
        if (addForm) {
            addForm.style.display = 'none';
        }
        
        // Clear editing state
        window.editingTutorialId = null;
        

        
    } catch (error) {
        console.error('Error hiding add tutorial form:', error);
    }
}

// Show add product form
function showAddProductForm() {
    try {
        console.log('📝 Showing add product form');
        
        // Clear editing state
        window.editingProductId = null;
        
        // Show the form
        const addForm = document.getElementById('add-product-form');
        if (addForm) {
            addForm.style.display = 'block';
            addForm.scrollIntoView({ behavior: 'smooth' });
        }
        
        // Reset form title
        const formTitle = document.querySelector('#add-product-form h3');
        if (formTitle) {
            formTitle.textContent = '📦 Thêm Sản phẩm Mới';
        }
        
        // Reset submit button
        const submitBtn = document.querySelector('#product-form button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = '💾 Lưu Sản phẩm';
        }
        
        // Clear form
        const form = document.getElementById('product-form');
        if (form) {
            form.reset();
        }
        
        // Clear image preview
        const imagePreviewGrid = document.getElementById('product-images-grid');
        if (imagePreviewGrid) {
            imagePreviewGrid.innerHTML = '';
        }
        
        // Hide image preview container
        const previewContainer = document.getElementById('product-images-preview');
        if (previewContainer) {
            previewContainer.style.display = 'none';
        }
        
        console.log('✅ Add product form shown');
        
    } catch (error) {
        console.error('Error showing add product form:', error);
        alert('Lỗi khi hiển thị form thêm sản phẩm');
    }
}

// Hide add product form
function hideAddProductForm() {
    try {

        
        // Hide the form
        const addForm = document.getElementById('add-product-form');
        if (addForm) {
            addForm.style.display = 'none';
        }
        
        // Clear editing state
        window.editingProductId = null;
        
        // Reset form
        const formElement = document.getElementById('product-form');
        if (formElement) {
            formElement.reset();
        }
        
        // Clear image preview
        const imagePreviewGrid = document.getElementById('product-images-grid');
        if (imagePreviewGrid) {
            imagePreviewGrid.innerHTML = '';
        }
        
        // Hide image preview container
        const previewContainer = document.getElementById('product-images-preview');
        if (previewContainer) {
            previewContainer.style.display = 'none';
        }
        

        
    } catch (error) {
        console.error('Error hiding add product form:', error);
    }
}

// Hide edit product form
function hideEditProductForm() {
    try {

        
        // Hide the form
        const addForm = document.getElementById('add-product-form');
        if (addForm) {
            addForm.style.display = 'none';
        }
        
        // Clear editing state
        window.editingProductId = null;
        
        // Reset form
        const formElement = document.getElementById('product-form');
        if (formElement) {
            formElement.reset();
        }
        
        // Clear image preview
        const imagePreviewGrid = document.getElementById('product-images-grid');
        if (imagePreviewGrid) {
            imagePreviewGrid.innerHTML = '';
        }
        
        // Hide image preview container
        const previewContainer = document.getElementById('product-images-preview');
        if (previewContainer) {
            previewContainer.style.display = 'none';
        }
        

        
    } catch (error) {
        console.error('Error hiding edit product form:', error);
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    initializeNewsFormSubmit();
    
    // Initialize User Management
    if (typeof UserManagement !== 'undefined') {
        window.userManagement = new UserManagement();
    }
});

