# Database Management Guide - STEM-STEAM Education Platform

## Tổng quan

Hệ thống database đã được thiết kế để quản lý đầy đủ các thành phần chính của nền tảng giáo dục STEM-STEAM:

- **Categories (Danh mục)**: Quản lý phân loại cho sản phẩm, bài giảng và khóa học
- **Products (Sản phẩm)**: Quản lý các sản phẩm giáo dục và kit học tập
- **Tutorials (Bài giảng)**: Quản lý nội dung học tập và hướng dẫn
- **Courses (Khóa học)**: Quản lý các khóa học trực tuyến

## Cấu trúc Database

### 1. Categories Collection

```javascript
{
  _id: ObjectId,
  name: String,           // Tên danh mục
  slug: String,           // URL-friendly name
  description: String,    // Mô tả danh mục
  type: String,           // tutorial, product, course
  icon: String,           // Emoji icon
  color: String,          // Màu sắc hex
  isActive: Boolean,      // Trạng thái hoạt động
  sortOrder: Number,      // Thứ tự sắp xếp
  createdAt: Date,
  updatedAt: Date
}
```

### 2. Products Collection

```javascript
{
  _id: ObjectId,
  name: String,           // Tên sản phẩm
  slug: String,           // URL-friendly name
  description: String,    // Mô tả chi tiết
  shortDescription: String, // Mô tả ngắn
  categoryId: ObjectId,   // Reference to category
  price: Number,          // Giá hiện tại
  originalPrice: Number,  // Giá gốc
  currency: String,       // Đơn vị tiền tệ
  sku: String,            // Mã sản phẩm
  stock: Number,          // Số lượng tồn kho
  minStock: Number,       // Số lượng tối thiểu
  weight: Number,         // Trọng lượng (kg)
  dimensions: {            // Kích thước
    length: Number,
    width: Number,
    height: Number
  },
  images: [String],       // Danh sách hình ảnh
  features: [String],     // Tính năng sản phẩm
  specifications: Object, // Thông số kỹ thuật
  tags: [String],         // Tags
  isActive: Boolean,      // Trạng thái hoạt động
  isFeatured: Boolean,    // Sản phẩm nổi bật
  rating: Number,         // Điểm đánh giá
  reviewCount: Number,    // Số lượng đánh giá
  soldCount: Number,      // Số lượng đã bán
  createdAt: Date,
  updatedAt: Date
}
```

### 3. Tutorials Collection

```javascript
{
  _id: ObjectId,
  title: String,          // Tiêu đề bài giảng
  slug: String,           // URL-friendly name
  description: String,    // Mô tả
  content: String,        // Nội dung chi tiết
  excerpt: String,        // Tóm tắt
  categoryId: ObjectId,   // Reference to category
  author: String,         // Tác giả
  authorId: String,       // ID tác giả
  difficulty: String,     // beginner, intermediate, advanced
  duration: Number,       // Thời lượng (phút)
  videoUrl: String,       // Link video
  thumbnail: String,      // Hình ảnh đại diện
  tags: [String],         // Tags
  isPublished: Boolean,   // Trạng thái xuất bản
  isFeatured: Boolean,    // Bài giảng nổi bật
  viewCount: Number,      // Lượt xem
  likeCount: Number,      // Lượt thích
  commentCount: Number,   // Số bình luận
  rating: Number,         // Điểm đánh giá
  prerequisites: [String], // Yêu cầu trước
  learningOutcomes: [String], // Kết quả học tập
  resources: [{            // Tài nguyên
    name: String,
    type: String,
    url: String
  }],
  createdAt: Date,
  updatedAt: Date,
  publishedAt: Date       // Ngày xuất bản
}
```

### 4. Courses Collection

```javascript
{
  _id: ObjectId,
  title: String,          // Tiêu đề khóa học
  slug: String,           // URL-friendly name
  description: String,    // Mô tả
  shortDescription: String, // Mô tả ngắn
  categoryId: ObjectId,   // Reference to category
  level: String,          // Beginner, Intermediate, Advanced
  duration: String,       // Thời lượng (tuần)
  instructor: String,     // Giảng viên
  instructorId: String,   // ID giảng viên
  price: Number,          // Giá khóa học
  originalPrice: Number,  // Giá gốc
  currency: String,       // Đơn vị tiền tệ
  thumbnail: String,      // Hình ảnh đại diện
  banner: String,         // Banner khóa học
  students_count: Number, // Số học viên
  maxStudents: Number,    // Số học viên tối đa
  rating: Number,         // Điểm đánh giá
  reviewCount: Number,    // Số lượng đánh giá
  isPublished: Boolean,   // Trạng thái xuất bản
  isFeatured: Boolean,    // Khóa học nổi bật
  tags: [String],         // Tags
  learningOutcomes: [String], // Kết quả học tập
  curriculum: [{           // Chương trình học
    week: Number,
    title: String,
    topics: [String]
  }],
  createdAt: Date,
  updatedAt: Date,
  publishedAt: Date       // Ngày xuất bản
}
```

## API Endpoints

### Categories Management

- `GET /api/admin/categories` - Lấy danh sách danh mục
- `POST /api/admin/categories` - Tạo danh mục mới
- `PUT /api/admin/categories/:id` - Cập nhật danh mục
- `DELETE /api/admin/categories/:id` - Xóa danh mục

### Products Management

- `GET /api/admin/products` - Lấy danh sách sản phẩm (có phân trang và filter)
- `POST /api/admin/products` - Tạo sản phẩm mới
- `PUT /api/admin/products/:id` - Cập nhật sản phẩm
- `DELETE /api/admin/products/:id` - Xóa sản phẩm

### Tutorials Management

- `GET /api/admin/tutorials` - Lấy danh sách bài giảng (có phân trang và filter)
- `POST /api/admin/tutorials` - Tạo bài giảng mới
- `PUT /api/admin/tutorials/:id` - Cập nhật bài giảng
- `DELETE /api/admin/tutorials/:id` - Xóa bài giảng

### Courses Management

- `GET /api/admin/courses` - Lấy danh sách khóa học (có phân trang và filter)
- `POST /api/admin/courses` - Tạo khóa học mới
- `PUT /api/admin/courses/:id` - Cập nhật khóa học
- `DELETE /api/admin/courses/:id` - Xóa khóa học

### Dashboard Statistics

- `GET /api/admin/dashboard/stats` - Lấy thống kê tổng quan

## Sử dụng trong Admin Panel

### 1. Khởi tạo Database

Database sẽ tự động được khởi tạo với các collections trống khi server khởi động:

```javascript
// Tự động chạy khi kết nối MongoDB
await initSampleData();
```

**Lưu ý**: Database hiện tại không có dữ liệu mẫu. Bạn cần tự thêm dữ liệu thông qua admin panel hoặc API endpoints.

### 2. Quản lý Categories

```javascript
// Tạo danh mục mới
const newCategory = {
  name: "Lập trình Python",
  slug: "lap-trinh-python",
  description: "Học lập trình Python cơ bản",
  type: "tutorial",
  icon: "🐍",
  color: "#3776AB",
  isActive: true,
  sortOrder: 1
};

await adminDashboard.createCategory(newCategory);
```

### 3. Quản lý Products

```javascript
// Tạo sản phẩm mới
const newProduct = {
  name: "Bộ kit Raspberry Pi",
  slug: "bo-kit-raspberry-pi",
  description: "Học lập trình với Raspberry Pi",
  categoryId: "category_id_here",
  price: 1200000,
  sku: "RPI-001",
  stock: 30,
  tags: ["raspberry", "python", "iot"]
};

await adminDashboard.createProduct(newProduct);
```

### 4. Quản lý Tutorials

```javascript
// Tạo bài giảng mới
const newTutorial = {
  title: "Lập trình Python cơ bản",
  slug: "lap-trinh-python-co-ban",
  description: "Học Python từ cơ bản",
  categoryId: "category_id_here",
  author: "ThS. Nguyễn Văn A",
  difficulty: "beginner",
  duration: 60,
  tags: ["python", "lập trình", "cơ bản"]
};

await adminDashboard.createTutorial(newTutorial);
```

### 5. Quản lý Courses

```javascript
// Tạo khóa học mới
const newCourse = {
  title: "Khóa học Python nâng cao",
  slug: "khoa-hoc-python-nang-cao",
  description: "Học Python nâng cao",
  categoryId: "category_id_here",
  level: "Advanced",
  duration: "12 tuần",
  instructor: "TS. Trần Thị B",
  price: 3500000,
  tags: ["python", "nâng cao", "dự án"]
};

await adminDashboard.createCourse(newCourse);
```

## Tính năng nâng cao

### 1. Phân trang và Filter

Tất cả API endpoints đều hỗ trợ phân trang và filter:

```javascript
// Ví dụ filter sản phẩm
GET /api/admin/products?page=1&limit=10&category=category_id&search=arduino&status=active
```

### 2. Validation

- Kiểm tra slug duy nhất
- Kiểm tra SKU duy nhất cho sản phẩm
- Validation dữ liệu đầu vào

### 3. Relationship Management

- Tự động cập nhật categoryId references
- Kiểm tra ràng buộc trước khi xóa danh mục

### 4. Error Handling

Tất cả API endpoints đều có try-catch blocks và trả về error messages chi tiết.

## Bảo mật

- Tất cả admin endpoints đều được bảo vệ bởi `authenticateAdmin` middleware
- Sử dụng JWT tokens cho authentication
- Validation dữ liệu đầu vào để tránh injection attacks

## Monitoring và Logging

- Console logging cho tất cả operations
- Error tracking và reporting
- Performance monitoring cho database queries

## Troubleshooting

### 1. Database Connection Issues

```bash
# Kiểm tra MongoDB connection
mongo --host localhost --port 27017
```

### 2. Data Initialization Issues

```bash
# Xóa collections cũ và restart server
# Collections sẽ được tạo lại với dữ liệu mẫu
```

### 3. Performance Issues

- Sử dụng indexes cho các trường thường query
- Implement caching cho dữ liệu ít thay đổi
- Monitor query performance

## Roadmap

- [ ] Implement search và filter nâng cao
- [ ] Add bulk operations (import/export)
- [ ] Implement versioning cho content
- [ ] Add audit logging
- [ ] Implement backup và restore
- [ ] Add data analytics và reporting

## Hỗ trợ

Nếu gặp vấn đề hoặc cần hỗ trợ, vui lòng:

1. Kiểm tra console logs
2. Verify database connection
3. Check API responses
4. Review error messages

---

**Lưu ý**: Database này được thiết kế để mở rộng và có thể dễ dàng thêm các collections mới khi cần thiết.
