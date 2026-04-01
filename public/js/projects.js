(function () {
    const state = {
        allProjects: [],
        allCategories: [],
        currentPage: 1,
        itemsPerPage: 12,
        searchDebounceMs: 50,
        searchDebounceTimer: null,
        isBootstrapping: true,
        gridTransitionToken: 0,
        filters: {
            category: 'all',
            difficulty: 'all',
            search: '',
            sort: 'default'
        }
    };

    const els = {};

    function cacheElements() {
        els.grid = document.getElementById('projectsGrid');
        els.pagination = document.getElementById('projectsPagination');
        els.categoriesList = document.getElementById('projectsCategoriesList');
        els.searchInput = document.getElementById('projectsSearch');
        els.searchBtn = document.getElementById('searchBtn');
        els.clearSearchBtn = document.getElementById('clearSearchBtn');
        els.difficultyFilter = document.getElementById('difficultyFilter');
        els.difficultyInputs = document.querySelectorAll('input[name="projectDifficulty"]');
        els.sortSelect = document.getElementById('projectsSortSelect');
        els.pageTitle = document.getElementById('projectsTitle');
        els.resetBtn = document.getElementById('resetFiltersBtn');
    }

    function setBootstrapping(isLoading) {
        if (!document.body) {
            return;
        }
        document.body.classList.toggle('projects-bootstrapping', Boolean(isLoading));
    }

    function setGridFetchingState(isFetching) {
        if (!els.grid) {
            return;
        }
        els.grid.classList.toggle('is-fetching', Boolean(isFetching));
    }

    function renderProjectsSkeleton(count) {
        if (!els.grid) {
            return;
        }

        const total = Number.isFinite(count) ? count : state.itemsPerPage;
        const skeletonCards = Array.from({ length: total }).map(function () {
            return `
                <div class="project-skeleton-card" aria-hidden="true">
                    <div class="project-skeleton-media"></div>
                    <div class="project-skeleton-content">
                        <div class="project-skeleton-line project-skeleton-title"></div>
                        <div class="project-skeleton-line project-skeleton-title short"></div>
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

    async function fetchProjectCategories() {
        try {
            const data = await fetchJson('/api/project-categories');
            return Array.isArray(data) ? data : [];
        } catch (_) {
            return [];
        }
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

    function getProjectCategoryId(project) {
        return String(
            project && (
                project.categoryId ||
                project.category ||
                (project.category && project.category._id) ||
                (project.category && project.category.id)
            ) || ''
        );
    }

    function getProjectDifficulty(project) {
        return normalizeText(project && (project.difficulty || project.level || 'beginner'));
    }

    function getProjectTitle(project) {
        return String((project && (project.title || project.name)) || 'Dự án').trim();
    }

    function extractFirstImageFromHtml(html) {
        if (!html || typeof html !== 'string') {
            return '';
        }

        const match = html.match(/<img[^>]+src=["']([^"'>]+)["']/i);
        return match && match[1] ? match[1] : '';
    }

    function getProjectImage(project) {
        return (
            project.featuredImage ||
            project.featureImage ||
            project.coverImage ||
            project.thumbnail ||
            project.image ||
            (Array.isArray(project.images) && project.images[0]) ||
            extractFirstImageFromHtml(project.description) ||
            extractFirstImageFromHtml(project.content) ||
            '/images/steam-background.png'
        );
    }

    function getCategoryCount(categoryId) {
        if (categoryId === 'all') {
            return state.allProjects.length;
        }
        return state.allProjects.filter(function (project) {
            return getProjectCategoryId(project) === String(categoryId);
        }).length;
    }

    function updateSearchClearButton() {
        if (!els.clearSearchBtn || !els.searchInput) {
            return;
        }
        const hasValue = els.searchInput.value.trim().length > 0;
        els.clearSearchBtn.classList.toggle('visible', hasValue);
    }

    function updateTitle() {
        if (!els.pageTitle) {
            return;
        }

        if (state.filters.category === 'all') {
            els.pageTitle.textContent = 'Tất cả dự án';
            return;
        }

        const activeCategory = state.allCategories.find(function (category) {
            return getCategoryId(category) === state.filters.category;
        });

        els.pageTitle.textContent = activeCategory && activeCategory.name
            ? activeCategory.name
            : 'Tất cả dự án';
    }

    function getFilteredProjects() {
        let result = state.allProjects.slice();

        if (state.filters.category !== 'all') {
            result = result.filter(function (project) {
                return getProjectCategoryId(project) === state.filters.category;
            });
        }

        if (state.filters.difficulty !== 'all') {
            result = result.filter(function (project) {
                return getProjectDifficulty(project) === state.filters.difficulty;
            });
        }

        if (state.filters.search) {
            const term = normalizeText(state.filters.search);
            result = result.filter(function (project) {
                const haystack = [
                    project.title,
                    project.name,
                    project.description,
                    project.content
                ].map(normalizeText).join(' ');
                return haystack.includes(term);
            });
        }

        switch (state.filters.sort) {
            case 'title-asc':
                result.sort(function (a, b) {
                    return getProjectTitle(a).localeCompare(getProjectTitle(b), 'vi');
                });
                break;
            case 'title-desc':
                result.sort(function (a, b) {
                    return getProjectTitle(b).localeCompare(getProjectTitle(a), 'vi');
                });
                break;
            case 'default':
            default:
                result.sort(function (a, b) {
                    return parseDate(b.createdAt || b.updatedAt || b.date) - parseDate(a.createdAt || a.updatedAt || a.date);
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
                    <span class="category-icon">📁</span>
                    <span class="category-name">Tất cả</span>
                    <span class="category-count">(${getCategoryCount('all')})</span>
                </div>
            </li>
        `;

        const categoryItems = state.allCategories.map(function (category) {
            const categoryId = getCategoryId(category);
            const activeClass = state.filters.category === categoryId ? 'active' : '';
            const iconValue = renderCategoryIcon(category.icon, '🧩');

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

    function renderProjects() {
        if (!els.grid) {
            return;
        }

        const filtered = getFilteredProjects();
        const totalPages = Math.max(1, Math.ceil(filtered.length / state.itemsPerPage));
        state.currentPage = Math.min(state.currentPage, totalPages);

        if (filtered.length === 0) {
            els.grid.classList.remove('is-loading');
            els.grid.innerHTML = '<div class="no-results"><p>Không tìm thấy dự án nào.</p></div>';
            renderPagination(0);
            return;
        }

        const start = (state.currentPage - 1) * state.itemsPerPage;
        const pageItems = filtered.slice(start, start + state.itemsPerPage);

        els.grid.innerHTML = pageItems.map(function (project) {
            const href = '/projects/' + (project.slug || project._id || project.id || 'detail');
            const image = getProjectImage(project);
            const title = getProjectTitle(project);

            return `
                <a href="${href}" class="project-card">
                    <div class="project-image">
                        <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" loading="lazy" onerror="this.src='/images/steam-background.png'">
                    </div>
                    <div class="project-content">
                        <h3 class="project-title">${escapeHtml(title)}</h3>
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
            renderProjects();
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

        if (els.difficultyInputs && els.difficultyInputs.length > 0) {
            els.difficultyInputs.forEach(function (input) {
                input.addEventListener('change', function (event) {
                    state.filters.difficulty = event.target.value || 'all';
                    applyFilters();
                });
            });
        } else if (els.difficultyFilter) {
            els.difficultyFilter.addEventListener('change', function (event) {
                state.filters.difficulty = event.target.value || 'all';
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
                    difficulty: 'all',
                    search: '',
                    sort: 'default'
                };

                if (els.searchInput) {
                    els.searchInput.value = '';
                }
                if (els.difficultyInputs && els.difficultyInputs.length > 0) {
                    const allDifficulty = document.querySelector('input[name="projectDifficulty"][value="all"]');
                    if (allDifficulty) {
                        allDifficulty.checked = true;
                    }
                } else if (els.difficultyFilter) {
                    els.difficultyFilter.value = 'all';
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
                    renderProjects();
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
        renderProjectsSkeleton();

        try {
            const [projectsRes, categoriesRes] = await Promise.all([
                fetchJson('/api/projects'),
                fetchProjectCategories()
            ]);

            state.allProjects = Array.isArray(projectsRes) ? projectsRes : (projectsRes.projects || []);
            state.allCategories = Array.isArray(categoriesRes) ? categoriesRes : [];

            renderCategories();
            updateTitle();
            renderProjects();
        } catch (error) {
            console.error('Error loading projects page:', error);
            els.grid.classList.remove('is-loading');
            els.grid.innerHTML = '<div class="no-results"><p>Không thể tải dữ liệu dự án.</p></div>';
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
