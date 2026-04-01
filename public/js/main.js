// Minimal main.js to avoid MIME/type errors and provide basic navbar toggle
(function(){
  var TOP_LEVEL_NAV_PATHS = ['/projects', '/news', '/products', '/tutorials', '/about', '/contact', '/resources', '/courses'];
  var productsFetchToken = 0;
  var tutorialsFetchToken = 0;
  var newsFetchToken = 0;

  function normalizePathname(pathname) {
    var raw = String(pathname || '/').split('?')[0].split('#')[0];
    var normalized = raw.replace(/\/+$/, '') || '/';
    var parts = normalized.split('/').filter(Boolean);

    if (normalized === '/index.html') return '/';
    if (normalized === '/' || normalized === '') return '/';

    if (parts.length > 0) {
      var top = '/' + parts[0].toLowerCase();
      if (TOP_LEVEL_NAV_PATHS.indexOf(top) !== -1) {
        return top;
      }

      // Product detail pages are served via '/:slug'
      if (parts.length === 1 && !normalized.includes('.')) {
        return '/products';
      }
    }

    return normalized.toLowerCase();
  }

  function setActiveNavLink() {
    try {
      var links = document.querySelectorAll('.nav-menu .nav-link');
      if (!links || links.length === 0) return;

      var currentPath = normalizePathname(window.location && window.location.pathname);
      links.forEach(function(link) {
        var href = link.getAttribute('href') || '';
        var linkPath = normalizePathname(href);
        link.classList.toggle('active', linkPath === currentPath);
      });
    } catch (_) {}
  }

  function shouldSkipNavigation(event, anchor) {
    try {
      if (!anchor) return false;
      if (event.defaultPrevented) return false;
      if (event.button !== 0) return false;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
      if ((anchor.getAttribute('target') || '').toLowerCase() === '_blank') return false;
      if (anchor.hasAttribute('download')) return false;

      var href = anchor.getAttribute('href') || '';
      if (!href || href.indexOf('javascript:') === 0 || href.indexOf('#') === 0) return false;

      var current = normalizePathname(window.location && window.location.pathname);
      var target = normalizePathname(new URL(href, window.location.origin).pathname);
      return current === target;
    } catch (_) {
      return false;
    }
  }

  function initNavbar() {
    var toggle = document.querySelector('.nav-toggle');
    var menu = document.querySelector('.nav-menu');
    if (toggle && menu) {
      toggle.addEventListener('click', function(){ menu.classList.toggle('active'); });
      menu.addEventListener('click', function(e){
        if (e.target && e.target.classList && e.target.classList.contains('nav-link')) {
          menu.classList.remove('active');
        }
      });
    }

    var navAnchors = document.querySelectorAll('.nav-menu .nav-link, .logo');
    if (navAnchors && navAnchors.length > 0) {
      navAnchors.forEach(function(anchor) {
        anchor.addEventListener('click', function(event) {
          if (!shouldSkipNavigation(event, anchor)) {
            return;
          }
          event.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      });
    }

    // Render auth buttons or greeting
    renderAuthButtons();
    setActiveNavLink();
  }

  function priceHtml(value){
    try {
      var num = Number(value);
      if (!isFinite(num) || num <= 0) return 'Liên hệ';
      return new Intl.NumberFormat('vi-VN', { style:'currency', currency:'VND' }).format(num);
    }
    catch(_) { return 'Liên hệ'; }
  }

  function normalizeFilterKey(categoryId){
    if (categoryId === undefined || categoryId === null || categoryId === '' || categoryId === 'all') return 'all';
    return String(categoryId);
  }

  function beginGridFetch(grid){
    if (!grid) return;
    if (!grid.dataset.lockedHeight) {
      grid.dataset.lockedHeight = String(grid.offsetHeight || 0);
      if (Number(grid.dataset.lockedHeight) > 0) {
        grid.style.minHeight = grid.dataset.lockedHeight + 'px';
      }
    }
    grid.classList.add('is-fetching');
  }

  function endGridFetch(grid){
    if (!grid) return;
    grid.classList.remove('is-fetching');
    grid.dataset.lockedHeight = '';
    grid.style.minHeight = '';
  }
  function renderFeaturedProducts(list){
    var grid = document.getElementById('featured-products');
    if (!grid) {
      return;
    }
    if (!list || list.length === 0) { 
      grid.innerHTML = '<p>Chưa có sản phẩm.</p>'; 
      return; 
    }
    grid.innerHTML = list.map(function(p, index){
      try {
        var href = '/' + (p.slug || p._id || p.id);
        var img = (p.images && p.images[0]) || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjhGQUZDIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTRBM0I4IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCI+UHJvZHVjdDwvdGV4dD4KPC9zdmc+';
        return (
          '<a href="'+href+'" class="product-card-link">\
            <div class="product-card visible">\
              <div class="product-image-container">\
                <div class="product-image">\
                  <img src="'+img+'" alt="'+(p.name||'Product')+'" onerror="this.src=\'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjhGQUZDIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTRBM0I4IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCI+UHJvZHVjdDwvdGV4dD4KPC9zdmc+\'">\
                </div>\
              </div>\
              <div class="product-info">\
                <h3 class="product-name">'+(p.name||'Sản phẩm')+'</h3>\
                <div class="product-meta">\
                  <div class="product-price">'+priceHtml(p.price)+'</div>\
                  <span class="product-cart-icon" title="Thêm vào giỏ hàng" aria-hidden="true">\
                    <i class="fa-solid fa-cart-plus"></i>\
                  </span>\
                </div>\
              </div>\
            </div>\
          </a>'
        );
      } catch (error) {
        console.error('❌ Error rendering product at index', index, ':', error, p);
        return '<div class="error">Lỗi hiển thị sản phẩm</div>';
      }
    }).join('');
  }

  async function loadFeaturedProducts(categoryId = 'all') {
    var grid = document.getElementById('featured-products');
    if (!grid) return;

    var key = normalizeFilterKey(categoryId);
    var requestToken = ++productsFetchToken;
    window.__featuredProductsByCategory = window.__featuredProductsByCategory || {};

    if (window.__featuredProductsByCategory[key]) {
      endGridFetch(grid);
      renderFeaturedProducts(window.__featuredProductsByCategory[key]);
      return;
    }

    var hasExistingCards = grid.querySelector('.product-card') !== null;
    if (hasExistingCards) {
      beginGridFetch(grid);
    } else {
      grid.innerHTML = '<div class="loading-products"><div class="loading-spinner"></div><p>Đang tải sản phẩm...</p></div>';
    }

    try {
      var url = '/api/products?limit=8';
      if (key !== 'all') {
        url += '&categoryId=' + encodeURIComponent(key);
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (requestToken !== productsFetchToken) return;
      const products = Array.isArray(data) ? data : (data.products || []);

      window.__featuredProductsByCategory[key] = products;
      if (key === 'all') {
        window.__featuredProducts = products;
      }

      renderFeaturedProducts(products);
    } catch (e) {
      if (!hasExistingCards) {
        grid.innerHTML = '<p>Không thể tải sản phẩm.</p>';
      }
      console.error('❌ loadFeaturedProducts error', e);
    } finally {
      if (requestToken === productsFetchToken) {
        endGridFetch(grid);
      }
    }
  }


  async function loadFeaturedProjects() {
    try {
      var grid = document.getElementById('featured-projects');
      if (!grid) return;
      const res = await fetch('/api/projects/featured?limit=8');
      if (!res.ok) throw new Error('HTTP '+res.status);
      const items = await res.json();
      window.__featuredProjects = Array.isArray(items) ? items : (items.projects || []);
      if (!Array.isArray(window.__featuredProjects) || window.__featuredProjects.length === 0) { grid.innerHTML = '<p>Chưa có dự án.</p>'; return; }
      renderProjects(window.__featuredProjects);
            } catch (e) {
      var grid = document.getElementById('featured-projects');
      if (grid) grid.innerHTML = '<p>Không thể tải dự án.</p>';
      console.error('loadFeaturedProjects error', e);
    }
  }

  function renderProjects(list){
    var grid = document.getElementById('featured-projects');
    if (!grid) return;
    grid.innerHTML = list.map(function(p, idx){
      var href = '/projects/' + (p.slug || p._id || p.id || 'detail');
      var img = p.featuredImage || p.coverImage || (p.images && p.images[0]) || extractFirstImageFromHtml(p.description) || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjhGQUZDIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTRBM0I4IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCI+UHJvamVjdDwvdGV4dD4KPC9zdmc+';
      return (
        '<a href="'+href+'" class="product-card-link">\
          <div class="project-card visible">\
            <div class="project-image">\
              <img src="'+img+'" alt="'+(p.name||'Project')+'">\
            </div>\
            <div class="project-info">\
              <h3 class="project-title">'+(p.title||p.name||'Dự án')+'</h3>\
            </div>\
          </div>\
        </a>'
      );
        }).join('');
  }

  // Try to extract first <img src="..."> from a HTML string
  function extractFirstImageFromHtml(html){
    try {
      if (!html || typeof html !== 'string') return '';
      var match = html.match(/<img[^>]+src=["']([^"'>]+)["']/i);
      if (match && match[1]) return match[1];
      return '';
    } catch(_) { return ''; }
  }

  async function loadProjectCategories(){
    var tabs = document.getElementById('project-filter-tabs');
    if (!tabs) return;
    try {
      const res = await fetch('/api/project-categories');
      if (!res.ok) {
        if (res.status === 404) {
          try { (document.querySelector('.project-filters')||{}).style.display = 'none'; } catch(_) {}
          return; // No categories for projects; silently skip
        }
        throw new Error('HTTP '+res.status);
      }
      const categories = await res.json();
      var html = tabs.innerHTML;
      const items = Array.isArray(categories) ? categories.slice(0, 12) : [];
      html += items.map(function(c){
        var id = c._id || c.id || c.slug || String(c.name||'');
        var icon = (c.icon && (c.icon.startsWith('http') || c.icon.startsWith('data:'))) ? ('<img src="'+c.icon+'" alt="" style="width:18px;height:18px;object-fit:contain;">') : (c.icon || '🚀');
        return '<button class="filter-tab" data-category="'+id+'"><span class="filter-icon">'+icon+'</span>'+(c.name||'Danh mục')+'</button>';
        }).join('');
      tabs.innerHTML = html;

      tabs.addEventListener('click', function(e){
        var btn = e.target.closest('.filter-tab');
        if (!btn) return;
        var cat = btn.getAttribute('data-category');
        [].slice.call(tabs.querySelectorAll('.filter-tab')).forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
        if (!cat || cat === 'all') { renderProjects(window.__featuredProjects || []); return; }
        var filtered = (window.__featuredProjects || []).filter(function(p){
          var cid = String(p.categoryId || (p.category && (p.category._id || p.category.id)) || p.category || '');
          return cid === String(cat);
        });
        renderProjects(filtered);
      });
    } catch (e) { /* silently ignore to avoid console noise if not supported */ }
  }

  async function loadFeaturedTutorials(categoryId = 'all') {
    var grid = document.getElementById('featured-tutorials');
    if (!grid) return;

    var key = normalizeFilterKey(categoryId);
    var requestToken = ++tutorialsFetchToken;
    window.__featuredTutorialsByCategory = window.__featuredTutorialsByCategory || {};

    if (window.__featuredTutorialsByCategory[key]) {
      endGridFetch(grid);
      renderTutorials(window.__featuredTutorialsByCategory[key]);
      return;
    }

    var hasExistingCards = grid.querySelector('.tutorial-card') !== null;
    if (hasExistingCards) {
      beginGridFetch(grid);
    } else {
      grid.innerHTML = '<div class="loading-products"><div class="loading-spinner"></div><p>Đang tải bài giảng...</p></div>';
    }

    try {
      var url = '/api/tutorials?limit=8';
      if (key !== 'all') {
        url += '&categoryId=' + encodeURIComponent(key);
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const items = await res.json();
      if (requestToken !== tutorialsFetchToken) return;
      const tutorials = Array.isArray(items) ? items : (items.tutorials || []);

      window.__featuredTutorialsByCategory[key] = tutorials;
      if (key === 'all') {
        window.__featuredTutorials = tutorials;
      }
      renderTutorials(tutorials);
    } catch (e) {
      if (!hasExistingCards) {
        grid.innerHTML = '<p>Không thể tải bài giảng.</p>';
      }
      console.error('loadFeaturedTutorials error', e);
    } finally {
      if (requestToken === tutorialsFetchToken) {
        endGridFetch(grid);
      }
    }
  }


  function renderTutorials(list){
    var grid = document.getElementById('featured-tutorials');
    if (!grid) return;
    if (!list || list.length === 0) { grid.innerHTML = '<p>Không có bài giảng.</p>'; return; }
    grid.innerHTML = list.map(function(t){
      var href = '/tutorials/' + (t.slug || t._id || t.id || 'detail');
      var img = t.featuredImage || t.featureImage || t.coverImage || t.thumbnail || t.image || (t.images && (t.images[0] || t.images.url)) || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjhGQUZDIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTRBM0I4IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCI+VHV0b3JpYWw8L3RleHQ+Cjwvc3ZnPg==';
      return (
        '<a href="'+href+'" class="product-card-link">\
          <div class="tutorial-card visible">\
            <div class="tutorial-image">\
              <img src="'+img+'" alt="'+(t.title||'Tutorial')+'">\
            </div>\
            <div class="tutorial-info">\
              <h3 class="tutorial-title">'+(t.title||'Bài giảng')+'</h3>\
            </div>\
          </div>\
        </a>'
      );
    }).join('');
  }

  async function loadTutorialCategories(){
    var tabs = document.getElementById('tutorial-filter-tabs');
    if (!tabs) return;
    try {
      const res = await fetch('/api/tutorial-categories');
      if (!res.ok) throw new Error('HTTP '+res.status);
      const categories = await res.json();
      var html = tabs.innerHTML; // keep 'Tất cả'
      const items = Array.isArray(categories) ? categories.slice(0, 12) : [];
      html += items.map(function(c){
        var id = c._id || c.id || c.slug || String(c.name||'');
        var icon = (c.icon && (c.icon.startsWith('http') || c.icon.startsWith('data:'))) ? ('<img src="'+c.icon+'" alt="" style="width:18px;height:18px;object-fit:contain;">') : (c.icon || '🏷️');
        return '<button class="filter-tab" data-category="'+id+'"><span class="filter-icon">'+icon+'</span>'+(c.name||'Danh mục')+'</button>';
      }).join('');
      tabs.innerHTML = html;

      // Use event delegation to avoid duplicate listeners
      if (!tabs.dataset.listenerAdded) {
        tabs.addEventListener('click', function(e){
          var btn = e.target.closest('.filter-tab');
          if (!btn) return;
          var cat = btn.getAttribute('data-category');
          [].slice.call(tabs.querySelectorAll('.filter-tab')).forEach(function(b){ b.classList.remove('active'); });
          btn.classList.add('active');
          // Load tutorials with category filter (server-side)
          loadFeaturedTutorials(cat);
        });
        tabs.dataset.listenerAdded = 'true';
      }
    } catch (e) { console.error('loadTutorialCategories error', e); }
  }

  function renderAuthButtons() {
    try {
      var host = document.getElementById('auth-buttons');
      var mobileHost = document.getElementById('mobile-auth-buttons');
      var userStr = localStorage.getItem('user');

      if (userStr) {
        var user = {};
        try { user = JSON.parse(userStr) || {}; } catch (_) {}

        var name = user.name || (user.firstName && user.lastName ? user.firstName + ' ' + user.lastName : '') || user.fullName || user.username || 'bạn';
        var avatarSrc = user.avatar || (user.profile && user.profile.avatar) || '';
        var avatarHtml = avatarSrc
          ? '<img src="' + escapeHtml(avatarSrc) + '" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
          : '👤';

        if (host) {
          host.innerHTML = '<div class="user-menu">\
                              <button class="user-avatar" id="userAvatar">' + avatarHtml + '</button>\
                              <div class="user-dropdown" id="userDropdown">\
                                <div class="dropdown-header">' + escapeHtml(name) + '</div>\
                                <a href="/profile" class="dropdown-item">Hồ sơ</a>\
                                <a href="/orders" class="dropdown-item">Đơn hàng</a>\
                                <button class="dropdown-item logout-btn" id="logoutBtn">Đăng xuất</button>\
                              </div>\
                            </div>';
        }

        if (mobileHost) {
          mobileHost.innerHTML = '<div class="mobile-auth-shell">\
                                    <div class="mobile-user-shell">\
                                      <a href="/profile" class="mobile-user-link">\
                                        <span class="mobile-user-avatar">' + avatarHtml + '</span>\
                                        <span>' + escapeHtml(name) + '</span>\
                                      </a>\
                                      <button class="mobile-logout-btn" onclick="logout()">Đăng xuất</button>\
                                    </div>\
                                  </div>';
        }

        var avatar = document.getElementById('userAvatar');
        var dropdown = document.getElementById('userDropdown');
        var logoutBtn = document.getElementById('logoutBtn');

        if (avatar && dropdown) {
          var userMenu = avatar.closest('.user-menu');
          avatar.addEventListener('click', function(e) {
            e.stopPropagation();
            userMenu.classList.toggle('active');
          });

          document.addEventListener('click', function(e) {
            if (!e.target.closest('.user-menu')) {
              userMenu.classList.remove('active');
            }
          });
        }

        if (logoutBtn) {
          logoutBtn.addEventListener('click', function() {
            try { logout(); } catch (_) { localStorage.clear(); location.reload(); }
          });
        }
      } else {
        var loginRegisterHtml = '<a href="/login" class="auth-btn auth-btn-login">Đăng nhập</a>\
                                 <a href="/register" class="auth-btn auth-btn-register">Đăng ký</a>';

        if (host) {
          host.innerHTML = loginRegisterHtml;
        }

        if (mobileHost) {
          mobileHost.innerHTML = '<div class="mobile-auth-shell">\
                                    <div class="mobile-auth-links">\
                                      <a href="/login" class="mobile-auth-link login">Đăng nhập</a>\
                                      <a href="/register" class="mobile-auth-link register">Đăng ký</a>\
                                    </div>\
                                  </div>';
        }
      }
    } catch (_) {}
  }
  function escapeHtml(str){
    try { return String(str).replace(/[&<>"]+/g, function(s){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]); }); } catch(_) { return str; }
  }

  // Keep shared logout behavior if provided by auth.js; fallback to basic local cleanup.
  if (typeof window.logout !== 'function') {
    window.logout = function() {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch(_) {}
      window.location.href = '/';
    };
  }

  // Hydrate user/token from server session cookie, then rerender greeting
  async function hydrateAuthFromServer(){
    try {
      if (localStorage.getItem('user')) return;
      var authToken = '';
      try { authToken = localStorage.getItem('authToken') || ''; } catch(_) {}
      var headers = authToken ? { Authorization: 'Bearer ' + authToken } : {};
      const res = await fetch('/api/auth/me', { credentials: 'include', headers: headers });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.user) {
        try { localStorage.setItem('user', JSON.stringify(data.user)); } catch(_) {}
        if (data.token) { try { localStorage.setItem('authToken', data.token); } catch(_) {} }
        try { renderAuthButtons(); } catch(_) {}
      }
    } catch(_) {}
  }

  document.addEventListener('DOMContentLoaded', function(){
    try { initNavbar(); } catch(_) {}
    try { renderAuthButtons(); } catch(_) {}
    // Skip session hydrate on auth/about pages to avoid 404s where backend route may not exist
    try {
      var path = (window.location && window.location.pathname) || '';
      var isAuthPage = path.indexOf('login') !== -1 || path.indexOf('register') !== -1;
      var isAboutPage = path.indexOf('about') !== -1;
      if (!isAuthPage && !isAboutPage) { hydrateAuthFromServer(); }
    } catch(_) {}
    
    // Only load index-specific content on index page
    if (document.body.classList.contains('index-page')) {
      try { loadFeaturedProducts(); } catch(_) {}
      try { loadFeaturedProjects(); } catch(_) {}
      try { loadFeaturedTutorials(); } catch(_) {}
      try { loadTutorialCategories(); } catch(_) {}
      try { loadProductCategories(); } catch(_) {}
      try { loadFeaturedNews(); } catch(_) {}
      try { loadNewsCategories(); } catch(_) {}
    }
  });
  async function loadFeaturedNews(categoryId = 'all'){
    var grid = document.getElementById('featured-news');
    if (!grid) return;

    var key = normalizeFilterKey(categoryId);
    var requestToken = ++newsFetchToken;
    window.__featuredNewsByCategory = window.__featuredNewsByCategory || {};

    if (window.__featuredNewsByCategory[key]) {
      endGridFetch(grid);
      renderNews(window.__featuredNewsByCategory[key]);
      return;
    }

    var hasExistingCards = grid.querySelector('.news-card') !== null;
    if (hasExistingCards) {
      beginGridFetch(grid);
    } else {
      grid.innerHTML = '<div class="loading-products"><div class="loading-spinner"></div><p>Đang tải tin tức...</p></div>';
    }

    var url = '/api/news?limit=8';
    if (key !== 'all') {
      url += '&categoryId=' + encodeURIComponent(key);
    }
    
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP '+res.status);
      const items = await res.json();
      if (requestToken !== newsFetchToken) return;
      const newsItems = Array.isArray(items) ? items : (items.news || []);

      window.__featuredNewsByCategory[key] = newsItems;
      if (key === 'all') {
        window.__featuredNews = newsItems;
      }

      renderNews(newsItems);
    } catch (e) {
      if (!hasExistingCards) {
        grid.innerHTML = '<p>Không thể tải tin tức.</p>';
      }
      console.error('loadFeaturedNews error', e);
    } finally {
      if (requestToken === newsFetchToken) {
        endGridFetch(grid);
      }
    }
  }

  function renderNews(list){
    var grid = document.getElementById('featured-news');
    if (!grid) return;
    if (!list || list.length === 0) { grid.innerHTML = '<p>Không có tin tức.</p>'; return; }
    
    grid.innerHTML = (list||[]).map(function(n){
      var href = '/news/' + (n.slug || n._id || n.id || 'detail');
      var img = n.featuredImage || n.coverImage || n.image || (n.images && n.images[0]) || extractFirstImageFromHtml(n.content) || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIyMCIgdmlld0JveD0iMCAwIDQwMCAyMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjIwIiBmaWxsPSIjRjhGQUZDIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTRBM0I4IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCI+TmV3czwvdGV4dD4KPC9zdmc+';
      return '<a href="'+href+'" class="product-card-link">\
                <div class="news-card visible">\
                  <div class="news-image"><img src="'+img+'" alt="'+(n.title||'Tin tức')+'"></div>\
                  <div class="news-info"><h3 class="news-title">'+(n.title||'Tin tức')+'</h3></div>\
                </div>\
              </a>';
    }).join('');
  }

  async function loadNewsCategories(){
    var tabs = document.getElementById('news-filter-tabs');
    if (!tabs) return;
    try {
      const res = await fetch('/api/news/categories');
      if (!res.ok) throw new Error('HTTP '+res.status);
      const categories = await res.json();
      var html = tabs.innerHTML;
      const items = Array.isArray(categories) ? categories.slice(0, 12) : [];
      html += items.map(function(c){
        var id = c._id || c.id || c.slug || String(c.name||'');
        return '<button class="filter-tab" data-category="'+id+'"><span class="filter-icon">🗂️</span>'+(c.name||'Danh mục')+'</button>';
      }).join('');
      tabs.innerHTML = html;

      // Use event delegation to avoid duplicate listeners
      if (!tabs.dataset.listenerAdded) {
        tabs.addEventListener('click', function(e){
          var btn = e.target.closest('.filter-tab');
          if (!btn) return;
          var cat = btn.getAttribute('data-category');
          [].slice.call(tabs.querySelectorAll('.filter-tab')).forEach(function(b){ b.classList.remove('active'); });
          btn.classList.add('active');
          // Load news with category filter (server-side)
          loadFeaturedNews(cat);
        });
        tabs.dataset.listenerAdded = 'true';
      }
    } catch (e) { /* ignore */ }
  }
  
  // Load product categories into filter tabs on index page
  async function loadProductCategories(){
    var tabs = document.getElementById('product-filter-tabs');
    if (!tabs) {
      return;
    }
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('HTTP '+res.status);
      const categories = await res.json();
      
      
      // Keep existing first tab (Tất cả)
      var html = tabs.innerHTML; // includes the default button already in HTML
      const items = Array.isArray(categories) ? categories.slice(0, 10) : [];
      html += items.map(function(c){
        var id = c._id || c.id || c.slug || String(c.name||'');
        var icon = (c.icon && (c.icon.startsWith('http') || c.icon.startsWith('data:'))) ? ('<img src="'+c.icon+'" alt="" style="width:18px;height:18px;object-fit:contain;">') : (c.icon || '🏷️');
        return '<button class="filter-tab" data-category="'+id+'"><span class="filter-icon">'+icon+'</span>'+(c.name||'Danh mục')+'</button>';
      }).join('');
      tabs.innerHTML = html;

      // Click behavior: load products from API for selected category
      // Use event delegation to avoid duplicate listeners
      if (!tabs.dataset.listenerAdded) {
        tabs.addEventListener('click', function(e){
          var btn = e.target.closest('.filter-tab');
          if (!btn) {
            return;
          }
          var categoryId = btn.getAttribute('data-category');
          
          // Toggle active
          [].slice.call(tabs.querySelectorAll('.filter-tab')).forEach(function(b){ b.classList.remove('active'); });
          btn.classList.add('active');
          
        // Load products from API for selected category
        loadFeaturedProducts(categoryId);
        });
        tabs.dataset.listenerAdded = 'true';
      }
    } catch (e) {
      console.error('loadProductCategories error', e);
    }
  }

  // Expose renderAuthButtons to global scope
  window.renderAuthButtons = renderAuthButtons;

})();
