// Index Page Animations - Desktop Only
document.addEventListener('DOMContentLoaded', function() {
    // Only run animations on desktop
    if (window.innerWidth <= 768) {
        return;
    }

    // Intersection Observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    // Observe sections for scroll animations
    const sections = document.querySelectorAll('.products, .tutorials, .projects, .news');
    sections.forEach(section => {
        observer.observe(section);
    });

    // Observe section titles
    const sectionTitles = document.querySelectorAll('.section-title');
    sectionTitles.forEach(title => {
        observer.observe(title);
    });

    // Observe section subtitles
    const sectionSubtitles = document.querySelectorAll('.section-subtitle');
    sectionSubtitles.forEach(subtitle => {
        observer.observe(subtitle);
    });

    // Observe cards when they're dynamically loaded
    const observeCards = () => {
        const cards = document.querySelectorAll('.product-card, .tutorial-card, .project-card, .news-card');
        cards.forEach(card => {
            observer.observe(card);
        });
    };

    // Observe buttons
    const buttons = document.querySelectorAll('.btn-red, .hero-btn-primary, .hero-btn-secondary');
    buttons.forEach(button => {
        observer.observe(button);
    });

    // Observe filter tabs
    const filterTabs = document.querySelectorAll('.filter-tabs');
    filterTabs.forEach(tabs => {
        observer.observe(tabs);
    });

    // Observe stats
    const stats = document.querySelectorAll('.stat-number');
    stats.forEach(stat => {
        observer.observe(stat);
    });

    // Initial observation of existing elements
    observeCards();

    // Re-observe cards after dynamic content loads
    setTimeout(observeCards, 1000);
    setTimeout(observeCards, 2000);
    setTimeout(observeCards, 3000);

    // Add hover effects to floating cards
    const floatingCards = document.querySelectorAll('.floating-card');
    floatingCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
            this.style.boxShadow = '0 12px 28px rgba(2, 6, 23, 0.15)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = '';
            this.style.boxShadow = '';
        });
    });

    // Add hover effects to buttons
    const allButtons = document.querySelectorAll('.btn-red, .hero-btn-primary, .hero-btn-secondary');
    allButtons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px) scale(1.05)';
            this.style.boxShadow = '0 8px 25px rgba(239, 68, 68, 0.3)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = '';
            this.style.boxShadow = '';
        });
    });

    console.log('🎬 Index animations initialized for desktop');
});
