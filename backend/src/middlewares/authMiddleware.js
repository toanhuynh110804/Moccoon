const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/db');

// Xác thực JWT token
async function verifyToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Không tìm thấy mã xác thực. Vui lòng đăng nhập lại.'
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'moccoon_super_secret_jwt_key_2026_skincare_ecommerce');

        // Kiểm tra xem user có còn tồn tại và đang hoạt động không
        const pool = await getPool();
        const result = await pool.request()
            .input('userId', sql.Int, decoded.id)
            .query('SELECT id, full_name, email, phone, role, avatar_url, address, is_active FROM Users WHERE id = @userId');

        if (result.recordset.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Tài khoản không tồn tại.'
            });
        }

        const user = result.recordset[0];
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản của bạn đã bị khóa hoặc tạm ngưng hoạt động.'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
            });
        }
        return res.status(401).json({
            success: false,
            message: 'Mã xác thực không hợp lệ.'
        });
    }
}

// Phân quyền Quản trị viên (Admin)
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'ADMIN') {
        return res.status(403).json({
            success: false,
            message: 'Từ chối truy cập: Chức năng chỉ dành cho Quản trị viên.'
        });
    }
    next();
}

module.exports = {
    verifyToken,
    requireAdmin
};
