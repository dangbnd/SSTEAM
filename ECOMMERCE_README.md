# 🛒 E-commerce Plugin cho STEM-STEAM Admin

Plugin e-commerce hoàn chỉnh cho admin panel, tương tự WooCommerce nhưng được thiết kế riêng cho Node.js.

## ✨ Tính năng chính

### 📊 Dashboard & Báo cáo
- **Thống kê tổng quan**: Đơn hàng, doanh thu, khách hàng
- **Báo cáo doanh thu**: Biểu đồ theo thời gian
- **Phân tích đơn hàng**: Xu hướng và mẫu
- **Sản phẩm bán chạy**: Top sản phẩm theo doanh số

### 📦 Quản lý đơn hàng
- **Trạng thái đơn hàng**: Chờ xử lý, đang xử lý, đã gửi, đã giao, đã hủy
- **Lọc và tìm kiếm**: Theo trạng thái, ngày, khách hàng
- **Chi tiết đơn hàng**: Sản phẩm, số lượng, giá cả
- **Cập nhật trạng thái**: Dễ dàng thay đổi trạng thái đơn hàng

### 👥 Quản lý khách hàng
- **Thông tin khách hàng**: Tên, email, số điện thoại
- **Lịch sử mua hàng**: Số đơn hàng, tổng chi tiêu
- **Trạng thái khách hàng**: Hoạt động, không hoạt động
- **Tìm kiếm và lọc**: Theo tên, email, trạng thái

### 💳 Quản lý thanh toán
- **Hỗ trợ nhiều phương thức**:
  - 💳 **Stripe** - Thanh toán quốc tế
  - 📘 **PayPal** - Thanh toán toàn cầu
  - 🇻🇳 **VNPay** - Thanh toán Việt Nam
  - 💵 **Tiền mặt** - Thanh toán khi nhận hàng
- **Trạng thái giao dịch**: Chờ xử lý, thành công, thất bại, hoàn tiền
- **Hoàn tiền**: Xử lý hoàn tiền cho khách hàng

### 📊 Quản lý kho hàng
- **Theo dõi tồn kho**: Số lượng hiện có
- **Cảnh báo tồn kho**: Sắp hết hàng, hết hàng
- **Giá nhập và giá bán**: Quản lý lợi nhuận
- **SKU sản phẩm**: Mã sản phẩm duy nhất

## 🚀 Cài đặt

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Cấu hình môi trường
Tạo file `.env`:
```env
# Database
MONGO_URI=mongodb://localhost:27017/
DB_NAME=stem_steam_education

# JWT
JWT_SECRET=your-secret-key-change-in-production

# Payment Gateways
STRIPE_SECRET_KEY=sk_test_...
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
VNPAY_TMN_CODE=your-vnpay-tmn-code
VNPAY_HASH_SECRET=your-vnpay-hash-secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 3. Khởi động server
```bash
npm run dev
```

## 🔧 Cấu hình thanh toán

### Stripe
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
```

### PayPal
```javascript
const paypal = require('paypal-rest-sdk');
paypal.configure({
    mode: 'sandbox', // or 'live'
    client_id: process.env.PAYPAL_CLIENT_ID,
    client_secret: process.env.PAYPAL_CLIENT_SECRET
});
```

### VNPay
```javascript
const vnpay = require('vnpay');
const vnpayConfig = {
    tmnCode: process.env.VNPAY_TMN_CODE,
    hashSecret: process.env.VNPAY_HASH_SECRET,
    url: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'
};
```

## 📱 Sử dụng

### 1. Truy cập Admin Panel
```
http://localhost:3000/admin.html
```

### 2. Chọn tab E-commerce
- Click vào tab "🛒 E-commerce"
- Chọn sub-tab cần quản lý

### 3. Quản lý đơn hàng
- Xem danh sách đơn hàng
- Lọc theo trạng thái hoặc ngày
- Cập nhật trạng thái đơn hàng
- Xem chi tiết đơn hàng

### 4. Quản lý khách hàng
- Xem danh sách khách hàng
- Tìm kiếm theo tên hoặc email
- Xem lịch sử mua hàng
- Chỉnh sửa thông tin khách hàng

### 5. Quản lý thanh toán
- Xem danh sách giao dịch
- Lọc theo phương thức hoặc trạng thái
- Xử lý hoàn tiền
- Xem chi tiết giao dịch

### 6. Quản lý kho hàng
- Xem tồn kho hiện tại
- Cập nhật số lượng tồn kho
- Theo dõi sản phẩm sắp hết hàng
- Quản lý giá nhập và giá bán

## 🔌 API Endpoints

### E-commerce Stats
```
GET /api/admin/ecommerce/stats
```

### Orders
```
GET /api/admin/ecommerce/orders
GET /api/admin/ecommerce/orders/:id
PUT /api/admin/ecommerce/orders/:id/status
```

### Customers
```
GET /api/admin/ecommerce/customers
GET /api/admin/ecommerce/customers/:id
PUT /api/admin/ecommerce/customers/:id
```

### Payments
```
GET /api/admin/ecommerce/payments
GET /api/admin/ecommerce/payments/:id
POST /api/admin/ecommerce/payments/:id/refund
```

### Inventory
```
GET /api/admin/ecommerce/inventory
PUT /api/admin/ecommerce/inventory/:id/stock
```

## 🎨 Tùy chỉnh giao diện

### CSS Variables
```css
:root {
    --ecommerce-primary: #10b981;
    --ecommerce-secondary: #3b82f6;
    --ecommerce-success: #059669;
    --ecommerce-warning: #f59e0b;
    --ecommerce-danger: #dc2626;
}
```

### Responsive Design
- Mobile-first approach
- Breakpoints: 768px, 1024px, 1200px
- Touch-friendly interface
- Optimized for tablets

## 🔒 Bảo mật

### Authentication
- JWT token-based authentication
- Admin role verification
- Secure API endpoints

### Data Validation
- Input sanitization
- SQL injection prevention
- XSS protection

### Payment Security
- PCI DSS compliance
- Encrypted payment data
- Secure gateway integration

## 📊 Báo cáo và Analytics

### Biểu đồ doanh thu
- Chart.js integration
- Real-time data updates
- Export to PDF/Excel

### Metrics
- Conversion rate
- Average order value
- Customer lifetime value
- Return on investment

## 🚀 Tính năng nâng cao

### Automation
- Email notifications
- SMS alerts
- Inventory alerts
- Order status updates

### Integration
- CRM systems
- Accounting software
- Shipping providers
- Marketing tools

### Multi-language
- Vietnamese (default)
- English support
- Easy localization

## 🤝 Đóng góp

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Tạo Pull Request

## 📄 License

MIT License - Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

## 📞 Hỗ trợ

- **Email**: support@stemsteam.edu.vn
- **Documentation**: [docs.stemsteam.edu.vn](https://docs.stemsteam.edu.vn)
- **Community**: [forum.stemsteam.edu.vn](https://forum.stemsteam.edu.vn)

---

**E-commerce Plugin** - Giải pháp thương mại điện tử hoàn chỉnh cho STEM-STEAM Education Platform 🚀
