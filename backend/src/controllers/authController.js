const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/db');

function generateToken(user) {
    return jwt.sign(
        { id: user.id, role: user.role, email: user.email },
        process.env.JWT_SECRET || 'moccoon_super_secret_jwt_key_2026_skincare_ecommerce',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
}

// 1. Đăng ký tài khoản khách hàng mới (Chỉ cho phép tạo role = 'CUSTOMER')
exports.register = async (req, res) => {
    try {
        const { full_name, email, phone, password, address } = req.body;

        const cleanFullName = full_name ? String(full_name).trim() : '';
        const cleanEmail = email && String(email).trim() ? String(email).trim().toLowerCase() : null;
        const cleanPhone = phone && String(phone).trim() ? String(phone).trim().replace(/\s+/g, '') : null;
        const cleanPassword = password ? String(password).trim() : '';
        const cleanAddress = address && String(address).trim() ? String(address).trim() : null;

        if (!cleanFullName || !cleanPassword || (!cleanEmail && !cleanPhone)) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp họ tên, mật khẩu và ít nhất email hoặc số điện thoại.'
            });
        }

        if (cleanPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu phải có độ dài ít nhất 8 ký tự.'
            });
        }

        let charTypes = 0;
        if (/[a-z]/.test(cleanPassword)) charTypes++;
        if (/[A-Z]/.test(cleanPassword)) charTypes++;
        if (/[0-9]/.test(cleanPassword)) charTypes++;
        if (/[^a-zA-Z0-9]/.test(cleanPassword)) charTypes++;

        if (charTypes < 2) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu phải đạt mức độ Khá trở lên (kết hợp ít nhất 2 nhóm: chữ thường, chữ hoa, số hoặc ký tự đặc biệt).'
            });
        }

        const pool = await getPool();

        // Kiểm tra xem email hoặc phone đã tồn tại chưa
        const checkQuery = `
            SELECT id FROM Users 
            WHERE (@email IS NOT NULL AND LOWER(email) = LOWER(@email)) 
               OR (@phone IS NOT NULL AND (phone = @phone OR REPLACE(phone, ' ', '') = @phone))
        `;
        const checkResult = await pool.request()
            .input('email', sql.NVarChar, cleanEmail)
            .input('phone', sql.NVarChar, cleanPhone)
            .query(checkQuery);

        if (checkResult.recordset.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Email hoặc số điện thoại này đã được đăng ký trong hệ thống.'
            });
        }

        // Mã hóa mật khẩu
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(cleanPassword, salt);

        // Lưu tài khoản: BẮT BUỘC role luôn là CUSTOMER. Quản trị viên (ADMIN) là tài khoản mặc định cố định.
        const insertQuery = `
            INSERT INTO Users (full_name, email, phone, password_hash, role, address, is_active)
            OUTPUT INSERTED.id, INSERTED.full_name, INSERTED.email, INSERTED.phone, INSERTED.role, INSERTED.address, INSERTED.created_at
            VALUES (@full_name, @email, @phone, @password_hash, 'CUSTOMER', @address, 1)
        `;
        const insertResult = await pool.request()
            .input('full_name', sql.NVarChar, cleanFullName)
            .input('email', sql.NVarChar, cleanEmail)
            .input('phone', sql.NVarChar, cleanPhone)
            .input('password_hash', sql.NVarChar, passwordHash)
            .input('address', sql.NVarChar, cleanAddress)
            .query(insertQuery);

        const newUser = insertResult.recordset[0];
        const token = generateToken(newUser);

        // Tạo giỏ hàng tự động cho khách hàng mới
        await pool.request()
            .input('userId', sql.Int, newUser.id)
            .query('IF NOT EXISTS (SELECT 1 FROM Carts WHERE user_id = @userId) INSERT INTO Carts (user_id) VALUES (@userId)');

        return res.status(201).json({
            success: true,
            message: 'Đăng ký tài khoản khách hàng thành công!',
            data: {
                token,
                user: newUser
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi tạo tài khoản.',
            error: error.message
        });
    }
};

// 2. Đăng nhập (Cho cả Khách hàng & Quản trị viên)
exports.login = async (req, res) => {
    try {
        const { account, password } = req.body;

        if (!account || !password) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập tài khoản (email hoặc số điện thoại) và mật khẩu.'
            });
        }

        const cleanAccount = String(account).trim();
        const cleanPassword = String(password).trim();
        const isEmail = cleanAccount.includes('@');
        const searchEmail = cleanAccount.toLowerCase();
        const searchPhone = cleanAccount.replace(/\s+/g, '');

        const pool = await getPool();
        const userQuery = `
            SELECT id, full_name, email, phone, password_hash, role, avatar_url, address, is_active, created_at
            FROM Users
            WHERE (@isEmail = 1 AND LOWER(email) = LOWER(@searchEmail))
               OR (@isEmail = 0 AND (phone = @searchPhone OR REPLACE(phone, ' ', '') = @searchPhone OR LOWER(email) = LOWER(@cleanAccount)))
               OR (LOWER(email) = LOWER(@cleanAccount))
               OR (phone = @cleanAccount)
        `;
        const result = await pool.request()
            .input('isEmail', sql.Bit, isEmail ? 1 : 0)
            .input('searchEmail', sql.NVarChar, searchEmail)
            .input('searchPhone', sql.NVarChar, searchPhone)
            .input('cleanAccount', sql.NVarChar, cleanAccount)
            .query(userQuery);

        if (result.recordset.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Tài khoản hoặc mật khẩu không chính xác.'
            });
        }

        const user = result.recordset[0];

        // Kiểm tra trạng thái kích hoạt
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ hỗ trợ Moccoon.'
            });
        }

        // So khớp mật khẩu (thử cả chuỗi đã trim và nguyên bản)
        let isMatch = await bcrypt.compare(cleanPassword, user.password_hash);
        if (!isMatch && cleanPassword !== password) {
            isMatch = await bcrypt.compare(password, user.password_hash);
        }

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Tài khoản hoặc mật khẩu không chính xác.'
            });
        }

        const token = generateToken(user);

        // Đảm bảo có giỏ hàng nếu là CUSTOMER
        if (user.role === 'CUSTOMER') {
            await pool.request()
                .input('userId', sql.Int, user.id)
                .query('IF NOT EXISTS (SELECT 1 FROM Carts WHERE user_id = @userId) INSERT INTO Carts (user_id) VALUES (@userId)');
        }

        const { password_hash, ...userInfo } = user;

        return res.status(200).json({
            success: true,
            message: 'Đăng nhập thành công!',
            data: {
                token,
                user: userInfo
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi đăng nhập.',
            error: error.message
        });
    }
};

// 3. Lấy thông tin cá nhân hiện tại
exports.getMe = async (req, res) => {
    return res.status(200).json({
        success: true,
        data: req.user
    });
};

// 4. Cập nhật hồ sơ cá nhân
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { full_name, phone, address, avatar_url } = req.body;

        const pool = await getPool();
        const updateQuery = `
            UPDATE Users 
            SET full_name = COALESCE(@full_name, full_name),
                phone = COALESCE(@phone, phone),
                address = COALESCE(@address, address),
                avatar_url = COALESCE(@avatar_url, avatar_url),
                updated_at = GETDATE()
            OUTPUT INSERTED.id, INSERTED.full_name, INSERTED.email, INSERTED.phone, INSERTED.role, INSERTED.avatar_url, INSERTED.address
            WHERE id = @userId
        `;
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .input('full_name', sql.NVarChar, full_name || null)
            .input('phone', sql.NVarChar, phone || null)
            .input('address', sql.NVarChar, address || null)
            .input('avatar_url', sql.NVarChar, avatar_url || null)
            .query(updateQuery);

        return res.status(200).json({
            success: true,
            message: 'Cập nhật thông tin cá nhân thành công!',
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('Update profile error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật thông tin cá nhân.',
            error: error.message
        });
    }
};

// 5. Đổi mật khẩu
exports.changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới.'
            });
        }

        if (new_password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu mới phải có ít nhất 6 ký tự.'
            });
        }

        const pool = await getPool();
        const userResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT password_hash FROM Users WHERE id = @userId');

        if (userResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Người dùng không tồn tại.' });
        }

        const isMatch = await bcrypt.compare(current_password, userResult.recordset[0].password_hash);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu hiện tại không chính xác.'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(new_password, salt);

        await pool.request()
            .input('userId', sql.Int, userId)
            .input('password_hash', sql.NVarChar, newHash)
            .query('UPDATE Users SET password_hash = @password_hash, updated_at = GETDATE() WHERE id = @userId');

        return res.status(200).json({
            success: true,
            message: 'Đổi mật khẩu thành công!'
        });
    } catch (error) {
        console.error('Change password error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi đổi mật khẩu.',
            error: error.message
        });
    }
};

