document.addEventListener('DOMContentLoaded', function () {
    const grid = document.getElementById('ordersGrid');
    const empty = document.getElementById('ordersEmpty');
    const totalValue = document.getElementById('ordersTotalValue');
    const subEl = document.getElementById('sum-subtotal');
    const shipEl = document.getElementById('sum-shipping');
    const emailEl = document.getElementById('sum-email');
    const pageGrid = document.getElementById('pageGrid');

    if (!grid || !empty || !totalValue) {
        return;
    }

    let orders = [];

    function formatPrice(v) {
        try {
            const n = Number(v || 0);
            return new Intl.NumberFormat('vi-VN').format(n) + ' d';
        } catch (_) {
            return String(v || 0) + ' d';
        }
    }

    function render(list) {
        if (!list || list.length === 0) {
            grid.innerHTML = '';
            empty.style.display = 'block';
            totalValue.textContent = '0 d';
            if (subEl) subEl.textContent = '0 d';
            if (shipEl) shipEl.textContent = '0 d';
            if (pageGrid) pageGrid.classList.add('single');
            return;
        }

        empty.style.display = 'none';
        if (pageGrid) pageGrid.classList.remove('single');

        let subtotal = 0;
        grid.innerHTML = list
            .map((item, index) => {
                const qty = Number(item.quantity || 1);
                const rowTotal = qty * Number(item.price || 0);
                subtotal += rowTotal;

                return `
                <div class="cart-item">
                    <div class="cart-item-header">
                        <img class="cart-thumb" src="${item.image || '/images/favicon.svg'}" alt="${item.name || ''}">
                        <div class="cart-info">
                            <h3 class="cart-title">${item.name || 'San pham'}</h3>
                            <div class="cart-meta">#${item.id || ''}</div>
                        </div>
                    </div>
                    <div class="cart-actions">
                        <div class="qty-wrap">
                            <button class="qty-btn" onclick="window.decQty(${index})">-</button>
                            <span>${qty}</span>
                            <button class="qty-btn" onclick="window.incQty(${index})">+</button>
                        </div>
                        <strong class="price">${formatPrice(rowTotal)}</strong>
                        <button class="remove-btn" title="Xoa" onclick="window.removeItem(${index})">x</button>
                    </div>
                </div>`;
            })
            .join('');

        const shipping = 0;
        if (subEl) subEl.textContent = formatPrice(subtotal);
        if (shipEl) shipEl.textContent = formatPrice(shipping);
        totalValue.textContent = formatPrice(subtotal + shipping);

        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (emailEl) emailEl.textContent = user.email || '';
        } catch (_) {
            if (emailEl) emailEl.textContent = '';
        }
    }

    function calculateTotal() {
        const subtotal = orders.reduce((sum, item) => {
            return sum + Number(item.price || 0) * Number(item.quantity || 1);
        }, 0);
        return subtotal;
    }

    function getAuthHeaders(includeJson = false) {
        const headers = {};
        const token = localStorage.getItem('authToken');
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        if (includeJson) {
            headers['Content-Type'] = 'application/json';
        }
        return headers;
    }

    window.incQty = function (index) {
        if (!orders[index]) return;
        orders[index].quantity = Number(orders[index].quantity || 1) + 1;
        localStorage.setItem('cart', JSON.stringify(orders));
        render(orders);
    };

    window.decQty = function (index) {
        if (!orders[index]) return;
        orders[index].quantity = Math.max(1, Number(orders[index].quantity || 1) - 1);
        localStorage.setItem('cart', JSON.stringify(orders));
        render(orders);
    };

    window.removeItem = function (index) {
        orders.splice(index, 1);
        localStorage.setItem('cart', JSON.stringify(orders));
        render(orders);
    };

    async function loadOrders() {
        try {
            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            if (Array.isArray(cart) && cart.length > 0) {
                orders = cart;
                render(orders);
                return;
            }

            const response = await fetch('/api/orders', { headers: getAuthHeaders(false) });
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }

            const data = await response.json();
            const normalized = Array.isArray(data) ? data : data.orders || [];
            orders = normalized.flatMap((order) =>
                (order.items || []).map((item) => ({
                    id: item.id || item.sku || order._id,
                    name: item.name,
                    image: item.image,
                    price: item.price,
                    quantity: item.quantity,
                }))
            );

            render(orders);
        } catch (error) {
            console.error('Error loading orders:', error);
            render([]);
        }
    }

    window.submitOrder = async function () {
        try {
            if (!orders || orders.length === 0) {
                alert('Gio hang trong!');
                return;
            }

            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (!user.email) {
                alert('Vui long dang nhap de dat hang!');
                return;
            }

            const checkoutBtn = document.getElementById('checkout-btn');
            if (checkoutBtn) {
                checkoutBtn.disabled = true;
                checkoutBtn.textContent = 'DANG XU LY...';
            }

            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: getAuthHeaders(true),
                body: JSON.stringify({
                    items: orders,
                    total: calculateTotal(),
                }),
            });

            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }

            const result = await response.json();
            alert('Dat hang thanh cong! Ma don hang: ' + result.orderCode);

            localStorage.removeItem('cart');
            orders = [];
            render(orders);
        } catch (error) {
            console.error('Order submission error:', error);
            alert('Loi khi dat hang: ' + error.message);
        } finally {
            const checkoutBtn = document.getElementById('checkout-btn');
            if (checkoutBtn) {
                checkoutBtn.disabled = false;
                checkoutBtn.textContent = 'GUI DON HANG';
            }
        }
    };

    loadOrders();
});
