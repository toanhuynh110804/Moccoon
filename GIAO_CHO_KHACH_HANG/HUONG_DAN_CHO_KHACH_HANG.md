# 🌿 HƯỚNG DẪN SỬ DỤNG ỨNG DỤNG MOCCOON

Chào mừng bạn đến với hệ sinh thái mua sắm **Moccoon - Dược Mỹ Phẩm Thuần Chay Chuẩn Y Khoa**.

---

## 🖥️ 1. DÀNH CHO MÁY TÍNH (PC / LAPTOP WINDOWS)

Khách hàng **hoàn toàn không cần cài đặt môi trường lập trình hay cơ sở dữ liệu**.

### Cách mở ứng dụng:
1. Nhấp đúp chuột vào file **`Moccoon.exe`**.
2. Ứng dụng sẽ tự động mở lên dưới dạng **Cửa sổ phần mềm Desktop chuyên nghiệp** (giao diện toàn màn hình, mượt mà, không có thanh địa chỉ web rườm rà).
3. Đăng nhập hoặc đăng ký tài khoản để bắt đầu trải nghiệm:
   - **Tài khoản Quản Trị Viên (Admin)**: `admin@moccoon.vn` / Mật khẩu: `Admin@123456`
   - **Tài khoản Khách hàng mẫu**: `mytien@gmail.com` / Mật khẩu: `Admin@123456` (hoặc tự tạo tài khoản mới).

---

## 📱 2. DÀNH CHO ĐIỆN THOẠI ANDROID

1. Chép file **`Moccoon_Mobile.apk`** vào điện thoại (hoặc gửi qua Zalo / Telegram / Google Drive).
2. Mở file và chọn **"Cài đặt"** (Cho phép cài đặt từ nguồn tin cậy nếu có thông báo).
3. Biểu tượng ứng dụng **Moccoon** sẽ xuất hiện trên màn hình chính của điện thoại. Nhấp mở để dùng như các app Shopee, Lazada.

---

## ⚙️ 3. CẤU HÌNH ĐỊA CHỈ MÁY CHỦ (NẾU CẦN ĐỔI SANG CLOUD ONLINE)

Trong thư mục có sẵn file **`config.json`**:
```json
{
  "server_url": "http://localhost:5000",
  "app_name": "Moccoon - Dược Mỹ Phẩm Thuần Chay Chuẩn Y Khoa"
}
```
- Khi bạn đã đưa Server lên Cloud (ví dụ: `https://moccoon.onrender.com` hoặc tên miền riêng), chỉ cần đổi `"http://localhost:5000"` thành địa chỉ link Cloud của bạn.
- Mọi máy tính của khách hàng khi mở `Moccoon.exe` sẽ tự động kết nối và đồng bộ dữ liệu trực tiếp với Cloud 24/7!
