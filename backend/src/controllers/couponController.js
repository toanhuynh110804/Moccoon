const { getPool, sql } = require('../config/db');

// 1. Khách hàng: Lấy danh sách các mã ưu đãi đang mở
exports.getAvailableCoupons = async (req, res) => {
    try {
        const pool = await getPool();
        const query = `
            SELECT id, code, title, description, discount_type, discount_value,
                   max_discount_amount, min_order_amount, usage_limit, times_used, end_date
            FROM Coupons
            WHERE is_active = 1
              AND (end_date IS NULL OR end_date >= GETDATE())
              AND times_used < usage_limit
            ORDER BY discount_value DESC, min_order_amount ASC
        `;
        const result = await pool.request().query(query);
        return res.status(200).json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('getAvailableCoupons error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi tải danh sách mã khuyến mãi.', error: error.message });
    }
};

// 2. Khách hàng: Thẩm định và áp dụng mã giảm giá
exports.applyCoupon = async (req, res) => {
    try {
        const { code, total_amount } = req.body;

        if (!code || typeof code !== 'string') {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập mã giảm giá.' });
        }

        const cleanCode = code.trim().toUpperCase();
        const total = parseFloat(total_amount);

        if (isNaN(total) || total < 0) {
            return res.status(400).json({ success: false, message: 'Giá trị đơn hàng không hợp lệ.' });
        }

        const pool = await getPool();
        const query = `
            SELECT id, code, title, description, discount_type, discount_value,
                   max_discount_amount, min_order_amount, usage_limit, times_used,
                   is_active,
                   CASE WHEN start_date IS NOT NULL AND start_date > GETDATE() THEN 1 ELSE 0 END AS is_not_started,
                   CASE WHEN end_date IS NOT NULL AND end_date < GETDATE() THEN 1 ELSE 0 END AS is_expired
            FROM Coupons
            WHERE UPPER(code) = @code
        `;
        const result = await pool.request()
            .input('code', sql.VarChar, cleanCode)
            .query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: `Mã giảm giá "${cleanCode}" không tồn tại.` });
        }

        const coupon = result.recordset[0];

        // 1. Kiểm tra trạng thái kích hoạt
        if (!coupon.is_active) {
            return res.status(400).json({ success: false, message: `Mã giảm giá "${coupon.code}" đang tạm ngưng áp dụng.` });
        }

        // 2. Kiểm tra ngày bắt đầu
        if (coupon.is_not_started) {
            return res.status(400).json({ success: false, message: `Mã giảm giá "${coupon.code}" chưa đến ngày bắt đầu áp dụng.` });
        }

        // 3. Kiểm tra ngày hết hạn
        if (coupon.is_expired) {
            return res.status(400).json({ success: false, message: `Mã giảm giá "${coupon.code}" đã hết hạn sử dụng.` });
        }

        // 4. Kiểm tra số lượt sử dụng
        if (coupon.times_used >= coupon.usage_limit) {
            return res.status(400).json({ success: false, message: `Mã giảm giá "${coupon.code}" đã hết lượt sử dụng.` });
        }

        // 5. Kiểm tra giá trị đơn hàng tối thiểu
        const minOrder = parseFloat(coupon.min_order_amount) || 0;
        if (total < minOrder) {
            const diff = minOrder - total;
            return res.status(400).json({
                success: false,
                message: `Đơn hàng tối thiểu ${minOrder.toLocaleString('vi-VN')}đ mới áp dụng được mã này (Cần thêm ${diff.toLocaleString('vi-VN')}đ).`
            });
        }

        // 6. Tính số tiền được giảm
        let discountAmount = 0;
        if (coupon.discount_type === 'PERCENT') {
            const rawDiscount = total * (parseFloat(coupon.discount_value) / 100);
            const maxDiscount = coupon.max_discount_amount ? parseFloat(coupon.max_discount_amount) : Infinity;
            discountAmount = Math.min(rawDiscount, maxDiscount);
        } else {
            // FIXED
            discountAmount = Math.min(parseFloat(coupon.discount_value), total);
        }

        discountAmount = Math.round(discountAmount);
        const finalAmount = Math.max(0, total - discountAmount);

        return res.status(200).json({
            success: true,
            message: `Áp dụng mã "${coupon.code}" thành công! Tiết kiệm ${discountAmount.toLocaleString('vi-VN')}đ.`,
            data: {
                coupon_code: coupon.code,
                coupon_title: coupon.title,
                discount_type: coupon.discount_type,
                discount_value: parseFloat(coupon.discount_value),
                discount_amount: discountAmount,
                original_total: total,
                final_amount: finalAmount
            }
        });
    } catch (error) {
        console.error('applyCoupon error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi áp dụng mã giảm giá.', error: error.message });
    }
};

// 3. Quản trị viên: Lấy tất cả mã giảm giá
exports.getAdminCoupons = async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        const pool = await getPool();
        const query = `
            SELECT id, code, title, description, discount_type, discount_value,
                   max_discount_amount, min_order_amount, usage_limit, times_used,
                   start_date, end_date, is_active, created_at
            FROM Coupons
            ORDER BY created_at DESC
        `;
        const result = await pool.request().query(query);
        return res.status(200).json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('getAdminCoupons error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi tải danh sách khuyến mãi.', error: error.message });
    }
};

// 4. Quản trị viên: Tạo mã giảm giá mới
exports.createCoupon = async (req, res) => {
    try {
        const {
            code, title, description, discount_type = 'PERCENT',
            discount_value, max_discount_amount, min_order_amount = 0,
            usage_limit = 100, end_date
        } = req.body;

        if (!code || !title || !discount_value) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã code, tiêu đề và mức giảm giá.' });
        }

        const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '');
        const cleanVal = parseFloat(discount_value);

        if (isNaN(cleanVal) || cleanVal <= 0) {
            return res.status(400).json({ success: false, message: 'Mức giảm giá không hợp lệ.' });
        }

        if (discount_type === 'PERCENT' && (cleanVal <= 0 || cleanVal > 100)) {
            return res.status(400).json({ success: false, message: 'Mức giảm phần trăm phải từ 1% đến 100%.' });
        }

        const pool = await getPool();

        // Kiểm tra trùng mã code
        const check = await pool.request()
            .input('code', sql.VarChar, cleanCode)
            .query('SELECT id FROM Coupons WHERE UPPER(code) = @code');

        if (check.recordset.length > 0) {
            return res.status(409).json({ success: false, message: `Mã code "${cleanCode}" đã tồn tại. Vui lòng chọn mã khác.` });
        }

        const insertQuery = `
            INSERT INTO Coupons (
                code, title, description, discount_type, discount_value,
                max_discount_amount, min_order_amount, usage_limit, times_used,
                start_date, end_date, is_active
            )
            OUTPUT INSERTED.id, INSERTED.code, INSERTED.title
            VALUES (
                @code, @title, @description, @discount_type, @discount_value,
                @max_discount_amount, @min_order_amount, @usage_limit, 0,
                GETDATE(), @end_date, 1
            )
        `;

        const request = pool.request();
        request.input('code', sql.VarChar, cleanCode);
        request.input('title', sql.NVarChar, title.trim());
        request.input('description', sql.NVarChar, description ? description.trim() : null);
        request.input('discount_type', sql.NVarChar, discount_type);
        request.input('discount_value', sql.Decimal(18, 2), cleanVal);
        request.input('max_discount_amount', sql.Decimal(18, 2), max_discount_amount ? parseFloat(max_discount_amount) : null);
        request.input('min_order_amount', sql.Decimal(18, 2), parseFloat(min_order_amount) || 0);
        request.input('usage_limit', sql.Int, parseInt(usage_limit) || 100);
        request.input('end_date', sql.DateTime2, end_date ? new Date(end_date) : null);

        const result = await request.query(insertQuery);

        return res.status(201).json({
            success: true,
            message: `Tạo mã giảm giá "${cleanCode}" thành công! 🎉`,
            data: result.recordset[0]
        });
    } catch (error) {
        console.error('createCoupon error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi tạo mã giảm giá.', error: error.message });
    }
};

// 5. Quản trị viên: Bật / Tắt trạng thái mã giảm giá
exports.toggleCouponStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        const pool = await getPool();
        const request = pool.request();
        request.input('id', sql.Int, id);
        request.input('is_active', sql.Bit, is_active ? 1 : 0);

        await request.query('UPDATE Coupons SET is_active = @is_active, updated_at = GETDATE() WHERE id = @id');

        return res.status(200).json({
            success: true,
            message: `${is_active ? 'Kích hoạt' : 'Tạm ngưng'} mã giảm giá thành công!`
        });
    } catch (error) {
        console.error('toggleCouponStatus error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái mã.', error: error.message });
    }
};

// 6. Quản trị viên: Xóa mã giảm giá
exports.deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();
        await pool.request().input('id', sql.Int, id).query('DELETE FROM Coupons WHERE id = @id');
        return res.status(200).json({ success: true, message: 'Đã xóa mã khuyến mãi thành công!' });
    } catch (error) {
        console.error('deleteCoupon error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi xóa mã khuyến mãi.', error: error.message });
    }
};
