// About Page JavaScript

// Hero Slider functionality
let currentSlide = 0;
let slideInterval;
let slides = [];

// Normalize slide object to unified shape
function buildImageUrl(raw, item){
    try {
        if (!raw) return '';
        const str = String(raw).trim();
        if (str.startsWith('http') || str.startsWith('data:')) return str;
        // Detect mime if available
        const mime = item && (item.mime || item.mimeType || item.contentType);
        const safeMime = (mime && /^image\//i.test(mime)) ? mime : 'image/jpeg';
        return `data:${safeMime};base64,${str}`;
    } catch(_) { return ''; }
}

function normalizeSlide(item, idx){
    try {
        const rawImage = item.image || item.imageUrl || item.url || item.src || item.imageBase64 || item.base64 || item.data || '';
        const image = buildImageUrl(rawImage, item);
        const title = item.title || item.heading || 'Smart Steam';
        const subtitle = item.subtitle || item.subTitle || item.description || 'Nền tảng giáo dục STEAM hàng đầu';
        const buttonText = item.buttonText || item.ctaText || '';
        const buttonLink = item.buttonLink || item.ctaLink || '/products';
        const button2Text = item.button2Text || '';
        const button2Link = item.button2Link || '/tutorials';
        return { image, title, subtitle, buttonText, buttonLink, button2Text, button2Link };
    } catch(_) { return {}; }
}

function getFallbackSlides(){
    const fallbackImage = 'https://smartsteam.vn/images/pasted-1757553903533.webp';
    return [
        { image: fallbackImage, title: 'Smart Steam', subtitle: 'Nền tảng giáo dục STEAM hàng đầu', buttonText: 'Khám phá', buttonLink: '/products' },
        { image: fallbackImage, title: 'Học STEAM dễ dàng', subtitle: 'Khóa học, sản phẩm và cộng đồng', buttonText: 'Xem khóa học', buttonLink: '/tutorials' }
    ];
}

// Load hero slides from API
async function loadHeroSlides() {
    try {
        console.log('🎠 Loading hero slides from API...');
        const response = await fetch('/api/hero-slides');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
    const raw = await response.json();
        console.log('✅ Hero slides loaded:', raw);
        const arr = Array.isArray(raw) ? raw : (raw.slides || raw.data || []);
        let normalized = arr.map(normalizeSlide).filter(s => s && s.image);
        if (!normalized || normalized.length === 0) {
            console.warn('⚠️ No valid slides from API, using fallback');
            normalized = getFallbackSlides();
        }
        slides = normalized;
        renderSlides();
        initSlider();
        
        // Hide loading indicator
        const loading = document.getElementById('hero-slider-loading');
        if (loading) {
            loading.style.display = 'none';
        }
        
    } catch (error) {
        console.error('❌ Error loading hero slides:', error);
        
        // Fallback to static slides to ensure hero visible
        slides = getFallbackSlides();
        renderSlides();
        initSlider();
        const loading = document.getElementById('hero-slider-loading');
        if (loading) loading.style.display = 'none';
    }
}

// Render slides from API data
function renderSlides() {
    const container = document.getElementById('hero-slides-container');
    const dotsContainer = document.getElementById('slider-dots-container');
    
    if (!container || !dotsContainer) return;
    
    if (slides.length === 0) {
        container.innerHTML = '<div class="hero-slide" style="background: linear-gradient(45deg, #1e40af, #3b82f6); display: flex; align-items: center; justify-content: center;"><div class="hero-content"><h1 class="hero-title">Smart Steam</h1><p class="hero-subtitle">Nền tảng giáo dục STEAM hàng đầu</p></div></div>';
        dotsContainer.innerHTML = '';
        return;
    }
    
    // Render slides
    container.innerHTML = slides.map((slide, index) => {
        const img = slide.image || slide.imageUrl || slide.url || slide.src || '';
        const safeImg = String(img).replace(/"/g, '&quot;');
        const alt = (slide.title || 'Smart Steam').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `
        <div class="hero-slide ${index === 0 ? 'active' : ''}">
            <img class="hero-img" src="${safeImg}" alt="${alt}">
            <div class="hero-content">
                <h1 class="hero-title">${slide.title || 'Smart Steam'}</h1>
                <p class="hero-subtitle">${slide.subtitle || 'Nền tảng giáo dục STEAM hàng đầu'}</p>
                <div class="hero-cta">
                    ${slide.buttonText ? `<a href="${slide.buttonLink || '/products'}" class="btn btn-primary">${slide.buttonText}</a>` : ''}
                    ${slide.button2Text ? `<a href="${slide.button2Link || '/tutorials'}" class="btn btn-secondary">${slide.button2Text}</a>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');
    
    // Render dots
    dotsContainer.innerHTML = slides.map((_, index) => `
        <div class="slider-dot ${index === 0 ? 'active' : ''}" onclick="goToSlide(${index})"></div>
    `).join('');
}

// Initialize slider
function initSlider() {
    const slideElements = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.slider-dot');
    
    if (slideElements.length === 0) return;
    
    // Start automatic slider
    startSlider();
    
    // Pause slider on hover
    const heroSlider = document.getElementById('hero-slider');
    if (heroSlider) {
        heroSlider.addEventListener('mouseenter', stopSlider);
        heroSlider.addEventListener('mouseleave', startSlider);
    }
}

// Start automatic slider
function startSlider() {
    if (slideInterval) return;
    
    slideInterval = setInterval(() => {
        nextSlide();
    }, 5000); // Change slide every 5 seconds
}

// Stop automatic slider
function stopSlider() {
    if (slideInterval) {
        clearInterval(slideInterval);
        slideInterval = null;
    }
}

// Go to specific slide
function goToSlide(index) {
    const slideElements = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.slider-dot');
    
    if (index < 0 || index >= slideElements.length) return;
    
    // Remove active class from all slides and dots
    slideElements.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));
    
    // Add active class to current slide and dot
    if (slideElements[index]) slideElements[index].classList.add('active');
    if (dots[index]) dots[index].classList.add('active');
    
    currentSlide = index;
}

// Next slide
function nextSlide() {
    const slideElements = document.querySelectorAll('.hero-slide');
    const nextIndex = (currentSlide + 1) % slideElements.length;
    goToSlide(nextIndex);
}

// Previous slide
function previousSlide() {
    const slideElements = document.querySelectorAll('.hero-slide');
    const prevIndex = currentSlide === 0 ? slideElements.length - 1 : currentSlide - 1;
    goToSlide(prevIndex);
}

// Handle keyboard navigation
function handleKeyboard(e) {
    const slideElements = document.querySelectorAll('.hero-slide');
    if (slideElements.length <= 1) return;
    
    switch(e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            previousSlide();
            break;
        case 'ArrowRight':
            e.preventDefault();
            nextSlide();
            break;
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Load hero slides from API first
    loadHeroSlides();
    
    // Add keyboard navigation
    document.addEventListener('keydown', handleKeyboard);
});
