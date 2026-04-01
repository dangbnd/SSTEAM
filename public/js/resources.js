// Resources page functionality
document.addEventListener('DOMContentLoaded', function() {
    setupResourceTabs();
    setupNewsletterForm();
});

// Setup resource category tabs
function setupResourceTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const resourceCards = document.querySelectorAll('.resource-card');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const selectedCategory = this.dataset.category;
            
            // Update active tab
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Filter resources
            filterResources(selectedCategory);
        });
    });
}

// Filter resources based on category
function filterResources(category) {
    const resourceCards = document.querySelectorAll('.resource-card');
    let visibleCount = 0;

    resourceCards.forEach(card => {
        const cardCategory = card.dataset.category;
        
        if (category === 'all' || cardCategory === category) {
            card.style.display = 'block';
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            // Animate in
            setTimeout(() => {
                card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, visibleCount * 100);
            
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    // Show no results message if no resources match
    showNoResultsMessage(visibleCount === 0);
}

// Show no results message
function showNoResultsMessage(show) {
    let noResultsMessage = document.querySelector('.no-results-message');
    
    if (show) {
        if (!noResultsMessage) {
            noResultsMessage = document.createElement('div');
            noResultsMessage.className = 'no-results-message';
            noResultsMessage.innerHTML = `
                <div class="text-center" style="padding: 3rem; color: var(--text-secondary);">
                    <h3>🔍 Không tìm thấy tài nguyên</h3>
                    <p>Hiện tại chưa có tài nguyên nào trong danh mục này. Hãy thử chọn danh mục khác.</p>
                </div>
            `;
            document.querySelector('.resources-section .container').appendChild(noResultsMessage);
        }
    } else if (noResultsMessage) {
        noResultsMessage.remove();
    }
}

// Setup newsletter form
function setupNewsletterForm() {
    const newsletterForm = document.querySelector('.newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', handleNewsletterSubmit);
    }
}

// Handle newsletter form submission
async function handleNewsletterSubmit(event) {
    event.preventDefault();
    
    const emailInput = event.target.querySelector('input[type="email"]');
    const email = emailInput.value.trim();
    
    if (validateEmail(email)) {
        try {
            const response = await fetch('/api/newsletter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showNewsletterSuccess();
                event.target.reset();
            } else {
                showNewsletterError(result.error || 'Có lỗi xảy ra khi đăng ký');
            }
        } catch (error) {
            console.error('Error subscribing to newsletter:', error);
            showNewsletterError('Có lỗi xảy ra khi đăng ký');
        }
    } else {
        showNewsletterError('Email không hợp lệ');
    }
}

// Validate email
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Show newsletter success message
function showNewsletterSuccess() {
    const form = document.querySelector('.newsletter-form');
    const successMessage = document.createElement('div');
    successMessage.className = 'newsletter-success';
    successMessage.innerHTML = `
        <div style="
            background-color: var(--success-color);
            color: white;
            padding: 1rem;
            border-radius: var(--border-radius);
            margin-top: 1rem;
            text-align: center;
        ">
            <h3>✅ Đăng ký thành công!</h3>
            <p>Cảm ơn bạn đã đăng ký. Chúng tôi sẽ gửi thông báo khi có tài nguyên mới.</p>
        </div>
    `;
    
    form.appendChild(successMessage);
    
    // Remove success message after 5 seconds
    setTimeout(() => {
        successMessage.remove();
    }, 5000);
}

// Show newsletter error message
function showNewsletterError(message) {
    const form = document.querySelector('.newsletter-form');
    const errorMessage = document.createElement('div');
    errorMessage.className = 'newsletter-error';
    errorMessage.innerHTML = `
        <div style="
            background-color: var(--error-color);
            color: white;
            padding: 1rem;
            border-radius: var(--border-radius);
            margin-top: 1rem;
            text-align: center;
        ">
            <p>❌ ${message}</p>
        </div>
    `;
    
    form.appendChild(errorMessage);
    
    // Remove error message after 3 seconds
    setTimeout(() => {
        errorMessage.remove();
    }, 3000);
}

// Add hover effects for resource cards
document.addEventListener('DOMContentLoaded', function() {
    const resourceCards = document.querySelectorAll('.resource-card');
    
    resourceCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = 'var(--shadow-lg)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'var(--shadow-md)';
        });
    });
});

// Add additional CSS for resources page
const resourcesStyles = `
    .resource-categories {
        padding: 2rem 0;
        background-color: var(--bg-primary);
        border-bottom: 1px solid var(--border-color);
    }

    .categories-tabs {
        display: flex;
        justify-content: center;
        gap: 1rem;
        flex-wrap: wrap;
    }

    .tab-btn {
        padding: 12px 24px;
        border: 2px solid var(--border-color);
        background-color: var(--bg-primary);
        color: var(--text-secondary);
        border-radius: var(--border-radius);
        cursor: pointer;
        transition: var(--transition);
        font-weight: 500;
    }

    .tab-btn:hover {
        border-color: var(--primary-color);
        color: var(--primary-color);
    }

    .tab-btn.active {
        background-color: var(--primary-color);
        border-color: var(--primary-color);
        color: white;
    }

    .resources-section {
        padding: 4rem 0;
        background-color: var(--bg-secondary);
    }

    .resources-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: 2rem;
    }

    .resource-card {
        background-color: var(--bg-primary);
        padding: 2rem;
        border-radius: var(--border-radius);
        box-shadow: var(--shadow-md);
        transition: var(--transition);
        border: 1px solid var(--border-color);
        text-align: center;
    }

    .resource-card:hover {
        transform: translateY(-5px);
        box-shadow: var(--shadow-lg);
    }

    .resource-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
    }

    .resource-card h3 {
        color: var(--text-primary);
        margin-bottom: 1rem;
        font-size: 1.25rem;
    }

    .resource-card p {
        color: var(--text-secondary);
        margin-bottom: 1.5rem;
        line-height: 1.6;
    }

    .resource-meta {
        display: flex;
        justify-content: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
    }

    .resource-meta span {
        background-color: var(--bg-accent);
        color: var(--primary-color);
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.875rem;
        font-weight: 500;
    }

    .learning-paths {
        padding: 5rem 0;
        background-color: var(--bg-primary);
    }

    .paths-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 2rem;
    }

    .path-card {
        background-color: var(--bg-secondary);
        border-radius: var(--border-radius);
        overflow: hidden;
        box-shadow: var(--shadow-md);
        transition: var(--transition);
        border: 1px solid var(--border-color);
    }

    .path-card:hover {
        transform: translateY(-5px);
        box-shadow: var(--shadow-lg);
    }

    .path-header {
        background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
        color: white;
        padding: 2rem;
        text-align: center;
    }

    .path-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
    }

    .path-header h3 {
        margin: 0;
        color: white;
    }

    .path-content {
        padding: 2rem;
    }

    .path-content ul {
        list-style: none;
        padding: 0;
        margin-bottom: 2rem;
    }

    .path-content li {
        padding: 0.5rem 0;
        color: var(--text-secondary);
        border-bottom: 1px solid var(--border-color);
        position: relative;
        padding-left: 1.5rem;
    }

    .path-content li:before {
        content: '✓';
        position: absolute;
        left: 0;
        color: var(--success-color);
        font-weight: bold;
    }

    .path-content li:last-child {
        border-bottom: none;
    }

    .newsletter-section {
        padding: 4rem 0;
        background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
        color: white;
        text-align: center;
    }

    .newsletter-content h2 {
        font-size: 2.5rem;
        margin-bottom: 1rem;
        color: white;
    }

    .newsletter-content p {
        font-size: 1.25rem;
        margin-bottom: 2rem;
        opacity: 0.9;
    }

    .newsletter-form {
        display: flex;
        gap: 1rem;
        justify-content: center;
        max-width: 500px;
        margin: 0 auto;
        flex-wrap: wrap;
    }

    .newsletter-form input {
        flex: 1;
        min-width: 250px;
        padding: 12px 16px;
        border: none;
        border-radius: var(--border-radius);
        font-size: 1rem;
    }

    .newsletter-form input:focus {
        outline: none;
        box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
    }

    @media (max-width: 768px) {
        .categories-tabs {
            flex-direction: column;
            align-items: center;
        }

        .tab-btn {
            width: 200px;
        }

        .resources-grid {
            grid-template-columns: 1fr;
        }

        .paths-grid {
            grid-template-columns: 1fr;
        }

        .newsletter-form {
            flex-direction: column;
            align-items: center;
        }

        .newsletter-form input {
            min-width: auto;
            width: 100%;
            max-width: 300px;
        }

        .newsletter-content h2 {
            font-size: 2rem;
        }
    }
`;

// Inject resources styles
const resourcesStyleSheet = document.createElement('style');
resourcesStyleSheet.textContent = resourcesStyles;
document.head.appendChild(resourcesStyleSheet); 