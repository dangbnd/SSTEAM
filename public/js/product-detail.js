// Product Detail Page JavaScript
class ProductDetailManager {
    constructor() {
        this.product = null;
        this.currentImageIndex = 0;
        this.imageViewerKeyHandler = null;
        this.init();
    }

    async init() {
        try {
            // Get product ID from URL
            const productId = this.getProductIdFromUrl();
            if (!productId) {
                this.showError('Không tìm thấy ID sản phẩm');
                return;
            }

            // Load product data
            await this.loadProduct(productId);
            
            // Skip related products
            
            // Setup event listeners
            this.setupEventListeners();
            
        } catch (error) {
            console.error('Error initializing product detail:', error);
            this.showError('Lỗi khi tải thông tin sản phẩm');
        }
    }

    // Get product ID from URL
    getProductIdFromUrl() {
        try {
            // Check for slug query parameter first (for navigation from suggestions)
            const urlParams = new URLSearchParams(window.location.search);
            const slugParam = urlParams.get('slug');
            if (slugParam) {
                return slugParam;
            }
            
            // Extract slug directly from URL path: /product-slug
            const pathParts = window.location.pathname.split('/');
            const slug = pathParts[pathParts.length - 1];
            
            if (slug && slug !== '' && slug !== 'product-detail.html') {
                return slug;
            }
            
            // Fallback to id query parameter for backward compatibility
            return urlParams.get('id');
        } catch (error) {
            console.error('Error getting product ID from URL:', error);
            return null;
        }
    }

    // Load product data from API
    async loadProduct(productId) {
        try {
            console.log('🔄 Loading product:', productId);
            
            // Try to load by slug first, then by ID
            let response = await fetch(`/api/products/slug/${productId}`);
            if (!response.ok) {
                // If slug not found, try by ID
                response = await fetch(`/api/products/${productId}`);
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
    
            this.product = await response.json();
            console.log('✅ Product loaded:', this.product);
            
            // Update page title and meta
            this.updatePageMeta();
            
            // Display product
            this.displayProduct();
            
        } catch (error) {
            console.error('❌ Error loading product:', error);
            this.showError('Không thể tải thông tin sản phẩm: ' + error.message);
        }
    }

    // Update page meta information
    updatePageMeta() {
        try {
            if (!this.product) return;

            // Update page title
            document.title = `${this.product.name} | Smart Steam Education`;
            
            // Update breadcrumb
            const breadcrumbName = document.getElementById('breadcrumb-product');
            if (breadcrumbName) {
                breadcrumbName.textContent = this.product.name;
            }

            // Update meta description
            const metaDescription = document.querySelector('meta[name="description"]');
            if (metaDescription) {
                metaDescription.content = this.product.description || this.product.metaDescription || 'Khám phá chi tiết sản phẩm giáo dục Smart Steam';
            }

            // Update meta keywords
            const metaKeywords = document.querySelector('meta[name="keywords"]');
            if (metaKeywords) {
                const keywords = this.product.keywords || this.product.tags || [];
                metaKeywords.content = Array.isArray(keywords) ? keywords.join(', ') : keywords;
            }

        } catch (error) {
            console.error('Error updating page meta:', error);
        }
    }

    // Display product information
    displayProduct() {
        try {
            if (!this.product) return;

            const mediaCol  = document.getElementById('pd-media-col');
            const infoCol   = document.getElementById('pd-info-col');
            const tabsRow   = document.getElementById('pd-tabs-row');
            const modalRoot = document.getElementById('pd-modal-root');

            if (!mediaCol || !infoCol || !tabsRow) {
                console.error('❌ Product detail DOM containers not found');
                return;
            }

            const outOfStock = this.isOutOfStock();
            const disabledAttr = outOfStock ? 'disabled aria-disabled="true"' : '';

            // ─── Column 2: Media Card ───────────────────────────────────────
            mediaCol.innerHTML = `
                <div class="pd-media-card">
                    <div class="pd-main-image-wrap">
                        <img
                            src="${this.getMainImage()}"
                            alt="${this.product.name}"
                            class="pd-main-image"
                            id="mainImage"
                            onclick="productDetail.openImageModal()"
                            title="Click để xem ảnh phóng to"
                        >
                        <button class="pd-zoom-hint" onclick="productDetail.openImageModal()" aria-label="Xem ảnh phóng to">🔍</button>
                    </div>
                    <div class="pd-thumbnail-rail">
                        <button class="pd-thumb-nav pd-thumb-nav--prev" onclick="productDetail.scrollThumbnails(-1)" aria-label="Cuộn trái">‹</button>
                        <div class="pd-thumbnail-viewport">
                            <div class="pd-thumbnail-strip" id="thumbnailStrip">
                                ${this.renderThumbnails()}
                            </div>
                        </div>
                        <button class="pd-thumb-nav pd-thumb-nav--next" onclick="productDetail.scrollThumbnails(1)" aria-label="Cuộn phải">›</button>
                    </div>
                </div>
            `;

            // ─── Column 3: Info Card ────────────────────────────────────────
            infoCol.innerHTML = `
                <div class="pd-info-card">
                    <div class="product-title-section">
                        <h1 class="product-title">${this.product.name || 'Sản phẩm'}</h1>
                        <div class="product-rating-row">
                            <span class="rating-stars">${this.renderRatingStars(this.getRatingValue())}</span>
                            <span class="rating-count">(${this.getReviewCount()} đánh giá)</span>
                        </div>
                    </div>

                    <div class="product-price-block">
                        ${this.renderPrice()}
                    </div>

                    <p class="product-short-desc">${this.getShortDescription()}</p>

                    <div class="purchase-row">
                        <div class="quantity-selector">
                            <label for="quantity">Số lượng:</label>
                            <div class="quantity-controls">
                                <button class="quantity-btn" onclick="productDetail.changeQuantity(-1)" ${disabledAttr}>-</button>
                                <input type="number" id="quantity" value="1" min="1" class="quantity-input" ${disabledAttr}>
                                <button class="quantity-btn" onclick="productDetail.changeQuantity(1)" ${disabledAttr}>+</button>
                            </div>
                        </div>
                        <div class="stock-side">${this.renderStockStatusInline()}</div>
                    </div>

                    <div class="product-actions">
                        <button class="btn-add-cart" onclick="productDetail.addToCart()" ${disabledAttr}>
                            THÊM VÀO GIỎ HÀNG
                        </button>
                        <button class="btn-buy-now" onclick="productDetail.buyNow()" ${disabledAttr}>
                            MUA NGAY
                        </button>
                    </div>
                </div>
            `;

            // ─── Row 2: Tabs below spanning all columns ─────────────────────
            tabsRow.innerHTML = `
                <div class="product-bottom-section">
                    <div class="product-details-tabs">
                        <div class="tabs-nav">
                            <button class="tab-button active" data-tab="description">Mô tả chi tiết</button>
                            <button class="tab-button" data-tab="specs">Thông số kỹ thuật</button>
                            <button class="tab-button" data-tab="features">Tính năng</button>
                            <button class="tab-button" data-tab="reviews">Đánh giá &amp; Bình luận</button>
                        </div>
                        <div class="tab-content active" id="description">
                            <div class="description-content">
                                <h3>Mô tả sản phẩm</h3>
                                <div class="product-description-text">
                                    ${this.renderRichText(this.product.fullDescription || this.product.description || 'Không có mô tả chi tiết')}
                                </div>
                            </div>
                        </div>
                        <div class="tab-content" id="specs">
                            ${this.renderSpecifications()}
                        </div>
                        <div class="tab-content" id="features">
                            ${this.renderFeatures()}
                        </div>
                        <div class="tab-content" id="reviews">
                            ${this.renderReviews()}
                        </div>
                    </div>
                </div>
            `;

            // ─── Lightbox modal ─────────────────────────────────────────────
            if (modalRoot) {
                modalRoot.innerHTML = this.renderImageViewerModal();
            }

            // Load product suggestions asynchronously
            setTimeout(() => {
                if (this && typeof this.loadProductSuggestions === 'function') {
                    this.loadProductSuggestions();
                } else if (window.productDetail && typeof window.productDetail.loadProductSuggestions === 'function') {
                    window.productDetail.loadProductSuggestions();
                }
            }, 100);

        } catch (error) {
            console.error('❌ Error displaying product:', error);
            this.showError('Lỗi khi hiển thị sản phẩm');
        }
    }


    // Get main product image
    getMainImage() {
        try {
            if (this.product.images && this.product.images.length > 0) {
                return this.product.images[0];
            }
            // Fallback to default image
            return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjVGNUY1Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7huqNuIG5o4buNYyBpbWc8L3RleHQ+Cjwvc3ZnPgo=';
        } catch (error) {
            console.error('❌ Error getting main image:', error);
            return '';
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
            console.error('❌ Error rendering rich text:', error);
            return content || '';
        }
    }

    getShortDescription(maxLength = 170) {
        try {
            const source = this.product.shortDescription || this.product.description || this.product.fullDescription || '';
            const plainText = String(source)
                .replace(/<[^>]*>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            if (!plainText) {
                return 'Bộ kit khởi đầu hoàn hảo để học STEM, thực hành điện tử và lập trình cơ bản.';
            }

            if (plainText.length <= maxLength) {
                return plainText;
            }

            return `${plainText.slice(0, maxLength).trim()}...`;
        } catch (error) {
            console.error('Error creating short description:', error);
            return 'Bộ kit khởi đầu hoàn hảo để học STEM, thực hành điện tử và lập trình cơ bản.';
        }
    }

    getReviewCount() {
        const reviewCount =
            Number(this.product.reviewCount) ||
            Number(this.product.reviewsCount) ||
            (Array.isArray(this.product.reviews) ? this.product.reviews.length : 0);

        return reviewCount > 0 ? reviewCount : 12;
    }

    getRatingValue() {
        const rating =
            Number(this.product.ratingAverage) ||
            Number(this.product.rating) ||
            Number(this.product.averageRating);

        if (!Number.isFinite(rating) || rating <= 0) {
            return 4.8;
        }

        return Math.max(0, Math.min(5, rating));
    }

    renderRatingStars(ratingValue) {
        const rating = Number.isFinite(ratingValue) ? ratingValue : 4.8;
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating - fullStars >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        return `${'★'.repeat(fullStars)}${hasHalfStar ? '☆' : ''}${'✩'.repeat(emptyStars)}`;
    }

    getStockState() {
        try {
            const rawStock = this.product?.stock;
            const hasRawStock = rawStock !== null && rawStock !== undefined && rawStock !== '';
            const numericStock = Number(rawStock);

            if (hasRawStock && Number.isFinite(numericStock)) {
                if (numericStock <= 0) return { key: 'out', text: 'Hết hàng' };
                if (numericStock <= 5) return { key: 'critical', text: `${numericStock} sản phẩm` };
                if (numericStock <= 10) return { key: 'low', text: `${numericStock} sản phẩm` };
                return { key: 'in', text: 'Còn hàng' };
            }

            const availability = String(
                this.product?.availability ||
                this.product?.stockStatus ||
                this.product?.status ||
                ''
            ).toLowerCase();

            if (
                this.product?.inStock === false ||
                this.product?.isAvailable === false ||
                availability.includes('out') ||
                availability.includes('hết')
            ) {
                return { key: 'out', text: 'Hết hàng' };
            }

            return { key: 'in', text: 'Còn hàng' };
        } catch (error) {
            console.error('Error resolving stock state:', error);
            return { key: 'out', text: 'Hết hàng' };
        }
    }

    isOutOfStock() {
        return this.getStockState().key === 'out';
    }

    renderStockStatusInline() {
        try {
            const state = this.getStockState();
            if (state.key === 'in') {
                return `<span class="stock-inline in-stock">${state.text}</span>`;
            }
            if (state.key === 'low') {
                return `<span class="stock-inline low-stock">${state.text}</span>`;
            }
            if (state.key === 'critical') {
                return `<span class="stock-inline critical-stock">${state.text}</span>`;
            }
            return `<span class="stock-inline out-stock">${state.text}</span>`;
        } catch (error) {
            console.error('Error rendering inline stock status:', error);
            return '<span class="stock-inline out-stock">Hết hàng</span>';
        }
    }

    // Render product thumbnails (gallery strip only — no duplicate full images)
    renderThumbnails() {
        try {
            if (!this.product.images || this.product.images.length === 0) {
                return '<div class="no-images">Không có ảnh</div>';
            }

            const thumbnails = this.product.images.map((image, index) => `
                <img src="${image}"
                     alt="Ảnh ${index + 1}"
                     class="pd-thumb ${index === 0 ? 'active' : ''}"
                     onclick="productDetail.selectImage(${index})"
                     data-index="${index}"
                     loading="lazy">
            `).join('');

            return thumbnails;

        } catch (error) {
            console.error('❌ Error rendering thumbnails:', error);
            return '';
        }
    }

    renderModalThumbnails() {
        try {
            if (!this.product.images || this.product.images.length === 0) return '';
            return this.product.images.map((image, index) => `
                <img src="${image}"
                     alt="Ảnh gốc ${index + 1}"
                     class="modal-thumbnail ${index === this.currentImageIndex ? 'active' : ''}"
                     onclick="productDetail.selectModalImage(${index})"
                     data-index="${index}">
            `).join('');
        } catch (error) {
            console.error('Error rendering modal thumbnails:', error);
            return '';
        }
    }

    renderImageViewerModal() {
        try {
            const mainImage = this.product?.images?.[0] || this.getMainImage();
            const hasMultiple = (this.product?.images?.length || 0) > 1;
            return `
                <div class="image-viewer-modal" id="imageViewerModal" aria-hidden="true" role="dialog" aria-modal="true" aria-label="Xem ảnh sản phẩm">
                    <div class="image-viewer-backdrop" onclick="productDetail.closeImageModal()"></div>
                    <div class="image-viewer-dialog">
                        <button type="button" class="image-viewer-close" id="imageViewerClose" aria-label="Đóng">✕</button>
                        ${hasMultiple ? `<button type="button" class="image-viewer-prev" id="imageViewerPrev" aria-label="Ảnh trước">&#8249;</button>` : ''}
                        <div class="image-viewer-main">
                            <img src="${mainImage}" alt="${this.product?.name || 'Ảnh sản phẩm'}" id="imageViewerMainImage">
                        </div>
                        ${hasMultiple ? `<button type="button" class="image-viewer-next" id="imageViewerNext" aria-label="Ảnh sau">&#8250;</button>` : ''}
                        ${hasMultiple ? `
                        <div class="image-viewer-thumbs" id="imageViewerThumbs">
                            ${this.renderModalThumbnails()}
                        </div>` : ''}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error rendering image viewer modal:', error);
            return '';
        }
    }

    // Get category name
    getCategoryName() {
        try {
            if (this.product.categoryName) {
                return this.product.categoryName;
            }
            if (this.product.categoryId) {
                // Try to get category name from loaded categories
                return this.product.categoryId;
            }
            return 'Không phân loại';
        } catch (error) {
            console.error('Error getting category name:', error);
            return 'Không phân loại';
        }
    }

    // Render price information
    renderPrice() {
        try {
            const currentPrice = this.product.price || 0;
            const originalPrice = this.product.originalPrice || 0;
            
            let priceHTML = `<span class="current-price">${this.formatPrice(currentPrice)}</span>`;
            
            if (originalPrice > currentPrice) {
                const discount = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
                priceHTML += `
                    <span class="original-price">${this.formatPrice(originalPrice)}</span>
                    <span class="discount-badge">-${discount}%</span>
                `;
            }
            
            return priceHTML;
        } catch (error) {
            console.error('Error rendering price:', error);
            return `<span class="current-price">Liên hệ</span>`;
        }
    }

    // Format price to Vietnamese currency
    formatPrice(price) {
        try {
            if (!price || price <= 0) return 'Liên hệ';
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
            }).format(price);
        } catch (error) {
            console.error('Error formatting price:', error);
            return price + ' VNĐ';
        }
    }

    // Render stock status
    renderStockStatus() {
        try {
            const stock = this.product.stock || 0;
            let statusClass = 'stock-out';
            let statusText = 'Hết hàng';

            if (stock > 10) {
                statusClass = 'stock-in';
                statusText = 'Còn hàng';
            } else if (stock > 5) {
                statusClass = 'stock-low';
                statusText = `${stock} sản phẩm`;
            } else if (stock > 0) {
                statusClass = 'stock-critical';
                statusText = `${stock} sản phẩm`;
            }

            return `<div class="stock-status ${statusClass}">${statusText}</div>`;
        } catch (error) {
            console.error('Error rendering stock status:', error);
            return '';
        }
    }

    // Render product specifications
    renderSpecifications() {
        try {
            const specs = [];
            
            if (this.product.sku) specs.push(['Mã sản phẩm', this.product.sku]);
            if (this.product.weight) specs.push(['Trọng lượng', `${this.product.weight}g`]);
            if (this.product.length) specs.push(['Chiều dài', `${this.product.length}cm`]);
            if (this.product.width) specs.push(['Chiều rộng', `${this.product.width}cm`]);
            if (this.product.height) specs.push(['Chiều cao', `${this.product.height}cm`]);
            if (this.product.categoryName) specs.push(['Danh mục', this.product.categoryName]);
            if (this.product.createdAt) specs.push(['Ngày tạo', new Date(this.product.createdAt).toLocaleDateString('vi-VN')]);

            if (specs.length === 0) {
                return '<p>Không có thông số kỹ thuật</p>';
            }

            const specsHTML = specs.map(([label, value]) => `
                <div class="spec-item">
                    <span class="spec-label">${label}</span>
                    <span class="spec-value">${value}</span>
                </div>
            `).join('');

            return `<div class="specs-grid">${specsHTML}</div>`;

        } catch (error) {
            console.error('Error rendering specifications:', error);
            return '<p>Không có thông số kỹ thuật</p>';
        }
    }

    // Render full description
    renderFullDescription() {
        try {
            const description = this.product.fullDescription || this.product.description || 'Không có mô tả chi tiết';
            return `<div class="full-description">${description}</div>`;
        } catch (error) {
            console.error('Error rendering full description:', error);
            return '<p>Không có mô tả chi tiết</p>';
        }
    }

    // Render product features
    renderFeatures() {
        try {
            const features = this.product.features;
            if (!features) {
                return '<p>Không có thông tin tính năng</p>';
            }

            if (Array.isArray(features)) {
                const featuresHTML = features.map(feature => `<li>${feature}</li>`).join('');
                return `<ul class="features-list">${featuresHTML}</ul>`;
            } else {
                // If features is a string, split by commas or newlines
                const featuresList = features.split(/[,;\n]/).filter(f => f.trim());
                const featuresHTML = featuresList.map(feature => `<li>${feature.trim()}</li>`).join('');
                return `<ul class="features-list">${featuresHTML}</ul>`;
            }

        } catch (error) {
            console.error('Error rendering features:', error);
            return '<p>Không có thông tin tính năng</p>';
        }
    }

    // Related products removed

    // Get product image for related products
    getProductImage(product) {
        try {
            if (product.images && product.images.length > 0) {
                return product.images[0];
            }
            // Fallback to default image
            return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjgwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDI4MCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyODAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjVGNUY1Ii8+Cjx0ZXh0IHg9IjE0MCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7huqNuIG5o4buNYyBpbWc8L3RleHQ+Cjwvc3ZnPgo=';
        } catch (error) {
            console.error('Error getting product image:', error);
            return '';
        }
    }

    // Setup event listeners
    setupEventListeners() {
        try {
            // Tab navigation
            this.setupTabNavigation();
            
            // Mobile menu toggle
            this.setupMobileMenu();

            // Product image viewer
            this.setupImageViewerEvents();
            
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }

    // Setup tab navigation
    setupTabNavigation() {
        try {
            const tabButtons = document.querySelectorAll('.tab-button');
            const tabContents = document.querySelectorAll('.tab-content');

            tabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const tabId = button.dataset.tab;
                    
                    // Remove active class from all buttons and contents
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    tabContents.forEach(content => content.classList.remove('active'));
                    
                    // Add active class to clicked button and corresponding content
                    button.classList.add('active');
                    const targetContent = document.getElementById(tabId);
                    if (targetContent) {
                        targetContent.classList.add('active');
                    }
                });
            });

        } catch (error) {
            console.error('Error setting up tab navigation:', error);
        }
    }

    // Setup mobile menu
    setupMobileMenu() {
        try {
            const navToggle = document.querySelector('.nav-toggle');
            const navMenu = document.querySelector('.nav-menu');

            if (navToggle && navMenu) {
                navToggle.addEventListener('click', () => {
                    navMenu.classList.toggle('active');
                    navToggle.classList.toggle('active');
                });
            }

        } catch (error) {
            console.error('Error setting up mobile menu:', error);
        }
    }

    setupImageViewerEvents() {
        try {
            const modal = document.getElementById('imageViewerModal');
            const closeBtn = document.getElementById('imageViewerClose');
            const prevBtn = document.getElementById('imageViewerPrev');
            const nextBtn = document.getElementById('imageViewerNext');

            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closeImageModal());
            }

            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    const total = this.product?.images?.length || 1;
                    this.selectModalImage((this.currentImageIndex - 1 + total) % total);
                });
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    const total = this.product?.images?.length || 1;
                    this.selectModalImage((this.currentImageIndex + 1) % total);
                });
            }

            if (this.imageViewerKeyHandler) {
                document.removeEventListener('keydown', this.imageViewerKeyHandler);
            }

            this.imageViewerKeyHandler = (event) => {
                const isOpen = modal && modal.classList.contains('open');
                if (!isOpen) return;

                if (event.key === 'Escape') {
                    this.closeImageModal();
                } else if (event.key === 'ArrowRight') {
                    const total = this.product?.images?.length || 1;
                    this.selectModalImage((this.currentImageIndex + 1) % total);
                } else if (event.key === 'ArrowLeft') {
                    const total = this.product?.images?.length || 1;
                    this.selectModalImage((this.currentImageIndex - 1 + total) % total);
                }
            };

            document.addEventListener('keydown', this.imageViewerKeyHandler);
        } catch (error) {
            console.error('Error setting up image viewer events:', error);
        }
    }

    openImageModal(index = this.currentImageIndex) {
        try {
            const modal = document.getElementById('imageViewerModal');
            if (!modal) return;

            this.selectModalImage(index);
            modal.classList.add('open');
            modal.setAttribute('aria-hidden', 'false');
            document.body.classList.add('image-viewer-open');
        } catch (error) {
            console.error('Error opening image modal:', error);
        }
    }

    closeImageModal() {
        try {
            const modal = document.getElementById('imageViewerModal');
            if (!modal) return;

            modal.classList.remove('open');
            modal.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('image-viewer-open');
        } catch (error) {
            console.error('Error closing image modal:', error);
        }
    }

    // selectImage: update gallery strip + main image; does NOT open modal
    selectImage(index) {
        try {
            if (!this.product.images || !this.product.images[index]) return;
            this.currentImageIndex = index;

            // Update main image
            const mainImage = document.getElementById('mainImage');
            if (mainImage) mainImage.src = this.product.images[index];

            // Update thumbnail active state in gallery strip
            document.querySelectorAll('.pd-thumb').forEach((thumb, i) => {
                thumb.classList.toggle('active', i === index);
            });
        } catch (error) {
            console.error('Error selecting image:', error);
        }
    }

    selectModalImage(index) {
        try {
            if (!this.product.images || !this.product.images[index]) return;
            this.currentImageIndex = index;
            this.syncModalImage(index);

            // Also sync gallery strip
            const mainImage = document.getElementById('mainImage');
            if (mainImage) mainImage.src = this.product.images[index];
            document.querySelectorAll('.pd-thumb').forEach((thumb, i) => {
                thumb.classList.toggle('active', i === index);
            });
        } catch (error) {
            console.error('Error selecting modal image:', error);
        }
    }

    syncModalImage(index) {
        try {
            const modalMainImage = document.getElementById('imageViewerMainImage');
            if (modalMainImage && this.product?.images?.[index]) {
                modalMainImage.src = this.product.images[index];
                modalMainImage.alt = `${this.product.name || 'Ảnh sản phẩm'} - ảnh ${index + 1}`;
            }

            const modalThumbs = document.querySelectorAll('.modal-thumbnail');
            modalThumbs.forEach((thumb, i) => {
                thumb.classList.toggle('active', i === index);
            });
        } catch (error) {
            console.error('Error syncing modal image:', error);
        }
    }

    scrollThumbnails(direction) {
        try {
            const strip = document.getElementById('thumbnailStrip');
            if (strip) {
                const scrollAmount = 80; // approximate width of thumbnail + gap
                strip.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
            }
        } catch (error) {
            console.error('Error scrolling thumbnails:', error);
        }
    }

    // Change main image (legacy - used by cart/other code)
    changeMainImage(index) {
        try {
            if (!this.product.images || !this.product.images[index]) return;
            this.currentImageIndex = index;

            const mainImage = document.getElementById('mainImage');
            if (mainImage) mainImage.src = this.product.images[index];

            document.querySelectorAll('.pd-thumb').forEach((thumb, i) => {
                thumb.classList.toggle('active', i === index);
            });

            this.syncModalImage(index);
        } catch (error) {
            console.error('Error changing main image:', error);
        }
    }

    // Add to cart functionality
    addToCart() {
        try {
            if (!this.product) return;
            if (this.isOutOfStock()) {
                alert('Sản phẩm hiện đang hết hàng');
                return;
            }
            
            const quantity = parseInt(document.getElementById('quantity')?.value) || 1;
            const pid = this.product._id || this.product.id || this.product.slug || String(this.product.name);
            const payload = {
                id: pid,
                name: this.product.name,
                price: Number(this.product.price || 0),
                image: (this.product.images && this.product.images[0]) || this.product.image || '',
                quantity
            };
            // Save locally for instant UX
            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            const idx = cart.findIndex(i => i.id === pid);
            if (idx >= 0) {
                cart[idx].quantity += quantity;
            } else {
                cart.push(payload);
            }
            localStorage.setItem('cart', JSON.stringify(cart));
            console.log('Cart updated:', cart); // Debug log
            // Call API (best-effort)
            fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')||''}` },
                body: JSON.stringify(payload)
            }).catch(()=>{});
            try {
                const badge = document.getElementById('cart-count') || document.querySelector('.cart-count');
                if (badge) {
                    const totalQty = cart.reduce((s,i)=>s+i.quantity,0);
                    badge.textContent = String(totalQty);
                    badge.style.display = totalQty > 0 ? 'inline-flex' : 'none';
                }
            } catch(_) {}
            alert(`Đã thêm ${quantity} sản phẩm "${this.product.name}" vào giỏ hàng!`);
            
        } catch (error) {
            console.error('Error adding to cart:', error);
            alert('Lỗi khi thêm vào giỏ hàng');
        }
    }

    // Buy now functionality
    buyNow() {
        try {
            if (!this.product) return;
            if (this.isOutOfStock()) {
                alert('Sản phẩm hiện đang hết hàng');
                return;
            }
            
            const quantity = parseInt(document.getElementById('quantity')?.value) || 1;
            alert(`Chuyển đến trang thanh toán cho ${quantity} sản phẩm "${this.product.name}"!`);
            
        } catch (error) {
            console.error('Error buying now:', error);
            alert('Lỗi khi mua sản phẩm');
        }
    }

    // Show error message
    showError(message) {
        try {
            const productDetail = document.getElementById('productDetail');
            if (productDetail) {
                productDetail.innerHTML = `
                    <div class="error-message">
                        <h2>❌ Lỗi</h2>
                        <p>${message}</p>
                        <a href="/products" class="btn-primary">← Quay lại trang sản phẩm</a>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error showing error message:', error);
        }
    }

    // Change quantity
    changeQuantity(delta) {
        try {
            const quantityInput = document.getElementById('quantity');
            if (!quantityInput) return;
            if (quantityInput.disabled || this.isOutOfStock()) return;
            
            let currentQuantity = parseInt(quantityInput.value) || 1;
            currentQuantity = Math.max(1, currentQuantity + delta);
            quantityInput.value = currentQuantity;
            
            console.log('Quantity changed to:', currentQuantity);
        } catch (error) {
            console.error('Error changing quantity:', error);
        }
    }

    // PayPal checkout
    paypalCheckout() {
        try {
            if (!this.product) return;
            
            const quantity = document.getElementById('quantity')?.value || 1;
            alert(`Chuyển đến PayPal để thanh toán ${quantity} x "${this.product.name}"`);
            
        } catch (error) {
            console.error('Error with PayPal checkout:', error);
            alert('Lỗi khi chuyển đến PayPal');
        }
    }

    // Submit review
    submitReview() {
        try {
            const rating = document.getElementById('review-rating')?.value;
            const comment = document.getElementById('review-comment')?.value;
            
            if (!rating || !comment) {
                alert('Vui lòng điền đầy đủ thông tin đánh giá');
                return;
            }
            
            alert('Cảm ơn bạn đã đánh giá sản phẩm!');
            
            // Reset form
            document.getElementById('review-comment').value = '';
            
        } catch (error) {
            console.error('Error submitting review:', error);
            alert('Lỗi khi gửi đánh giá');
        }
    }

    // Render all info tab
    renderAllInfo() {
        try {
            return `
                <div class="all-info-content">
                    <div class="info-section">
                        <h3>Thông tin tổng quan</h3>
                        <p>${this.product.description || 'Không có mô tả'}</p>
                    </div>
                    
                    <div class="info-section">
                        <h3>Thông số kỹ thuật chính</h3>
                        ${this.renderSpecifications()}
                    </div>
                    
                    <div class="info-section">
                        <h3>Tính năng nổi bật</h3>
                        ${this.renderFeatures()}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error rendering all info:', error);
            return '<p>Không có thông tin</p>';
        }
    }

    // Render reviews tab
    renderReviews() {
        try {
            return `
                <div class="reviews-content">
                    <div class="reviews-header">
                        <h3>Đánh giá sản phẩm</h3>
                        <div class="reviews-summary">
                            <div class="rating-stars">⭐⭐⭐⭐⭐</div>
                            <span class="rating-text">4.8/5 (12 đánh giá)</span>
                        </div>
                    </div>
                    
                    <div class="review-form">
                        <h4>Viết đánh giá của bạn</h4>
                        <div class="form-group">
                            <label for="review-rating">Đánh giá:</label>
                            <select id="review-rating" class="review-rating-select">
                                <option value="5">⭐⭐⭐⭐⭐ Tuyệt vời</option>
                                <option value="4">⭐⭐⭐⭐ Tốt</option>
                                <option value="3">⭐⭐⭐ Khá</option>
                                <option value="2">⭐⭐ Trung bình</option>
                                <option value="1">⭐ Kém</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="review-comment">Nhận xét:</label>
                            <textarea id="review-comment" class="review-comment" rows="4" placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."></textarea>
                        </div>
                        <button class="btn-submit-review" onclick="productDetail.submitReview()">Gửi đánh giá</button>
                    </div>
                    
                    <div class="reviews-list">
                        <div class="review-item">
                            <div class="review-header">
                                <div class="reviewer-name">Nguyễn Văn A</div>
                                <div class="review-rating">⭐⭐⭐⭐⭐</div>
                                <div class="review-date">2 ngày trước</div>
                            </div>
                            <div class="review-content">
                                Sản phẩm chất lượng tốt, giao hàng nhanh. Rất hài lòng với dịch vụ!
                            </div>
                        </div>
                        
                        <div class="review-item">
                            <div class="review-header">
                                <div class="reviewer-name">Trần Thị B</div>
                                <div class="review-rating">⭐⭐⭐⭐⭐</div>
                                <div class="review-date">1 tuần trước</div>
                            </div>
                            <div class="review-content">
                                Đúng như mô tả, sản phẩm hoạt động ổn định. Khuyến nghị mua!
                            </div>
                        </div>
                        
                        <div class="review-item">
                            <div class="review-header">
                                <div class="reviewer-name">Lê Văn C</div>
                                <div class="review-rating">⭐⭐⭐⭐</div>
                                <div class="review-date">2 tuần trước</div>
                            </div>
                            <div class="review-content">
                                Sản phẩm tốt, giá cả hợp lý. Giao hàng hơi chậm một chút nhưng vẫn ổn.
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error rendering reviews:', error);
            return '<p>Không có đánh giá</p>';
        }
    }

    // Helper methods for product name formatting
    getProductNameMain() {
        try {
            if (this.product.name) {
                // For Vietnamese products, try to extract the main category
                const name = this.product.name;
                if (name.includes('Cảm biến')) return 'Cảm biến';
                if (name.includes('Arduino')) return 'Arduino';
                if (name.includes('Module')) return 'Module';
                if (name.includes('Board')) return 'Board';
                if (name.includes('Kit')) return 'Kit';
                
                // Fallback: take first word
                return name.split(' ')[0];
            }
            return '';
        } catch (error) {
            console.error('Error getting product name main:', error);
            return '';
        }
    }

    getProductNameSub() {
        try {
            if (this.product.name) {
                const name = this.product.name;
                // For "Cảm biến Mưa", return "Mưa"
                if (name.includes('Cảm biến Mưa')) return 'Mưa';
                if (name.includes('Arduino Uno')) return 'Uno R3';
                if (name.includes('Module')) return name.replace('Module', '').trim();
                
                // Fallback: take words after the first
                const words = name.split(' ');
                if (words.length > 1) {
                    return words.slice(1).join(' ');
                }
            }
            return '';
        } catch (error) {
            console.error('Error getting product name sub:', error);
            return '';
        }
    }

    getProductNameEnglish() {
        try {
            if (this.product.name) {
                const name = this.product.name;
                // For "Cảm biến Mưa", return "Rain Water Sensor Module"
                if (name.includes('Cảm biến Mưa')) return 'Rain Water Sensor Module';
                if (name.includes('Arduino Uno')) return 'Arduino Uno R3 Development Board';
                if (name.includes('Module')) return 'Electronic Module';
                
                // Fallback: try to generate English name
                return this.generateEnglishName(name);
            }
            return '';
        } catch (error) {
            console.error('Error getting product name English:', error);
            return '';
        }
    }

    generateEnglishName(vietnameseName) {
        try {
            // Simple mapping for common Vietnamese words
            const translations = {
                'Cảm biến': 'Sensor',
                'Mưa': 'Rain',
                'Nhiệt độ': 'Temperature',
                'Độ ẩm': 'Humidity',
                'Ánh sáng': 'Light',
                'Chuyển động': 'Motion',
                'Arduino': 'Arduino',
                'Uno': 'Uno',
                'R3': 'R3',
                'Module': 'Module',
                'Board': 'Board',
                'Kit': 'Kit'
            };

            let englishName = vietnameseName;
            Object.keys(translations).forEach(viet => {
                englishName = englishName.replace(new RegExp(viet, 'g'), translations[viet]);
            });

            return englishName;
        } catch (error) {
            console.error('Error generating English name:', error);
            return vietnameseName;
        }
    }

    // Render product suggestions (fallback method)
    renderProductSuggestions() {
        try {
            // This method is now just a fallback - real suggestions are loaded asynchronously
            return this.renderFallbackSuggestions();
        } catch (error) {
            console.error('Error rendering product suggestions:', error);
            return '<p class="no-suggestions">Không có sản phẩm gợi ý</p>';
        }
    }

    // Render fallback suggestions when API fails
    renderFallbackSuggestions() {
        const fallbackSuggestions = [
            {
                id: 'fallback-1',
                name: 'Cảm biến Nhiệt độ DHT22',
                price: 85000,
                originalPrice: 100000,
                image: this.getDefaultImage()
            },
            {
                id: 'fallback-2',
                name: 'Cảm biến Độ ẩm đất',
                price: 65000,
                originalPrice: 79000,
                image: this.getDefaultImage()
            },
            {
                id: 'fallback-3',
                name: 'Cảm biến Ánh sáng LDR',
                price: 25000,
                image: this.getDefaultImage()
            },
            {
                id: 'fallback-4',
                name: 'Cảm biến Chuyển động PIR',
                price: 45000,
                originalPrice: 52000,
                image: this.getDefaultImage()
            }
        ];

        return fallbackSuggestions.map(product => this.renderSuggestedProductCard(product)).join('');
    }

    // Get default image for products without images
    getDefaultImage() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjVGNUY1Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iNzUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPm5o4buNYyBpbWc8L3RleHQ+Cjwvc3ZnPgo=';
    }

    getSuggestionsContainer() {
        return (
            document.getElementById('productSidebarSuggestions') ||
            document.getElementById('productSuggestions')
        );
    }

    toNumberPrice(value) {
        if (typeof value === 'number') {
            return Number.isFinite(value) ? value : 0;
        }
        if (typeof value === 'string') {
            const normalized = value.replace(/[^\d.-]/g, '');
            const parsed = Number(normalized);
            return Number.isFinite(parsed) ? parsed : 0;
        }
        return 0;
    }

    getSuggestedPriceInfo(product) {
        const current = this.toNumberPrice(product?.price);
        const original = this.toNumberPrice(product?.originalPrice);
        const hasDiscount = original > current && current > 0;
        const discount = hasDiscount ? Math.round(((original - current) / original) * 100) : 0;

        return {
            current,
            original: hasDiscount ? original : 0,
            discount
        };
    }

    getSuggestionThumbnail(product) {
        if (product?.images && Array.isArray(product.images) && product.images.length > 0) {
            return product.images[0];
        }
        if (typeof product?.image === 'string' && product.image.trim() !== '') {
            return product.image;
        }
        return this.getDefaultImage();
    }

    renderSuggestedProductCard(product) {
        const productId = product?.slug || product?._id || product?.id || '';
        const productName = product?.name || 'Sản phẩm';
        const thumb = this.getSuggestionThumbnail(product);
        const pricing = this.getSuggestedPriceInfo(product);
        const currentPriceText = pricing.current > 0 ? this.formatPrice(pricing.current) : 'Liên hệ';
        const originalPriceHtml = pricing.original > 0
            ? `<span class="product-old-price">${this.formatPrice(pricing.original)}</span>`
            : '';
        const discountBadgeHtml = pricing.discount > 0
            ? `<span class="suggested-discount-badge">-${pricing.discount}%</span>`
            : '';

        return `
            <a href="/${encodeURIComponent(productId)}" class="suggested-product-item">
                <div class="suggested-product-thumb-wrap">
                    <img src="${thumb}" alt="${productName}" class="suggested-product-thumbnail" loading="lazy" onerror="this.src='${this.getDefaultImage()}'">
                    ${discountBadgeHtml}
                </div>
                <div class="suggested-product-info">
                    <h4>${productName}</h4>
                    <div class="suggested-product-prices">
                        <span class="product-price">${currentPriceText}</span>
                        ${originalPriceHtml}
                    </div>
                </div>
            </a>
        `;
    }

    // Load product suggestions asynchronously
    async loadProductSuggestions() {
        try {
            const suggestionsContainer = this.getSuggestionsContainer();
            if (!suggestionsContainer) {
                return;
            }

            suggestionsContainer.innerHTML = '<div class="suggestions-loading">Đang tải sản phẩm gợi ý...</div>';

            const poolLimit = 50;
            const response = await fetch(`/api/products?limit=${poolLimit}`);
            if (!response.ok) {
                suggestionsContainer.innerHTML = this.renderFallbackSuggestions();
                return;
            }

            let suggestions = await response.json();
            suggestions = Array.isArray(suggestions) ? suggestions : [];

            const currentId = this.product?._id || this.product?.id || this.product?.slug;
            suggestions = suggestions.filter((item) => {
                const itemId = item?._id || item?.id || item?.slug;
                return itemId && itemId !== currentId;
            });

            for (let i = suggestions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [suggestions[i], suggestions[j]] = [suggestions[j], suggestions[i]];
            }

            suggestions = suggestions.slice(0, 4);
            if (suggestions.length === 0) {
                suggestionsContainer.innerHTML = this.renderFallbackSuggestions();
                return;
            }

            suggestionsContainer.innerHTML = suggestions.map((product) => this.renderSuggestedProductCard(product)).join('');
        } catch (error) {
            console.error('❌ Error loading product suggestions:', error);
            const suggestionsContainer = this.getSuggestionsContainer();
            if (suggestionsContainer) {
                suggestionsContainer.innerHTML = this.renderFallbackSuggestions();
            }
        }
    }

    // View suggested product
    viewProduct(productId) {
        try {
            // Navigate to the product detail page
            if (productId) {
                // Use slug directly as per the routing pattern
                const productUrl = `/${encodeURIComponent(productId)}`;
                window.location.href = productUrl;
            }
        } catch (error) {
            console.error('Error viewing product:', error);
            // Fallback to alert if navigation fails
            alert(`Chuyển đến trang sản phẩm: ${productId}`);
        }
    }
}

// Initialize product detail page
let productDetail;

document.addEventListener('DOMContentLoaded', function() {
    try {
        productDetail = new ProductDetailManager();
        // Make it globally accessible for debugging
        window.productDetail = productDetail;
        console.log('✅ ProductDetailManager initialized and made global');
    } catch (error) {
        console.error('❌ Error initializing product detail page:', error);
    }
});
