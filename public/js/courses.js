// Load all courses for courses page
document.addEventListener('DOMContentLoaded', function() {
    loadAllCourses();
    setupFilters();
});

// Load all courses from API
async function loadAllCourses() {
    try {
        const response = await fetch('/api/courses');
        const courses = await response.json();
        displayAllCourses(courses);
    } catch (error) {
        console.error('Error loading courses:', error);
        displayAllCourses([]);
    }
}

// Display all courses in the grid
function displayAllCourses(courses) {
    const coursesGrid = document.getElementById('allCoursesGrid');
    if (!coursesGrid) return;

    if (courses.length === 0) {
        coursesGrid.innerHTML = '<p class="text-center">Không có khóa học nào hiện tại.</p>';
        return;
    }

    const coursesHTML = courses.map(course => `
        <div class="course-card" data-category="${course.category}" data-level="${course.level}">
            <div class="course-image">
                ${getCategoryIcon(course.category)}
            </div>
            <div class="course-content">
                <span class="course-category">${course.category}</span>
                <h3 class="course-title">${course.title}</h3>
                <div class="course-meta">
                    <span>📚 ${course.level}</span>
                    <span>⏱️ ${course.duration}</span>
                </div>
                <p class="course-description">${course.description}</p>
                <div class="course-actions">
                    <a href="/contact" class="btn btn-primary">Đăng ký ngay</a>
                    <a href="#" class="btn btn-secondary course-details-btn" data-course-id="${course._id || course.id || ''}">Chi tiết</a>
                </div>
            </div>
        </div>
    `).join('');

    coursesGrid.innerHTML = coursesHTML;
}

// Setup filter functionality
function setupFilters() {
    const searchInput = document.getElementById('courseSearch');
    const categoryFilter = document.getElementById('categoryFilter');
    const levelFilter = document.getElementById('levelFilter');

    if (searchInput) {
        searchInput.addEventListener('input', filterCourses);
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterCourses);
    }

    if (levelFilter) {
        levelFilter.addEventListener('change', filterCourses);
    }
}

// Filter courses based on search and filters
function filterCourses() {
    const searchTerm = document.getElementById('courseSearch')?.value.toLowerCase() || '';
    const selectedCategory = document.getElementById('categoryFilter')?.value || '';
    const selectedLevel = document.getElementById('levelFilter')?.value || '';

    const courseCards = document.querySelectorAll('.course-card');
    let visibleCount = 0;

    courseCards.forEach(card => {
        const title = card.querySelector('.course-title').textContent.toLowerCase();
        const description = card.querySelector('.course-description').textContent.toLowerCase();
        const category = card.dataset.category;
        const level = card.dataset.level;

        const matchesSearch = title.includes(searchTerm) || description.includes(searchTerm);
        const matchesCategory = !selectedCategory || category === selectedCategory;
        const matchesLevel = !selectedLevel || level === selectedLevel;

        const shouldShow = matchesSearch && matchesCategory && matchesLevel;
        
        card.style.display = shouldShow ? 'block' : 'none';
        if (shouldShow) visibleCount++;
    });

    // Show no results message if no courses match
    const noResultsMessage = document.querySelector('.no-results-message');
    if (visibleCount === 0) {
        if (!noResultsMessage) {
            const message = document.createElement('div');
            message.className = 'no-results-message';
            message.innerHTML = `
                <div class="text-center" style="padding: 2rem; color: var(--text-secondary);">
                    <h3>Không tìm thấy khóa học phù hợp</h3>
                    <p>Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
                </div>
            `;
            document.querySelector('.courses-section .container').appendChild(message);
        }
    } else if (noResultsMessage) {
        noResultsMessage.remove();
    }
}

// Course details modal functionality
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('course-details-btn')) {
        e.preventDefault();
        const courseId = e.target.dataset.courseId;
        showCourseDetails(courseId);
    }
});

// Show course details modal
function showCourseDetails(courseId) {
    // This would typically fetch detailed course information from an API
    // For now, we'll show a simple modal with basic information
    const modal = document.createElement('div');
    modal.className = 'course-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

    modal.innerHTML = `
        <div class="modal-content" style="
            background-color: white;
            padding: 2rem;
            border-radius: 8px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h2>Chi tiết khóa học</h2>
                <button class="close-modal" style="
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: var(--text-secondary);
                ">&times;</button>
            </div>
            <div class="modal-body">
                <p>Thông tin chi tiết về khóa học sẽ được hiển thị ở đây.</p>
                <p>Bao gồm:</p>
                <ul>
                    <li>Mục tiêu khóa học</li>
                    <li>Nội dung chi tiết</li>
                    <li>Thời gian học tập</li>
                    <li>Yêu cầu đầu vào</li>
                    <li>Kết quả đạt được</li>
                </ul>
                <div style="margin-top: 2rem;">
                    <a href="/contact" class="btn btn-primary">Đăng ký khóa học</a>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close modal functionality
    modal.addEventListener('click', function(e) {
        if (e.target === modal || e.target.classList.contains('close-modal')) {
            modal.remove();
        }
    });

    // Close on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            modal.remove();
        }
    });
}

// Add additional CSS for search and filter components
const additionalStyles = `
    .page-header {
        background: linear-gradient(135deg, var(--bg-accent) 0%, var(--bg-secondary) 100%);
        padding: 4rem 0;
        text-align: center;
    }

    .page-header h1 {
        font-size: 3rem;
        margin-bottom: 1rem;
        color: var(--text-primary);
    }

    .page-header p {
        font-size: 1.25rem;
        color: var(--text-secondary);
        max-width: 600px;
        margin: 0 auto;
    }

    .search-section {
        padding: 2rem 0;
        background-color: var(--bg-primary);
        border-bottom: 1px solid var(--border-color);
    }

    .search-container {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
    }

    .search-input {
        flex: 1;
        min-width: 250px;
        padding: 12px 16px;
        border: 2px solid var(--border-color);
        border-radius: var(--border-radius);
        font-size: 1rem;
        transition: var(--transition);
    }

    .search-input:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .filter-select {
        padding: 12px 16px;
        border: 2px solid var(--border-color);
        border-radius: var(--border-radius);
        font-size: 1rem;
        background-color: white;
        cursor: pointer;
        transition: var(--transition);
    }

    .filter-select:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .courses-section {
        padding: 4rem 0;
        background-color: var(--bg-secondary);
    }

    .categories-section {
        padding: 5rem 0;
        background-color: var(--bg-primary);
    }

    .categories-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 2rem;
    }

    .category-card {
        background-color: var(--bg-primary);
        padding: 2rem;
        border-radius: var(--border-radius);
        box-shadow: var(--shadow-md);
        border: 1px solid var(--border-color);
        transition: var(--transition);
    }

    .category-card:hover {
        transform: translateY(-5px);
        box-shadow: var(--shadow-lg);
    }

    .category-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
        text-align: center;
    }

    .category-card h3 {
        color: var(--text-primary);
        margin-bottom: 1rem;
        text-align: center;
    }

    .category-card p {
        color: var(--text-secondary);
        margin-bottom: 1.5rem;
        text-align: center;
    }

    .category-card ul {
        list-style: none;
        padding: 0;
    }

    .category-card li {
        padding: 0.5rem 0;
        color: var(--text-secondary);
        border-bottom: 1px solid var(--border-color);
    }

    .category-card li:last-child {
        border-bottom: none;
    }

    .course-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: 1rem;
    }

    .course-actions .btn {
        flex: 1;
        text-align: center;
        padding: 8px 16px;
        font-size: 0.875rem;
    }

    .cta-section {
        padding: 4rem 0;
        background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
        color: white;
        text-align: center;
    }

    .cta-content h2 {
        font-size: 2.5rem;
        margin-bottom: 1rem;
        color: white;
    }

    .cta-content p {
        font-size: 1.25rem;
        margin-bottom: 2rem;
        opacity: 0.9;
    }

    .cta-buttons {
        display: flex;
        gap: 1rem;
        justify-content: center;
        flex-wrap: wrap;
    }

    @media (max-width: 768px) {
        .search-container {
            flex-direction: column;
            align-items: stretch;
        }

        .search-input,
        .filter-select {
            min-width: auto;
        }

        .page-header h1 {
            font-size: 2rem;
        }

        .page-header p {
            font-size: 1rem;
        }

        .categories-grid {
            grid-template-columns: 1fr;
        }

        .course-actions {
            flex-direction: column;
        }

        .cta-content h2 {
            font-size: 2rem;
        }

        .cta-buttons {
            flex-direction: column;
            align-items: center;
        }
    }
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet); 
