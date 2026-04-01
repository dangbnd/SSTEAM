# 🔍 SEO Plugin for STEM-STEAM Admin Panel

## Tổng quan

Plugin SEO được tích hợp vào admin panel của nền tảng STEM-STEAM, cung cấp các công cụ quản lý SEO toàn diện để tối ưu hóa website cho các công cụ tìm kiếm.

## ✨ Tính năng chính

### 📊 Dashboard & Báo cáo
- **Thống kê tổng quan**: Tổng số trang, điểm SEO trung bình, trang đã index, backlinks
- **Biểu đồ phân tích**: Lưu lượng truy cập, từ khóa hàng đầu, thiết bị truy cập, nguồn truy cập
- **Xuất báo cáo**: Tạo báo cáo SEO chi tiết để chia sẻ với team

### 📄 Quản lý Trang
- **Danh sách trang**: Xem tất cả trang với thông tin SEO
- **Điểm SEO**: Hiển thị điểm SEO từ 0-100 với màu sắc phân loại
- **Meta tags**: Quản lý title, meta description cho từng trang
- **Trạng thái**: Theo dõi trạng thái xuất bản, bản nháp, lưu trữ
- **Lọc và tìm kiếm**: Lọc theo trạng thái và điểm SEO

### 🔑 Quản lý Từ khóa
- **Theo dõi vị trí**: Theo dõi vị trí từ khóa trên Google
- **Thay đổi vị trí**: Hiển thị sự thay đổi vị trí (+/-)
- **Khối lượng tìm kiếm**: Hiển thị số lượt tìm kiếm hàng tháng
- **Trang đích**: Liên kết từ khóa với trang cụ thể
- **Lọc nâng cao**: Lọc theo vị trí và tìm kiếm theo từ khóa

### 📈 Phân tích & Báo cáo
- **Lưu lượng truy cập**: Biểu đồ theo thời gian
- **Từ khóa hàng đầu**: Top từ khóa đang hoạt động tốt
- **Thiết bị truy cập**: Phân tích mobile vs desktop
- **Nguồn truy cập**: Organic, direct, social, referral

### 🗺️ Quản lý Sitemap
- **Tạo sitemap**: Tự động tạo sitemap XML
- **Gửi Google**: Submit sitemap lên Google Search Console
- **Thống kê**: Tổng URL, lần cập nhật cuối, kích thước file
- **Xem sitemap**: Preview nội dung sitemap

### 🤖 Quản lý Robots.txt
- **Chỉnh sửa**: Editor trực quan để chỉnh sửa robots.txt
- **Lưu thay đổi**: Cập nhật robots.txt real-time
- **Khôi phục**: Khôi phục về cấu hình mặc định
- **Kiểm tra**: Validate cú pháp robots.txt

## 🚀 Cài đặt

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Cấu hình môi trường
Tạo file `.env` với các thông tin sau:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/stemsteam

# JWT Secret
JWT_SECRET=your_jwt_secret_here

# Email SMTP (cho thông báo)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Google Analytics (tùy chọn)
GA_TRACKING_ID=GA_MEASUREMENT_ID
```

### 3. Khởi chạy server
```bash
npm run dev
```

## 📖 Sử dụng

### Truy cập Admin Panel
1. Mở trình duyệt và truy cập `/admin`
2. Đăng nhập với tài khoản admin
3. Chọn tab **🔍 SEO** từ menu chính

### Điều hướng SEO Plugin
- **📄 Trang**: Quản lý tất cả trang và meta tags
- **🔑 Từ khóa**: Theo dõi vị trí từ khóa
- **📈 Phân tích**: Xem báo cáo và biểu đồ
- **🗺️ Sitemap**: Quản lý sitemap XML
- **🤖 Robots.txt**: Chỉnh sửa file robots.txt

## 🔌 API Endpoints

### SEO Stats
```http
GET /api/admin/seo/stats
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "totalPages": 24,
  "avgScore": 78,
  "indexedPages": 22,
  "backlinks": 156
}
```

### SEO Pages
```http
GET /api/admin/seo/pages
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `status`: Lọc theo trạng thái (published, draft, archived)
- `score`: Lọc theo điểm SEO (excellent, good, fair, poor)

**Response:**
```json
[
  {
    "id": "PAGE001",
    "url": "/products/arduino-uno-r3",
    "title": "Arduino Uno R3 - Sản phẩm chất lượng cao",
    "metaDescription": "Arduino Uno R3 chính hãng, giá tốt nhất thị trường.",
    "seoScore": 85,
    "status": "published",
    "lastUpdated": "2024-01-15T00:00:00.000Z"
  }
]
```

### SEO Keywords
```http
GET /api/admin/seo/keywords
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `search`: Tìm kiếm theo từ khóa
- `position`: Lọc theo vị trí (top10, top20, top50, top100)

**Response:**
```json
[
  {
    "id": "KW001",
    "keyword": "arduino uno r3",
    "currentPosition": 3,
    "change": 2,
    "searchVolume": 12000,
    "targetPage": "/products/arduino-uno-r3"
  }
]
```

### Sitemap Info
```http
GET /api/admin/seo/sitemap
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "totalUrls": 24,
  "lastUpdated": "2024-01-15T00:00:00.000Z",
  "size": "15.2 KB"
}
```

### Robots.txt
```http
GET /api/admin/seo/robots
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "content": "User-agent: *\nDisallow: /admin/\nAllow: /"
}
```

```http
POST /api/admin/seo/robots
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "content": "User-agent: *\nDisallow: /admin/\nAllow: /"
}
```

## 🎨 Tùy chỉnh

### CSS Variables
```css
:root {
  --seo-primary-color: #10b981;
  --seo-secondary-color: #3b82f6;
  --seo-warning-color: #f59e0b;
  --seo-danger-color: #ef4444;
  --seo-success-color: #10b981;
}
```

### Responsive Design
Plugin được thiết kế responsive và hoạt động tốt trên:
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (< 768px)

### Theme Support
Hỗ trợ cả light và dark theme với CSS variables.

## 🔒 Bảo mật

### Authentication
- Tất cả API endpoints yêu cầu JWT token
- Token được validate qua middleware `authenticateAdmin`
- Session timeout sau 24 giờ

### Data Validation
- Input validation cho tất cả form fields
- SQL injection protection
- XSS protection

### Rate Limiting
- Giới hạn 100 requests/phút cho mỗi IP
- Block IP sau 1000 requests/giờ

## 📊 Báo cáo & Analytics

### Chart.js Integration
- **Lưu lượng truy cập**: Line chart theo thời gian
- **Từ khóa**: Bar chart top từ khóa
- **Thiết bị**: Pie chart phân bố thiết bị
- **Nguồn truy cập**: Doughnut chart nguồn traffic

### Metrics
- **Core Web Vitals**: LCP, FID, CLS
- **SEO Score**: Điểm tổng thể cho mỗi trang
- **Keyword Rankings**: Vị trí từ khóa theo thời gian
- **Backlink Analysis**: Phân tích backlinks

## 🚀 Tính năng nâng cao

### Automation
- **Auto-sitemap**: Tự động tạo sitemap khi có thay đổi
- **SEO Monitoring**: Kiểm tra SEO score định kỳ
- **Keyword Tracking**: Theo dõi từ khóa tự động
- **Performance Alerts**: Cảnh báo khi performance giảm

### Integration
- **Google Search Console**: Kết nối trực tiếp
- **Google Analytics**: Import data tự động
- **Google PageSpeed**: Kiểm tra performance
- **Social Media**: Share báo cáo lên social

### Multi-language
- Hỗ trợ tiếng Việt và tiếng Anh
- Localization cho tất cả text
- RTL support cho các ngôn ngữ khác

## 🐛 Troubleshooting

### Common Issues
1. **SEO data không load**: Kiểm tra JWT token và database connection
2. **Charts không hiển thị**: Đảm bảo Chart.js được load đúng cách
3. **API errors**: Kiểm tra console logs và network tab

### Debug Mode
```javascript
// Enable debug mode
localStorage.setItem('seo_debug', 'true');
```

### Logs
- Server logs: `server.js` console
- Client logs: Browser console
- Network logs: Browser DevTools

## 🤝 Đóng góp

### Development Setup
1. Fork repository
2. Create feature branch: `git checkout -b feature/seo-enhancement`
3. Commit changes: `git commit -am 'Add SEO enhancement'`
4. Push branch: `git push origin feature/seo-enhancement`
5. Submit pull request

### Code Style
- Sử dụng ES6+ syntax
- Follow ESLint rules
- Add JSDoc comments
- Write unit tests

### Testing
```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test
npm test -- --grep "SEO"
```

## 📝 Changelog

### v1.0.0 (2024-01-15)
- ✨ Initial release
- 🔍 Basic SEO management features
- 📊 Dashboard with charts
- 🗺️ Sitemap management
- 🤖 Robots.txt editor

### Roadmap
- 🔄 Real-time SEO monitoring
- 📱 Mobile app support
- 🌍 Multi-language expansion
- 🤖 AI-powered SEO suggestions

## 📄 License

MIT License - xem file [LICENSE](LICENSE) để biết thêm chi tiết.

## 📞 Hỗ trợ

- **Email**: support@stemsteam.com
- **Documentation**: [docs.stemsteam.com](https://docs.stemsteam.com)
- **Issues**: [GitHub Issues](https://github.com/stemsteam/seo-plugin/issues)
- **Community**: [Discord](https://discord.gg/stemsteam)

---

**STEM-STEAM Team** - Xây dựng tương lai giáo dục STEM-STEAM! 🚀
