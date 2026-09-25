require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { getPool } = require('./config/db');
const setupChatSocket = require('./sockets/chatSocket');

const PORT = process.env.PORT || 5000;

// Khởi tạo HTTP Server
const server = http.createServer(app);

// Cấu hình Socket.io
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Kích hoạt module Socket.io cho Chat tư vấn Skincare
setupChatSocket(io);

// Khởi động Server sau khi kết nối Database thành công
async function startServer() {
    try {
        console.log('--- KHỞI ĐỘNG HỆ THỐNG BACKEND MCCOON ---');
        console.log('Đang kiểm tra kết nối SQL Server 2022...');
        await getPool();
        console.log('✓ Kết nối Cơ sở dữ liệu MoccoonDB thành công!');

        server.listen(PORT, () => {
            console.log(`=======================================================`);
            console.log(`🚀 Moccoon Backend Server đang chạy tại: http://localhost:${PORT}`);
            console.log(`📡 Socket.io Real-time Chat đã sẵn sàng.`);
            console.log(`🩺 Health Check: http://localhost:${PORT}/api/health`);
            console.log(`🛍️ Trang chủ API: http://localhost:${PORT}/api/home`);
            console.log(`=======================================================`);
        });
    } catch (error) {
        console.error('❌ Không thể khởi động máy chủ do lỗi kết nối Database:', error);
        process.exit(1);
    }
}

startServer();
