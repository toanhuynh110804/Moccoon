# ☁️ HƯỚNG DẪN ĐƯA SERVER LÊN CLOUD ĐỂ KHÁCH HÀNG DÙNG ONLINE

Để khách hàng ở bất kỳ đâu chỉ việc mở file **`Moccoon.exe`** hoặc app **`Moccoon_Mobile.apk`** là kết nối được ngay, bạn có thể triển khai Backend lên Cloud hoàn toàn miễn phí theo 2 cách dưới đây:

---

## 🚀 CÁCH 1: TẠO LINK CLOUD ONLINE TRỰC TIẾP TỪ MÁY BẠN (NHANH NHẤT - 1 PHÚT LÀ CÓ LINK)

Nếu máy bạn đang chạy CSDL SQL Server và Backend, bạn có thể dùng công nghệ Cloud Tunnel để cấp phát một đường link HTTPS công khai toàn cầu mà không cần cấu hình Router hay mở port:

1. Chạy lệnh sau trong CMD tại thư mục `backend/`:
   ```bash
   npx localtunnel --port 5000
   ```
   *Hệ thống sẽ cấp cho bạn 1 đường link online (Ví dụ: `https://moccoon-skincare.loca.lt`).*
2. Bạn mở file **`config.json`** trong thư mục `GIAO_CHO_KHACH_HANG/`:
   ```json
   {
     "server_url": "https://moccoon-skincare.loca.lt"
   }
   ```
3. Khách hàng ở bất kỳ máy tính nào chỉ cần nhấp đúp file **`Moccoon.exe`** là truy cập vào hệ thống ngay lập tức!

---

## 🌐 CÁCH 2: TRIỂN KHAI LÊN RENDER.COM HOẶC RAILWAY (CHẠY 24/7 ĐỘC LẬP)

Để Server chạy online 24/7 kể cả khi máy tính của bạn tắt nguồn:

### Bước 1: Đẩy mã nguồn lên GitHub cá nhân của bạn
1. Tạo một repository mới trên GitHub (Private hoặc Public).
2. Đẩy toàn bộ thư mục `backend/` lên repository đó.

### Bước 2: Tạo Web Service miễn phí trên Render.com
1. Truy cập [https://render.com](https://render.com) và đăng ký tài khoản miễn phí bằng tài khoản GitHub.
2. Chọn **New +** ➔ **Web Service**.
3. Chọn repository chứa backend của bạn.
4. Điền cấu hình cơ bản:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`
5. Tại mục **Environment Variables** (Biến môi trường), thêm các biến từ file `.env` của bạn (ví dụ: `JWT_SECRET`, thông tin kết nối CSDL Cloud nếu có).
6. Bấm **Create Web Service**. Sau 2-3 phút, Render sẽ cấp cho bạn địa chỉ:
   `https://moccoon-api.onrender.com`

### Bước 3: Cập nhật file config giao cho khách
Điền địa chỉ Cloud vừa tạo vào file **`config.json`**:
```json
{
  "server_url": "https://moccoon-api.onrender.com"
}
```
Khách hàng chỉ cần tải file **`Moccoon.exe`** và **`config.json`** về là dùng vĩnh viễn trên mọi máy tính!

---

## 💾 CƠ SỞ DỮ LIỆU SQL SERVER
- Trong thư mục `database/` đã có sẵn file xuất bản đầy đủ: **`MoccoonDB_Full_Export.sql`** chứa toàn bộ các bảng, tài khoản quản trị, sản phẩm, voucher và các đơn hàng mới nhất để bạn restore lên bất kỳ máy chủ nào.
