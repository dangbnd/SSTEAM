(function () {
    const state = {
        allNews: [],
        allCategories: [],
        currentPage: 1,
        itemsPerPage: 12,
        searchDebounceMs: 50,
        searchDebounceTimer: null,
        isBootstrapping: true,
        gridTransitionToken: 0,
        filters: {
            category: 'all',
            dateRange: 'all',
            search: '',
            sort: 'default'
        }
    };

    const els = {};

    function cacheElements() {
        els.grid = document.getElementById('newsGrid');
        els.pagination = document.getElementById('newsPagination');
        els.categoriesList = document.getElementById('newsCategoriesList');
        els.searchInput = document.getElementById('newsSearch');
        els.searchBtn = document.getElementById('searchBtn');
        els.clearSearchBtn = document.getElementById('clearSearchBtn');
        els.dateFilter = document.getElementById('dateFilter');
        els.dateInputs = document.querySelectorAll('input[name="newsDateRange"]');
        els.sortSelect = document.getElementById('newsSortSelect');
        els.pageTitle = document.getElementById('newsTitle');
        els.resetBtn = document.getElementById('resetFiltersBtn');
    }

    function setBootstrapping(isLoading) {
        if (!document.body) {
            return;
        }
        document.body.classList.toggle('news-bootstrapping', Boolean(isLoading));
    }

    function setGridFetchingState(isFetching) {
        if (!els.grid) {
            return;
        }
        els.grid.classList.toggle('is-fetching', Boolean(isFetching));
    }

    function renderNewsSkeleton(count) {
        if (!els.grid) {
            return;
        }

        const total = Number.isFinite(count) ? count : state.itemsPerPage;
        const skeletonCards = Array.from({ length: total }).map(function () {
            return `
                <div class="news-skeleton-card" aria-hidden="true">
                    <div class="news-skeleton-media"></div>
                    <div class="news-skeleton-content">
                        <div class="news-skeleton-line news-skeleton-title"></div>
                        <div class="news-skeleton-line news-skeleton-title short"></div>
                        <div class="news-skeleton-line news-skeleton-title short-2"></div>
                    </div>
                </div>
            `;
        }).join('');

        els.grid.classList.add('is-loading');
        els.grid.innerHTML = skeletonCards;
    }

    function runGridTransition(renderFn) {
        state.gridTransitionToken += 1;
        const token = state.gridTransitionToken;

        setGridFetchingState(true);
        requestAnimationFrame(function () {
            renderFn();
            requestAnimationFrame(function () {
                if (token === state.gridTransitionToken) {
                    setGridFetchingState(false);
                }
            });
        });
    }

    async function fetchJson(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(response.status + ' ' + response.statusText);
        }
        return response.json();
    }

    function parseDate(value) {
        const time = new Date(value || 0).getTime();
        return Number.isFinite(time) ? time : 0;
    }

    function normalizeText(value) {
        return String(value || '').trim().toLowerCase();
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>"]/g, function (char) {
            return ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;'
            })[char] || char;
        });
    }

    function renderCategoryIcon(icon, fallback) {
        const iconValue = String(icon || '').trim();
        if (!iconValue) {
            return fallback;
        }

        const isImageUrl = iconValue.startsWith('http://') ||
            iconValue.startsWith('https://') ||
            iconValue.startsWith('data:image/') ||
            iconValue.startsWith('/');

        if (isImageUrl) {
            return `<img src="${escapeHtml(iconValue)}" alt="" loading="lazy" onerror="this.style.display='none'">`;
        }

        return escapeHtml(iconValue);
    }

    function getCategoryId(category) {
        return String(category && (category._id || category.id || category.slug || category.name) || '');
    }

    function getNewsCategoryId(news) {
        return String(
            news && (
                news.categoryId ||
                news.category ||
                (news.category && news.category._id) ||
                (news.category && news.category.id)
            ) || ''
        );
    }

    function extractFirstImageFromHtml(html) {
        if (!html || typeof html !== 'string') {
            return '';
        }

        const match = html.match(/<img[^>]+src=["']([^"'>]+)["']/i);
        return match && match[1] ? match[1] : '';
    }

    function getNewsImage(news) {
        return (
            news.featuredImage ||
            news.coverImage ||
            news.image ||
            (Array.isArray(news.images) && news.images[0]) ||
            extractFirstImageFromHtml(news.content) ||
            '/images/steam-background.png'
        );
    }

    function getNewsTitle(news) {
        return String((news && news.title) || 'Tin tức').trim();
    }

    function getCategoryCount(categoryId) {
        if (categoryId === 'all') {
            return state.allNews.length;
        }

        return state.allNews.filter(function (news) {
            return getNewsCategoryId(news) === String(categoryId);
        }).length;
    }

    function updateSearchClearButton() {
        if (!els.clearSearchBtn || !els.searchInput) {
            return;
        }

        const hasValue = els.searchInput.value.trim().length > 0;
        els.clearSearchBtn.classList.toggle('visible', hasValue);
    }

    function isDateInRange(dateValue, range) {
        if (range === 'all') {
            return true;
        }

        const timestamp = parseDate(dateValue);
        if (!timestamp) {
            return false;
        }

        const inputDate = new Date(timestamp);
        const now = new Date();

        if (range === 'today') {
            return inputDate.toDateString() === now.toDateString();
        }

        if (range === 'week') {
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return inputDate >= oneWeekAgo;
        }

        if (range === 'month') {
            const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return inputDate >= oneMonthAgo;
        }

        return true;
    }

    function updateTitle() {
        if (!els.pageTitle) {
            return;
        }

        if (state.filters.category === 'all') {
            els.pageTitle.textContent = 'Tất cả tin tức';
            return;
        }

        const activeCategory = state.allCategories.find(function (category) {
            return getCategoryId(category) === state.filters.category;
        });

        els.pageTitle.textContent = activeCategory && activeCategory.name
            ? activeCategory.name
            : 'Tất cả tin tức';
    }

    function getFilteredNews() {
        let result = state.allNews.slice();

        if (state.filters.category !== 'all') {
            result = result.filter(function (news) {
                return getNewsCategoryId(news) === state.filters.category;
            });
        }

        if (state.filters.dateRange !== 'all') {
            result = result.filter(function (news) {
                return isDateInRange(news.createdAt || news.publishedAt || news.date, state.filters.dateRange);
            });
        }

        if (state.filters.search) {
            const term = normalizeText(state.filters.search);
            result = result.filter(function (news) {
                const haystack = [
                    news.title,
                    news.description,
                    news.content
                ].map(normalizeText).join(' ');
                return haystack.includes(term);
            });
        }

        switch (state.filters.sort) {
            case 'oldest':
                result.sort(function (a, b) {
                    return parseDate(a.createdAt || a.publishedAt || a.date) - parseDate(b.createdAt || b.publishedAt || b.date);
                });
                break;
            case 'newest':
            case 'default':
            default:
                result.sort(function (a, b) {
                    return parseDate(b.createdAt || b.publishedAt || b.date) - parseDate(a.createdAt || a.publishedAt || a.date);
                });
                break;
        }

        return result;
    }

    function renderCategories() {
        if (!els.categoriesList) {
            return;
        }

        const allItem = `
            <li class="category-item ${state.filters.category === 'all' ? 'active' : ''}" data-category="all">
                <div class="category-row">
                    <span class="category-icon">📰</span>
                    <span class="category-name">Tất cả</span>
                    <span class="category-count">(${getCategoryCount('all')})</span>
                </div>
            </li>
        `;

        const categoryItems = state.allCategories.map(function (category) {
            const categoryId = getCategoryId(category);
            const activeClass = state.filters.category === categoryId ? 'active' : '';
            const iconValue = renderCategoryIcon(category.icon, '📂');

            return `
                <li class="category-item ${activeClass}" data-category="${escapeHtml(categoryId)}">
                    <div class="category-row">
                        <span class="category-icon">${iconValue}</span>
                        <span class="category-name">${escapeHtml(category.name || 'Danh mục')}</span>
                        <span class="category-count">(${getCategoryCount(categoryId)})</span>
                    </div>
                </li>
            `;
        }).join('');

        els.categoriesList.innerHTML = allItem + categoryItems;
    }

    function renderPagination(totalPages) {
        if (!els.pagination) {
            return;
        }

        if (totalPages <= 1) {
            els.pagination.innerHTML = '';
            return;
        }

        const pages = [];
        const startPage = Math.max(1, state.currentPage - 2);
        const endPage = Math.min(totalPages, state.currentPage + 2);

        pages.push(`<button class="pagination-btn" data-page="${state.currentPage - 1}" ${state.currentPage === 1 ? 'disabled' : ''}>‹ Trước</button>`);

        if (startPage > 1) {
            pages.push('<button class="pagination-btn" data-page="1">1</button>');
            if (startPage > 2) {
                pages.push('<span class="pagination-ellipsis">...</span>');
            }
        }

        for (let page = startPage; page <= endPage; page += 1) {
            pages.push(`<button class="pagination-btn ${page === state.currentPage ? 'active' : ''}" data-page="${page}">${page}</button>`);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pages.push('<span class="pagination-ellipsis">...</span>');
            }
            pages.push(`<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`);
        }

        pages.push(`<button class="pagination-btn" data-page="${state.currentPage + 1}" ${state.currentPage === totalPages ? 'disabled' : ''}>Tiếp ›</button>`);

        els.pagination.innerHTML = pages.join('');
    }

    function renderNews() {
        if (!els.grid) {
            return;
        }

        const filtered = getFilteredNews();
        const totalPages = Math.max(1, Math.ceil(filtered.length / state.itemsPerPage));
        state.currentPage = Math.min(state.currentPage, totalPages);

        if (filtered.length === 0) {
            els.grid.classList.remove('is-loading');
            els.grid.innerHTML = '<div class="no-results"><p>Không tìm thấy tin tức nào.</p></div>';
            renderPagination(0);
            return;
        }

        const start = (state.currentPage - 1) * state.itemsPerPage;
        const pageItems = filtered.slice(start, start + state.itemsPerPage);

        els.grid.innerHTML = pageItems.map(function (news) {
            const href = '/news/' + (news.slug || news._id || news.id || 'detail');
            const image = getNewsImage(news);
            const title = getNewsTitle(news);

            return `
                <a href="${href}" class="product-card-link">
                    <div class="news-card">
                        <div class="news-image">
                            <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" loading="lazy" onerror="this.src='/images/steam-background.png'">
                        </div>
                        <div class="news-info">
                            <h3 class="news-title">${escapeHtml(title)}</h3>
                        </div>
                    </div>
                </a>
            `;
        }).join('');

        els.grid.classList.remove('is-loading');
        renderPagination(totalPages);
    }

    function applyFilters(options) {
        const { rerenderCategories = false } = options || {};
        state.currentPage = 1;
        updateTitle();
        runGridTransition(function () {
            if (rerenderCategories) {
                renderCategories();
            }
            renderNews();
        });
    }

    function setupEventListeners() {
        if (els.categoriesList) {
            els.categoriesList.addEventListener('click', function (event) {
                const categoryItem = event.target.closest('.category-item');
                if (!categoryItem) {
                    return;
                }

                const nextCategory = categoryItem.getAttribute('data-category') || 'all';
                if (state.filters.category === nextCategory) {
                    return;
                }
                state.filters.category = nextCategory;
                applyFilters({ rerenderCategories: true });
            });
        }

        if (els.searchInput) {
            els.searchInput.addEventListener('input', function (event) {
                clearTimeout(state.searchDebounceTimer);
                const value = event.target.value;
                state.searchDebounceTimer = setTimeout(function () {
                    state.filters.search = value.trim();
                    updateSearchClearButton();
                    applyFilters();
                }, state.searchDebounceMs);
            });

            els.searchInput.addEventListener('keydown', function (event) {
                if (event.key !== 'Enter') {
                    return;
                }
                event.preventDefault();
                clearTimeout(state.searchDebounceTimer);
                state.filters.search = els.searchInput.value.trim();
                updateSearchClearButton();
                applyFilters();
            });
        }

        if (els.searchBtn) {
            els.searchBtn.addEventListener('click', function () {
                clearTimeout(state.searchDebounceTimer);
                state.filters.search = els.searchInput ? els.searchInput.value.trim() : '';
                updateSearchClearButton();
                applyFilters();
            });
        }

        if (els.clearSearchBtn) {
            els.clearSearchBtn.addEventListener('click', function () {
                clearTimeout(state.searchDebounceTimer);
                if (els.searchInput) {
                    els.searchInput.value = '';
                }
                state.filters.search = '';
                updateSearchClearButton();
                applyFilters();
            });
        }

        if (els.dateInputs && els.dateInputs.length > 0) {
            els.dateInputs.forEach(function (input) {
                input.addEventListener('change', function (event) {
                    state.filters.dateRange = event.target.value || 'all';
                    applyFilters();
                });
            });
        } else if (els.dateFilter) {
            els.dateFilter.addEventListener('change', function (event) {
                state.filters.dateRange = event.target.value || 'all';
                applyFilters();
            });
        }

        if (els.sortSelect) {
            els.sortSelect.addEventListener('change', function (event) {
                state.filters.sort = event.target.value || 'default';
                applyFilters();
            });
        }

        if (els.resetBtn) {
            els.resetBtn.addEventListener('click', function () {
                state.filters = {
                    category: 'all',
                    dateRange: 'all',
                    search: '',
                    sort: 'default'
                };

                if (els.searchInput) {
                    els.searchInput.value = '';
                }
                if (els.dateInputs && els.dateInputs.length > 0) {
                    const allDateRange = document.querySelector('input[name="newsDateRange"][value="all"]');
                    if (allDateRange) {
                        allDateRange.checked = true;
                    }
                } else if (els.dateFilter) {
                    els.dateFilter.value = 'all';
                }
                if (els.sortSelect) {
                    els.sortSelect.value = 'default';
                }

                updateSearchClearButton();
                applyFilters({ rerenderCategories: true });
            });
        }

        if (els.pagination) {
            els.pagination.addEventListener('click', function (event) {
                const button = event.target.closest('.pagination-btn');
                if (!button || button.disabled) {
                    return;
                }

                const nextPage = Number(button.getAttribute('data-page'));
                if (!Number.isFinite(nextPage) || nextPage < 1 || nextPage === state.currentPage) {
                    return;
                }

                state.currentPage = nextPage;
                runGridTransition(function () {
                    renderNews();
                });
            });
        }
    }

    async function init() {
        cacheElements();
        setupEventListeners();
        updateSearchClearButton();

        if (!els.grid) {
            return;
        }

        setBootstrapping(true);
        renderNewsSkeleton();

        try {
            const [categoriesRes, newsRes] = await Promise.all([
                fetchJson('/api/news/categories'),
                fetchJson('/api/news')
            ]);

            state.allCategories = Array.isArray(categoriesRes) ? categoriesRes : [];
            state.allNews = Array.isArray(newsRes) ? newsRes : (newsRes.news || []);

            renderCategories();
            updateTitle();
            renderNews();
        } catch (error) {
            console.error('Error loading news page:', error);
            els.grid.classList.remove('is-loading');
            els.grid.innerHTML = '<div class="no-results"><p>Không thể tải dữ liệu tin tức.</p></div>';
            if (els.pagination) {
                els.pagination.innerHTML = '';
            }
        } finally {
            state.isBootstrapping = false;
            setBootstrapping(false);
            setGridFetchingState(false);
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();
