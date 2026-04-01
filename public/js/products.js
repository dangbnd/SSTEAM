// Products Page JavaScript
class ProductsManager {
    constructor() {
        this.categories = [];
        this.products = [];
        this.serverPagination = { page: 1, pages: 1, total: 0 };
        this.currentPage = 1;
        this.itemsPerPage = 50;
        this.searchDebounceMs = 50;
        this.searchDebounceTimer = null;
        this.isBootstrapping = true;
        this.filters = {
            search: '',
            category: '',
            priceRange: '',
            sortBy: 'default'
        };
        
        this.init();
    }

    async init() {
        this.setBootstrapping(true);
        this.renderCategoriesSkeleton();
        this.renderProductsSkeleton();

        try {
            await Promise.all([
                this.loadCategories({ deferRender: true }),
                this.loadProducts({ deferRender: true })
            ]);

            this.displayCategories();
            this.displayProducts();
            this.setupEventListeners();
            this.setupMobileCategoryDropdown();
            this.updateProductsCount();
            this.toggleClearSearchButton();

            // If opened with ?category=... on products page, pre-select that category
            try {
                const params = new URLSearchParams(window.location.search);
                const initialCategory = params.get('category');
                const isProductsPage = !!document.getElementById('productsGrid');
                if (isProductsPage && initialCategory) {
                    this.selectCategory(String(initialCategory));
                }
            } catch (_) {}
        } finally {
            this.isBootstrapping = false;
            this.setBootstrapping(false);
        }
    }

    setBootstrapping(isLoading) {
        const body = document.body;
        if (!body) return;
        body.classList.toggle('products-bootstrapping', Boolean(isLoading));
    }

    setGridFetchingState(isFetching) {
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) return;
        productsGrid.classList.toggle('is-fetching', Boolean(isFetching));
    }

    renderCategoriesSkeleton(count = 8) {
        const categoriesList = document.getElementById('categoriesList');
        if (!categoriesList) return;

        const rows = Array.from({ length: count }).map(() => `
            <li class="category-skeleton-item">
                <span class="category-skeleton-icon"></span>
                <span class="category-skeleton-line"></span>
            </li>
        `).join('');

        categoriesList.innerHTML = rows;
    }

    renderProductsSkeleton(count = 12) {
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) return;

        const skeletons = Array.from({ length: count }).map(() => `
            <div class="product-skeleton-card">
                <div class="product-skeleton-media"></div>
                <div class="product-skeleton-content">
                    <div class="product-skeleton-line product-skeleton-title"></div>
                    <div class="product-skeleton-line product-skeleton-title short"></div>
                    <div class="product-skeleton-line product-skeleton-price"></div>
                </div>
            </div>
        `).join('');

        productsGrid.classList.add('is-loading');
        productsGrid.innerHTML = skeletons;
    }

    // Load categories from API
    async loadCategories(options = {}) {
        const { deferRender = false } = options;
        try {
            const response = await fetch('/api/categories');
            if (response.ok) {
                this.categories = await response.json();
                console.log('Categories loaded from database:', this.categories);
                if (!deferRender) {
                    this.displayCategories();
                }
            } else {
                console.error('Failed to load categories from API:', response.status, response.statusText);
                // Show error message instead of fallback
                this.showCategoriesError();
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            // Show error message instead of fallback
            this.showCategoriesError();
        }
    }

    // Load products from API
    async loadProducts(options = {}) {
        const { deferRender = false } = options;
        if (!deferRender && !this.isBootstrapping) {
            this.setGridFetchingState(true);
        }

        try {
            const response = await fetch(`/api/products?limit=100&page=${this.currentPage}`);
            if (response.ok) {
                const data = await response.json();
                this.products = Array.isArray(data) ? data : (data.products || []);
                this.serverPagination = data.pagination || { page: this.currentPage, pages: 1, total: this.products.length };
                console.log('Products loaded from database:', this.products);
                if (!deferRender) {
                    this.displayProducts();
                }
            } else {
                console.error('Failed to load products from API:', response.status, response.statusText);
                // Show error message instead of fallback
                this.showProductsError();
            }
        } catch (error) {
            console.error('Error loading products:', error);
            // Show error message instead of fallback
            this.showProductsError();
        } finally {
            if (!deferRender && !this.isBootstrapping) {
                this.setGridFetchingState(false);
            }
        }
    }

    // Display categories in sidebar (supports nested subcategories)
    displayCategories() {
        try {
        const categoriesList = document.getElementById('categoriesList');
        if (!categoriesList) return;

            // Ensure container is visible
            categoriesList.style.display = 'block';

            const allProductsHTML = `
                <li class="category-item category-item-all ${!this.filters.category ? 'active' : ''}" data-category-id="">
                    <div class="category-row">
                        <span class="category-icon">📦</span>
                        <span class="category-name">Tất cả sản phẩm</span>
                    </div>
                </li>
            `;

            if (!Array.isArray(this.categories) || this.categories.length === 0) {
                categoriesList.innerHTML = allProductsHTML;
                this.setupCategoryListInteractions(categoriesList);
                this.populateMobileCategoryDropdown();
                return;
            }

            // Build a category tree from flat list (supports parentId/parent/children)
            const tree = this.buildCategoryTree(this.categories);

            // Render the tree or fall back to flat list
            if (Array.isArray(tree) && tree.length > 0) {
                categoriesList.innerHTML = allProductsHTML + tree.map(rootNode => this.renderCategoryNode(rootNode)).join('');
            } else {
                const flatHTML = this.categories.map(category => {
                    const id = category._id || category.id || String(category.slug || category.name);
                    const iconHtml = this.renderCategoryIcon(category.icon);
                    return `
                        <li class="category-item" data-category-id="${id}">
                            <div class="category-row">
                                <span class="category-icon">${iconHtml}</span>
                                <span class="category-name">${category.name || 'Danh mục'}</span>
                            </div>
                        </li>
                    `;
                }).join('');
                categoriesList.innerHTML = allProductsHTML + flatHTML;
            }

            // Setup expand/collapse and click handling via event delegation
            this.setupCategoryListInteractions(categoriesList);
            
            // Populate mobile dropdown
            this.populateMobileCategoryDropdown();
        } catch (error) {
            console.error('Error displaying categories:', error);
        }
    }

    // Populate mobile category dropdown
    populateMobileCategoryDropdown() {
        const mobileSelect = document.getElementById('mobileCategorySelect');
        if (!mobileSelect || !this.categories) return;

        // Keep the first option (Tất cả sản phẩm)
        const firstOption = mobileSelect.querySelector('option[value=""]');
        mobileSelect.innerHTML = '';
        if (firstOption) {
            mobileSelect.appendChild(firstOption);
        } else {
            const allOption = document.createElement('option');
            allOption.value = '';
            allOption.textContent = 'Tất cả sản phẩm';
            mobileSelect.appendChild(allOption);
        }

        // Add category options
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category._id || category.id;
            option.textContent = category.name;
            mobileSelect.appendChild(option);
        });
    }

    // Build category tree from flat categories
    buildCategoryTree(categories) {
        try {
            const idToNodeMap = new Map();
            const roots = [];

            // Initialize nodes
            categories.forEach(category => {
                const node = {
                    id: category._id || category.id || String(category.slug || category.name),
                    name: category.name || 'Danh mục',
                    icon: category.icon || null,
                    raw: category,
                    children: []
                };
                idToNodeMap.set(node.id, node);
            });

            // Link children to parents
            categories.forEach(category => {
                const id = category._id || category.id || String(category.slug || category.name);
                const parentId = category.parentId || category.parent || (category.parent && category.parent._id) || null;

                // If API already provides children array, attach them directly
                if (Array.isArray(category.children) && category.children.length > 0) {
                    const parentNode = idToNodeMap.get(id);
                    category.children.forEach(child => {
                        const childId = child._id || child.id || String(child.slug || child.name);
                        let childNode = idToNodeMap.get(childId);
                        if (!childNode) {
                            childNode = {
                                id: childId,
                                name: child.name || 'Danh mục',
                                icon: child.icon || null,
                                raw: child,
                                children: []
                            };
                            idToNodeMap.set(childId, childNode);
                        }
                        parentNode.children.push(childNode);
                    });
                } else if (parentId) {
                    const parentNode = idToNodeMap.get(String(parentId));
                    const node = idToNodeMap.get(id);
                    if (parentNode && node) {
                        parentNode.children.push(node);
                    }
                }
            });

            // Roots are nodes that are not any child's entry
            const childIds = new Set();
            idToNodeMap.forEach(node => {
                node.children.forEach(child => childIds.add(child.id));
            });

            idToNodeMap.forEach((node, nodeId) => {
                if (!childIds.has(nodeId)) {
                    roots.push(node);
                }
            });

            return roots;
        } catch (error) {
            console.error('Error building category tree:', error);
            return [];
        }
    }

    // Render a single category node (recursive)
    renderCategoryNode(node) {
        try {
            const hasChildren = Array.isArray(node.children) && node.children.length > 0;
            const iconHtml = this.renderCategoryIcon(node.icon);
            const toggleHtml = hasChildren ? `<button class="category-toggle" aria-label="Toggle">▾</button>` : '';
            const childrenHtml = hasChildren ? `<ul class="subcategory-list" style="display:block;">${node.children.map(child => this.renderCategoryNode(child)).join('')}</ul>` : '';

            // Make the entire li clickable to filter by this category
            return `
                <li class="category-item" data-category-id="${node.id}">
                    <div class="category-row">
                        ${toggleHtml}
                        <span class="category-icon">${iconHtml}</span>
                        <span class="category-name">${node.name}</span>
                </div>
                    ${childrenHtml}
                </li>
            `;
        } catch (error) {
            console.error('Error rendering category node:', error);
            return '';
        }
    }

    // Setup interactions for the category list (expand/collapse and selection)
    setupCategoryListInteractions(categoriesListElement) {
        try {
            if (!categoriesListElement) return;

            categoriesListElement.addEventListener('click', (event) => {
                try {
                    const target = event.target;

                    // Toggle expand/collapse when clicking the toggle button
                    if (target && target.classList && target.classList.contains('category-toggle')) {
                        event.stopPropagation();
                        const row = target.closest('.category-row');
                        const item = row ? row.closest('.category-item') : null;
                        const sublist = item ? item.querySelector(':scope > .subcategory-list') : null;
                        if (sublist) {
                            const isHidden = sublist.style.display === 'none';
                            sublist.style.display = isHidden ? 'block' : 'none';
                            target.textContent = isHidden ? '▾' : '▸';
                        }
                        return;
                    }

                    // Selecting a category when clicking anywhere on its row
                    const row = target.closest && target.closest('.category-row');
                    const itemFromRow = row ? row.closest('.category-item') : null;
                    const item = itemFromRow || (target.closest && target.closest('.category-item'));
                    if (item && item.dataset && item.hasAttribute('data-category-id')) {
                        const categoryId = String(item.getAttribute('data-category-id') || '');
                        const isProductsPage = !!document.getElementById('productsGrid');
                        if (isProductsPage) {
                            this.selectCategory(categoryId);
                        } else {
                            window.location.href = categoryId
                                ? `/products?category=${encodeURIComponent(categoryId)}`
                                : '/products';
                        }
                        return;
                    }
                } catch (innerError) {
                    console.error('Error handling category list click:', innerError);
                }
            });
        } catch (error) {
            console.error('Error setting up category list interactions:', error);
        }
    }

    // Get appropriate icon for category based on name
    getCategoryIcon(categoryName) {
        const iconMap = {
            'Arduino': '∞',
            'Cảm biến': '⌖',
            'Combo khuyến mãi': '🛠️',
            'Đèn LED': '💡',
            'Điện dân dụng': '🖥️',
            'Điện năng lượng mặt trời': '☀️',
            'Đồng hồ vạn năng': '⏱️',
            'Máy in 3D': '🖨️',
            'Module': '🔌',
            'Phụ kiện': '✂️',
            'Robot': '🤖',
            'Tự động hóa': '⚙️',
            'Lập trình': '💻',
            'Phát triển': '🚀',
            'Công nghệ': '🔬',
            'DIY': '🔧'
        };

        // Find matching icon based on category name
        for (const [key, icon] of Object.entries(iconMap)) {
            if (categoryName.toLowerCase().includes(key.toLowerCase())) {
                return icon;
            }
        }
        
        // Default icon if no match found
        return '📦';
    }

    // Display products in grid
    displayProducts() {
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) return;

        const filteredProducts = this.getFilteredProducts();
        // Use filtered products instead of all products
        const paginatedProducts = filteredProducts;

        if (paginatedProducts.length === 0) {
            productsGrid.classList.remove('is-loading');
            productsGrid.innerHTML = '<div class="no-products"><p>Không tìm thấy sản phẩm nào</p></div>';
            return;
        }

        const productsHTML = paginatedProducts.map(product => {
            const pricing = this.getProductPriceInfo(product);
            const discountBadge = pricing.discountPercent > 0
                ? `<span class="product-discount-badge">-${pricing.discountPercent}%</span>`
                : '';
            const originalPriceHtml = pricing.discountPercent > 0
                ? `<span class="product-price-original">${this.formatPrice(pricing.originalPrice)}</span>`
                : '';

            return `
            <a href="/${product.slug || product._id || product.id}" class="product-card-link">
            <div class="product-card">
                <div class="product-image-container">
                    ${discountBadge}
                    <div class="product-image">
                        ${this.getProductImage(product)}
                    </div>
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <div class="product-meta">
                        <div class="product-price-wrap">
                            <div class="product-price">${this.formatPrice(pricing.currentPrice)}</div>
                            ${originalPriceHtml}
                        </div>
                        <span class="product-cart-icon" title="Thêm vào giỏ hàng" aria-hidden="true">
                            <i class="fa-solid fa-cart-plus"></i>
                        </span>
                    </div>
                    </div>
                </div>
            </a>
        `;
        }).join('');

        productsGrid.classList.remove('is-loading');
        productsGrid.innerHTML = productsHTML;
        const totalItems = (this.serverPagination && this.serverPagination.total) ? this.serverPagination.total : filteredProducts.length;
        this.updatePagination(totalItems);
    }

    // Get filtered products based on current filters
    getFilteredProducts() {
        let filtered = [...this.products];

        // Search filter
        if (this.filters.search) {
            const searchTerm = this.filters.search.toLowerCase();
            filtered = filtered.filter(product => 
                product.name.toLowerCase().includes(searchTerm) ||
                (product.description && product.description.toLowerCase().includes(searchTerm)) ||
                (product.fullDescription && product.fullDescription.toLowerCase().includes(searchTerm))
            );
        }

        // Category filter
        if (this.filters.category) {
            filtered = filtered.filter(product => {
                const productCategoryId = String(product.categoryId || product.category);
                const filterCategoryId = String(this.filters.category);
                return productCategoryId === filterCategoryId;
            });
        }

        // Price range filter
        if (this.filters.priceRange) {
            filtered = filtered.filter(product => {
                const price = this.toNumberPrice(product.price);
                if (!Number.isFinite(price)) return false;
                switch (this.filters.priceRange) {
                    case '0-500000':
                        return price < 500000;
                    case '500000-1000000':
                        return price >= 500000 && price < 1000000;
                    case '1000000-2000000':
                        return price >= 1000000 && price < 2000000;
                    case '2000000+':
                        return price >= 2000000;
                    default:
                        return true;
                }
            });
        }

        // Sort products
        filtered.sort((a, b) => {
            const priceA = this.toNumberPrice(a.price);
            const priceB = this.toNumberPrice(b.price);
            const hasPriceA = Number.isFinite(priceA);
            const hasPriceB = Number.isFinite(priceB);

            switch (this.filters.sortBy) {
                case 'price-low':
                    if (hasPriceA && hasPriceB) return priceA - priceB;
                    if (!hasPriceA && !hasPriceB) return 0;
                    return hasPriceA ? -1 : 1;
                case 'price-high':
                    if (hasPriceA && hasPriceB) return priceB - priceA;
                    if (!hasPriceA && !hasPriceB) return 0;
                    return hasPriceA ? -1 : 1;
                case 'newest':
                    return new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0);
                case 'popular':
                    return (b.popularity || 0) - (a.popularity || 0);
                case 'default':
                default:
                    return 0;
            }
        });

        return filtered;
    }

    // Update pagination
    updatePagination(totalItems) {
        const totalPages = this.serverPagination && this.serverPagination.pages ? this.serverPagination.pages : Math.ceil(totalItems / this.itemsPerPage);
        const pageNumbers = document.getElementById('pageNumbers');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');

        if (!pageNumbers || !prevBtn || !nextBtn) return;

        // Update page numbers
        let pageNumbersHTML = '';
        for (let i = 1; i <= totalPages; i++) {
            pageNumbersHTML += `<span class="page-number ${i === this.currentPage ? 'active' : ''}" onclick="productsManager.goToPage(${i})">${i}</span>`;
        }
        pageNumbers.innerHTML = pageNumbersHTML;

        // Update button states
        prevBtn.disabled = this.currentPage === 1;
        nextBtn.disabled = this.currentPage === totalPages;
    }

    // Go to specific page
    goToPage(page) {
        this.currentPage = page;
        this.displayProducts();
        try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch (error) { try { window.scrollTo(0, 0); } catch (_) {} }
    }

    // Select category filter
    selectCategory(categoryId) {
        const normalizedCategoryId = String(categoryId || '');

        // Remove active class from all categories
        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to selected category
        const selectedItem = document.querySelector(`[data-category-id="${normalizedCategoryId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('active');
        }

        // Update category title
        this.updateCategoryTitle(normalizedCategoryId);

        // Update filter and refresh products
        this.filters.category = normalizedCategoryId;
        this.currentPage = 1;
        this.displayProducts();

        const mobileSelect = document.getElementById('mobileCategorySelect');
        if (mobileSelect) {
            mobileSelect.value = normalizedCategoryId;
            this.toggleClearMobileCategoryButton();
        }
    }

    // Update category title
    updateCategoryTitle(categoryId) {
        const categoryTitle = document.getElementById('categoryTitle');
        if (categoryTitle) {
            if (categoryId) {
                const description = this.getCategoryDescription(categoryId);
                categoryTitle.textContent = description;
            } else {
                categoryTitle.textContent = 'Tất cả sản phẩm';
            }
        }
    }

    // Get category name by ID
    getCategoryName(categoryId) {
        console.log('🔍 Getting category name for:', categoryId);
        console.log('📚 Available categories:', this.categories);
        
        if (!categoryId) {
            console.log('❌ No categoryId provided');
            return 'Không xác định';
        }
        
        const category = this.categories.find(cat => {
            // Convert both to strings for comparison
            const catIdStr = String(cat._id);
            const categoryIdStr = String(categoryId);
            
            const match = catIdStr === categoryIdStr || 
                         cat.id === categoryId || 
                         cat.slug === categoryId ||
                         cat.name === categoryId; // Also check by name as fallback
            
            console.log(`🔍 Checking category ${cat.name}: _id=${cat._id} (${typeof cat._id}), categoryId=${categoryId} (${typeof categoryId}), match=${match}`);
            return match;
        });
        
        console.log('✅ Found category:', category);
        const result = category ? category.name : 'Không xác định';
        console.log('📝 Returning category name:', result);
        return result;
    }

    // Get category description by ID
    getCategoryDescription(categoryId) {
        try {
            const category = this.categories.find(cat => {
                const catIdStr = String(cat._id);
                const categoryIdStr = String(categoryId);
                
                return catIdStr === categoryIdStr || 
                       cat.id === categoryId || 
                       cat.slug === categoryId ||
                       cat.name === categoryId;
            });
            return category ? (category.description || category.name) : 'Tất cả sản phẩm';
        } catch (error) {
            return 'Tất cả sản phẩm';
        }
    }

    // Render rich text content safely
    renderRichText(content) {
        try {
            if (!content) return '';
            
            // If content contains HTML tags, render them
            if (content.includes('<') && content.includes('>')) {
                // Create a temporary div to safely render HTML
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = content;
                
                // Return the innerHTML to render HTML tags
                return tempDiv.innerHTML;
            }
            
            // If no HTML tags, return as plain text with line breaks
            return content.replace(/\n/g, '<br>');
        } catch (error) {
            console.error('Error rendering rich text:', error);
            return content || '';
        }
    }

    // Render category icon (handle both base64 and emoji)
    renderCategoryIcon(icon) {
        if (!icon) return '🏷️';
        
        // Check if it's base64 image
        if (icon.startsWith('data:image/')) {
            return `<img src="${icon}" alt="Category Icon" style="width: 24px; height: 24px; object-fit: contain;">`;
        }
        
        // Check if it's a URL
        if (icon.startsWith('http://') || icon.startsWith('https://')) {
            return `<img src="${icon}" alt="Category Icon" style="width: 24px; height: 24px; object-fit: contain;">`;
        }
        
        // If it's emoji or text, return as is
        return icon;
    }

    // Get category icon by ID
    getCategoryIcon(categoryId) {
        const category = this.categories.find(cat => {
            // Convert both to strings for comparison
            const catIdStr = String(cat._id);
            const categoryIdStr = String(categoryId);
            
            return catIdStr === categoryIdStr || 
                   cat.id === categoryId || 
                   cat.slug === categoryId ||
                   cat.name === categoryId; // Also check by name as fallback
        });
        return category ? this.renderCategoryIcon(category.icon) : '🏷️';
    }

    // Get product count by category
    getProductCountByCategory(categoryId) {
        console.log('Counting products for category:', categoryId);
        console.log('Available products:', this.products);
        console.log('Available categories:', this.categories);
        
        const count = this.products.filter(product => {
            const match = product.categoryId === categoryId || product.category === categoryId;
            console.log(`Product ${product.name}: categoryId=${product.categoryId}, category=${product.category}, match=${match}`);
            return match;
        }).length;
        
        console.log(`Total products for category ${categoryId}: ${count}`);
        return count;
    }

    // Parse unknown price formats into number
    toNumberPrice(rawPrice) {
        if (rawPrice === null || rawPrice === undefined || rawPrice === '') return NaN;
        if (typeof rawPrice === 'number') return Number.isFinite(rawPrice) ? rawPrice : NaN;

        const cleaned = String(rawPrice).replace(/[^\d]/g, '');
        if (!cleaned) return NaN;

        const parsed = Number(cleaned);
        return Number.isFinite(parsed) ? parsed : NaN;
    }

    // Build pricing metadata for product cards
    getProductPriceInfo(product) {
        const currentPrice = this.toNumberPrice(product && product.price);

        const originalPriceCandidates = [
            product && product.originalPrice,
            product && product.oldPrice,
            product && product.compareAtPrice,
            product && product.priceBeforeDiscount
        ];

        let originalPrice = NaN;
        for (const candidate of originalPriceCandidates) {
            const value = this.toNumberPrice(candidate);
            if (Number.isFinite(value) && value > 0) {
                originalPrice = value;
                break;
            }
        }

        if (!Number.isFinite(originalPrice) && Number.isFinite(currentPrice) && currentPrice > 0) {
            originalPrice = currentPrice;
        }

        let discountPercent = 0;
        if (
            Number.isFinite(currentPrice) &&
            Number.isFinite(originalPrice) &&
            currentPrice > 0 &&
            originalPrice > currentPrice
        ) {
            discountPercent = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
        }

        return {
            currentPrice,
            originalPrice,
            discountPercent
        };
    }

    // Format price
    formatPrice(price) {
        const numericPrice = this.toNumberPrice(price);
        if (!Number.isFinite(numericPrice) || numericPrice <= 0) return 'Liên hệ';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(numericPrice);
    }

    // Update products count
    updateProductsCount() {
        const productsCount = document.getElementById('productsCount');
        if (productsCount) {
            const filteredProducts = this.getFilteredProducts();
            productsCount.textContent = filteredProducts.length;
        }
    }

    // Re-render product list after filter changes
    applyFilters() {
        this.currentPage = 1;
        this.displayProducts();
        this.updateProductsCount();
    }

    // Show categories error
    showCategoriesError() {
        const categoriesList = document.getElementById('categoriesList');
        if (categoriesList) {
            categoriesList.innerHTML = `
                <div class="categories-error">
                    <p>❌ Không thể tải danh mục</p>
                    <button class="btn-retry" onclick="productsManager.loadCategories()">🔄 Thử lại</button>
                </div>
            `;
        }
    }

    // Show products error
    showProductsError() {
        const productsGrid = document.getElementById('productsGrid');
        if (productsGrid) {
            productsGrid.innerHTML = `
                <div class="products-error">
                    <p>❌ Không thể tải sản phẩm</p>
                    <button class="btn-retry" onclick="productsManager.loadProducts()">🔄 Thử lại</button>
                </div>
            `;
        }
    }


    // View product details (placeholder)
    viewProductDetails(productId) {
        console.log('Viewing product details:', productId);
        // TODO: Implement product detail view
        alert('Chức năng xem chi tiết sản phẩm đang được phát triển!');
    }

    // Setup event listeners
    setupEventListeners() {
        // Search input with debounce
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchDebounceTimer);
                const value = e.target.value;
                this.searchDebounceTimer = setTimeout(() => {
                    this.filters.search = value.trim();
                    this.applyFilters();
                    this.toggleClearSearchButton();
                }, this.searchDebounceMs);
            });

            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    clearTimeout(this.searchDebounceTimer);
                    this.filters.search = e.target.value.trim();
                    this.applyFilters();
                    this.toggleClearSearchButton();
                }
            });
        }

        // Search button
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    clearTimeout(this.searchDebounceTimer);
                    this.filters.search = searchInput.value.trim();
                    this.applyFilters();
                    this.toggleClearSearchButton();
                }
            });
        }

        // Clear search button
        const clearSearchBtn = document.getElementById('clearSearchBtn');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    clearTimeout(this.searchDebounceTimer);
                    searchInput.value = '';
                    this.filters.search = '';
                    this.applyFilters();
                    this.toggleClearSearchButton();
                }
            });
        }

        // Price filter (always-visible radio list)
        const priceRangeInputs = document.querySelectorAll('input[name="priceRange"]');
        if (priceRangeInputs && priceRangeInputs.length > 0) {
            priceRangeInputs.forEach((input) => {
                input.addEventListener('change', (e) => {
                    this.filters.priceRange = e.target.value;
                    this.applyFilters();
                });
            });
        }

        // Sort selector
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.value = this.filters.sortBy || 'default';
            sortSelect.addEventListener('change', (e) => {
                this.filters.sortBy = e.target.value || 'default';
                this.applyFilters();
            });
        }

        // Pagination buttons
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.goToPage(this.currentPage - 1);
                }
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const totalItems = this.getFilteredProducts().length;
                const totalPages = Math.ceil(totalItems / this.itemsPerPage);
                if (this.currentPage < totalPages) {
                    this.goToPage(this.currentPage + 1);
                }
            });
        }
    }

    // Toggle clear search button visibility
    toggleClearSearchButton() {
        const clearSearchBtn = document.getElementById('clearSearchBtn');
        const searchInput = document.getElementById('searchInput');
        
        if (clearSearchBtn && searchInput) {
            if (searchInput.value.trim() !== '') {
                clearSearchBtn.classList.add('visible');
            } else {
                clearSearchBtn.classList.remove('visible');
            }
        }
    }

    // Setup mobile category dropdown
    setupMobileCategoryDropdown() {
        const mobileSelect = document.getElementById('mobileCategorySelect');
        const clearBtn = document.getElementById('clearMobileCategoryBtn');
        
        if (mobileSelect) {
            mobileSelect.addEventListener('change', (e) => {
                const categoryId = e.target.value;
                this.filters.category = categoryId;
                this.currentPage = 1;
                this.displayProducts();
                this.updateProductsCount();
                this.toggleClearMobileCategoryButton();
                
                // Update category title
                if (categoryId) {
                    const selectedCategory = this.categories.find(cat => 
                        (cat._id || cat.id) === categoryId
                    );
                    if (selectedCategory) {
                        document.getElementById('categoryTitle').textContent = selectedCategory.name;
                    }
                } else {
                    document.getElementById('categoryTitle').textContent = 'Tất cả sản phẩm';
                }
            });
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                mobileSelect.value = '';
                this.filters.category = '';
                this.currentPage = 1;
                this.displayProducts();
                this.updateProductsCount();
                this.toggleClearMobileCategoryButton();
                document.getElementById('categoryTitle').textContent = 'Tất cả sản phẩm';
            });
        }
    }

    // Toggle clear mobile category button visibility
    toggleClearMobileCategoryButton() {
        const clearBtn = document.getElementById('clearMobileCategoryBtn');
        const mobileSelect = document.getElementById('mobileCategorySelect');
        
        if (clearBtn && mobileSelect) {
            if (mobileSelect.value) {
                clearBtn.style.display = 'flex';
            } else {
                clearBtn.style.display = 'none';
            }
        }
    }

    // Reset all filters
    resetFilters() {
        this.filters = {
            search: '',
            category: '',
            priceRange: '',
            sortBy: 'default'
        };

        // Reset search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }

        // Hide clear search button
        this.toggleClearSearchButton();

        // Reset price filter
        const allPriceInput = document.querySelector('input[name="priceRange"][value=""]');
        if (allPriceInput) {
            allPriceInput.checked = true;
        }

        // Remove active category
        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.remove('active');
        });
        const allCategoryItem = document.querySelector('.category-item[data-category-id=""]');
        if (allCategoryItem) {
            allCategoryItem.classList.add('active');
        }

        const mobileSelect = document.getElementById('mobileCategorySelect');
        if (mobileSelect) {
            mobileSelect.value = '';
            this.toggleClearMobileCategoryButton();
        }

        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.value = 'default';
        }

        // Reset current page and refresh
        this.currentPage = 1;
        
        // Reset category title
        this.updateCategoryTitle('');
        
        this.displayProducts();
        this.updateProductsCount();
    }

    // Helper to get product image or placeholder
    getProductImage(product) {
        try {
            if (product.images && product.images.length > 0) {
                return `<img src="${product.images[0]}" alt="${product.name}" loading="lazy" decoding="async" width="320" height="240" onerror="this.onerror=null;this.src='/images/steam-background.png'">`;
            }
            
            return `<img src="/images/steam-background.png" alt="${product.name}" loading="lazy" decoding="async" width="320" height="240">`;
        } catch (error) {
            console.error('Error getting product image:', error);
            return `<img src="/images/steam-background.png" alt="${product.name}" loading="lazy" decoding="async" width="320" height="240">`;
        }
    }

    // Get category color for placeholder images
    getCategoryColor(categoryId) {
        try {
            const category = this.categories.find(cat => cat._id === categoryId || cat.id === categoryId);
            if (category) {
                // Return different colors based on category
                const colors = {
                    'Cảm biến': '4CAF50',      // Green
                    'Arduino': '2196F3',        // Blue
                    'Robot': 'FF9800',          // Orange
                    '3D Printer': '9C27B0',     // Purple
                    'Kit': 'F44336',            // Red
                    'Module': '00BCD4'          // Cyan
                };
                
                for (const [key, color] of Object.entries(colors)) {
                    if (category.name.includes(key)) {
                        return color;
                    }
                }
            }
            return '4CAF50'; // Default green
        } catch (error) {
            return '4CAF50';
        }
    }

}

// Initialize products manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.productsManager = new ProductsManager();
});

// CSS đã được chuyển sang file style.css chính để tránh xung đột

