const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { getPool, sql } = require('./config/db');

// Khởi tạo Express
const app = express();

// Middlewares
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static directory cho file ảnh uploads, web preview và APK download
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../public')));
app.use('/apk', express.static(path.join(__dirname, '../../android/app/build/outputs/apk/debug')));

// 1. Health check & Server info
app.get('/api/health', async (req, res) => {
    try {
        const pool = await getPool();
        const dbCheck = await pool.request().query('SELECT @@VERSION AS version, DB_NAME() AS current_db');
        return res.status(200).json({
            status: 'ONLINE',
            app: 'Moccoon Skincare API Server',
            database: dbCheck.recordset[0].current_db,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        return res.status(500).json({
            status: 'DEGRADED',
            error: err.message
        });
    }
});

// 2. API Tổng hợp Trang Chủ (Banners, Danh mục, Bộ 3 Làm Sạch Nổi Bật)
app.get('/api/home', async (req, res) => {
    try {
        const pool = await getPool();

        const bannersQuery = 'SELECT * FROM Banners WHERE is_active = 1 ORDER BY sort_order ASC';
        const categoriesQuery = 'SELECT * FROM Categories WHERE is_active = 1 ORDER BY sort_order ASC';
        const featuredProductsQuery = `
            SELECT 
                p.id, p.category_id, p.name, p.slug, p.price, p.original_price, 
                p.stock_quantity, p.volume, p.skin_type, p.short_description, 
                p.is_featured, c.name AS category_name,
                (
                    SELECT TOP 1 image_url 
                    FROM ProductImages pi 
                    WHERE pi.product_id = p.id 
                    ORDER BY pi.is_primary DESC, pi.sort_order ASC
                ) AS primary_image
            FROM Products p
            LEFT JOIN Categories c ON p.category_id = c.id
            WHERE p.is_active = 1
            ORDER BY p.is_featured DESC, p.created_at DESC, p.id DESC;
        `;

        const [bannersRes, categoriesRes, productsRes] = await Promise.all([
            pool.request().query(bannersQuery),
            pool.request().query(categoriesQuery),
            pool.request().query(featuredProductsQuery)
        ]);

        return res.status(200).json({
            success: true,
            data: {
                banners: bannersRes.recordset,
                categories: categoriesRes.recordset,
                featured_products: productsRes.recordset, // Bộ 3 làm sạch + Combo Moccoon
                skincare_steps: [
                    { step: 1, name: 'Tẩy Trang', description: 'Hòa tan cặn bẩn, dầu nhờn & makeup với Moccoon Micellar Water' },
                    { step: 2, name: 'Rửa Mặt', description: 'Làm sạch sâu chuẩn pH 5.5 cùng Moccoon Gentle Cleanser' },
                    { step: 3, name: 'Tẩy Tế Bào Chết', description: 'Tái tạo làn da sáng mịn với Gel sinh học tự nhiên Moccoon (1-2 lần/tuần)' }
                ]
            }
        });
    } catch (err) {
        console.error('Home API error:', err);
        return res.status(500).json({ success: false, message: 'Lỗi tải dữ liệu trang chủ.', error: err.message });
    }
});

// Import các Routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const chatRoutes = require('./routes/chatRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const addressRoutes = require('./routes/addressRoutes');
const couponRoutes = require('./routes/couponRoutes');

// Gắn các Routes vào App
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/coupons', couponRoutes);

// Khởi chạy Android Studio từ giao diện web
app.post('/api/system/open-studio', (req, res) => {
    const { exec } = require('child_process');
    exec('Start-Process "C:\\Program Files\\Android\\Android Studio\\bin\\studio64.exe" -ArgumentList "c:\\Users\\Lenovo\\Moccoon\\android"', { shell: 'powershell.exe' }, (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'Đã gửi lệnh mở Android Studio thành công!' });
    });
});

// Route 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Endpoint ${req.originalUrl} không tồn tại trên Moccoon API Server.`
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('[Unhandled Error]:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Đã xảy ra lỗi nội bộ máy chủ.',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

module.exports = app;
