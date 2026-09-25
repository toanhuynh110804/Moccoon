# DỰ ÁN ỨNG DỤNG THƯƠNG MẠI ĐIỆN TỬ & TƯ VẤN CHĂM SÓC DA MCCOON

---

## 1. TỔNG QUAN HỆ THỐNG
* **Tên dự án:** Moccoon - Skincare & E-commerce App
* **Sản phẩm trọng tâm:** Bộ 3 làm sạch da chuyên sâu (Nước tẩy trang, Sữa rửa mặt, Tẩy tế bào chết sinh học và Combo trọn bộ).
* **Công nghệ cốt lõi:**
  * **Cơ sở dữ liệu:** Microsoft SQL Server 2022 (`LAPTOP-E45SU45T\SQLEXPRESS`).
  * **Backend:** Node.js (Express, `mssql`, `socket.io`, `jsonwebtoken`, `bcryptjs`, `multer`).
  * **Frontend Mobile (kế tiếp):** Java (Android Native).

---

## 2. THÔNG TIN CƠ SỞ DỮ LIỆU (SQL SERVER)
* **Tên Database:** `MoccoonDB`
* **Instance:** `LAPTOP-E45SU45T\SQLEXPRESS`
* **Tài khoản SQL:** `moccoon_app`
* **Mật khẩu:** `Moccoon2026@Pass`
* **File khởi tạo CSDL:** `database/init_db.sql`

### Danh sách bảng dữ liệu:
1. `Users`: Quản trị viên (ADMIN) & Khách hàng (CUSTOMER).
2. `Categories`: Danh mục sản phẩm (Nước tẩy trang, Sữa rửa mặt, Tẩy da chết, Combo).
3. `Products`: Chi tiết sản phẩm, thành phần, công dụng, HDSD, giá, dung tích, tồn kho.
4. `ProductImages`: Thư viện ảnh chi tiết của sản phẩm.
5. `Banners`: Banner tiếp thị, khuyến mãi trên Trang chủ.
6. `Carts` & `CartItems`: Giỏ hàng của từng khách hàng.
7. `Orders` & `OrderItems`: Đơn hàng, lịch sử mua sắm, trạng thái xử lý (*PENDING, PREPARING, SHIPPING, DELIVERED, CANCELLED*).
8. `ChatConversations` & `ChatMessages`: Kênh tư vấn da thời gian thực 1:1 phong cách Messenger.
9. `Notifications`: Thông báo đẩy cập nhật trạng thái đơn và ưu đãi.

---

## 3. TÀI KHOẢN MẪU KHỞI TẠO
| Loại tài khoản | Email | Số điện thoại | Mật khẩu mặc định | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin@moccoon.vn` | `0901234567` | `Admin@123456` | Khởi tạo từ DB gốc, đầy đủ quyền quản trị |
| **Khách hàng (Customer)** | `khachhang@gmail.com` | `0912345678` | `Admin@123456` | Tài khoản mua sắm và nhận tư vấn da |

---

## 4. HƯỚNG DẪN CHẠY BACKEND
```bash
# Di chuyển vào thư mục backend
cd backend

# Khởi động máy chủ phát triển
npm.cmd run dev

# Hoặc chạy bản production
npm.cmd start
```
* **Địa chỉ máy chủ API:** `http://localhost:5000`
* **Kiểm tra trạng thái máy chủ:** `GET http://localhost:5000/api/health`
* **Trang chủ tổng hợp:** `GET http://localhost:5000/api/home`

---

## 5. DANH SÁCH REST API ĐÃ TRIỂN KHAI

### 🔐 Xác thực & Người dùng (`/api/auth`)
* `POST /api/auth/register`: Đăng ký tài khoản khách hàng mới.
* `POST /api/auth/login`: Đăng nhập (hỗ trợ email hoặc số điện thoại).
* `GET /api/auth/me`: Lấy thông tin người dùng đang đăng nhập (Bearer Token).
* `PUT /api/auth/profile`: Cập nhật họ tên, SĐT, địa chỉ nhận hàng, ảnh đại diện.
* `PUT /api/auth/change-password`: Đổi mật khẩu.

### 🧴 Sản phẩm & Danh mục (`/api/products`, `/api/categories`)
* `GET /api/categories`: Danh sách danh mục sản phẩm.
* `GET /api/products`: Danh sách sản phẩm (hỗ trợ tìm kiếm, lọc theo danh mục, lọc bộ 3 chủ lực `is_featured=true`, sắp xếp).
* `GET /api/products/:identifier`: Chi tiết sản phẩm theo ID hoặc Slug (kèm album ảnh, thành phần, công dụng, HDSD).
* `POST / PUT / DELETE`: Thao tác CRUD dành riêng cho Quản trị viên (`ADMIN`).

### 🖼️ Banner Trang chủ (`/api/banners`)
* `GET /api/banners`: Danh sách banner khuyến mãi trên trang chủ.
* `POST / PUT / DELETE`: Quản trị banner dành cho Admin.

### 🛒 Giỏ hàng (`/api/cart`)
* `GET /api/cart`: Xem giỏ hàng của khách hàng.
* `POST /api/cart/add`: Thêm sản phẩm (lẻ hoặc combo) vào giỏ.
* `PUT /api/cart/item/:itemId`: Thay đổi số lượng sản phẩm.
* `DELETE /api/cart/item/:itemId`: Xóa sản phẩm khỏi giỏ.
* `DELETE /api/cart/clear`: Dọn sạch giỏ hàng.

### 📦 Đơn hàng & Thanh toán (`/api/orders`)
* `POST /api/orders/checkout`: Đặt hàng từ giỏ hàng hoặc mua ngay, tự động trừ tồn kho và gửi thông báo.
* `GET /api/orders/my-orders`: Xem lịch sử đơn hàng của khách hàng.
* `GET /api/orders/:identifier`: Xem chi tiết đơn hàng.
* `PUT /api/orders/:id/cancel`: Khách hàng hủy đơn (khi đang ở trạng thái `PENDING`).
* `GET /api/orders/admin/all`: Quản lý danh sách đơn hàng toàn hệ thống (Admin).
* `PUT /api/orders/admin/:id/status`: Duyệt đơn, cập nhật tiến độ giao hàng (Admin).

### 💬 Tư vấn Skincare Thời gian thực (`/api/chat` & `Socket.io`)
* `GET /api/chat/conversation`: Mở hoặc khởi tạo phòng chat tư vấn da cho khách.
* `GET /api/chat/messages/:conversationId`: Lịch sử tin nhắn tư vấn.
* `POST /api/chat/send`: Gửi tin nhắn qua REST API.
* `GET /api/chat/admin/conversations`: Tổng đài Admin quản lý tất cả các ca tư vấn.
* **Socket.io Events:**
  * `join_conversation`, `leave_conversation`
  * `send_message`, `receive_message`
  * `typing`, `user_typing`
  * `new_customer_chat` (thông báo tức thì cho chuyên viên trên kênh `admin_channel`)

### 📊 Quản trị viên & Báo cáo thống kê (`/api/admin`)
* `GET /api/admin/dashboard`:
  * Doanh thu hôm nay, tháng này, năm nay và tổng cộng.
  * Số lượng đơn theo từng trạng thái.
  * Lượng khách hàng đăng ký mới.
  * Top sản phẩm bán chạy nhất.
  * Dữ liệu biểu đồ doanh thu 7 ngày gần nhất.
* `GET /api/admin/customers`: Xem danh sách tài khoản khách hàng.
* `PUT /api/admin/customers/:id/status`: Khóa hoặc Mở khóa tài khoản vi phạm.
* `DELETE /api/admin/customers/:id`: Xóa tài khoản khách hàng vi phạm.
