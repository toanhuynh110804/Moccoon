const { getPool, sql } = require('../config/db');

// 1. Báo cáo & Thống kê tổng quan (Dashboard)
exports.getDashboardStats = async (req, res) => {
    try {
        const pool = await getPool();

        // 1. Doanh thu hôm nay, tháng này, năm nay, và tổng cộng
        const revenueQuery = `
            SELECT 
                ISNULL(SUM(CASE WHEN CAST(created_at AS DATE) = CAST(GETDATE() AS DATE) AND order_status != 'CANCELLED' THEN final_amount ELSE 0 END), 0) AS revenue_today,
                ISNULL(SUM(CASE WHEN MONTH(created_at) = MONTH(GETDATE()) AND YEAR(created_at) = YEAR(GETDATE()) AND order_status != 'CANCELLED' THEN final_amount ELSE 0 END), 0) AS revenue_this_month,
                ISNULL(SUM(CASE WHEN YEAR(created_at) = YEAR(GETDATE()) AND order_status != 'CANCELLED' THEN final_amount ELSE 0 END), 0) AS revenue_this_year,
                ISNULL(SUM(CASE WHEN order_status != 'CANCELLED' THEN final_amount ELSE 0 END), 0) AS total_revenue
            FROM Orders;
        `;

        // 2. Thống kê số lượng đơn hàng theo trạng thái
        const ordersQuery = `
            SELECT 
                COUNT(*) AS total_orders,
                SUM(CASE WHEN order_status = 'PENDING' THEN 1 ELSE 0 END) AS pending_orders,
                SUM(CASE WHEN order_status = 'PREPARING' THEN 1 ELSE 0 END) AS preparing_orders,
                SUM(CASE WHEN order_status = 'SHIPPING' THEN 1 ELSE 0 END) AS shipping_orders,
                SUM(CASE WHEN order_status = 'DELIVERED' THEN 1 ELSE 0 END) AS delivered_orders,
                SUM(CASE WHEN order_status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_orders
            FROM Orders;
        `;

        // 3. Thống kê số lượng khách hàng đăng ký mới
        const usersQuery = `
            SELECT 
                COUNT(*) AS total_customers,
                SUM(CASE WHEN CAST(created_at AS DATE) = CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END) AS new_today,
                SUM(CASE WHEN MONTH(created_at) = MONTH(GETDATE()) AND YEAR(created_at) = YEAR(GETDATE()) THEN 1 ELSE 0 END) AS new_this_month
            FROM Users
            WHERE role = 'CUSTOMER';
        `;

        // 4. Thống kê sản phẩm bán chạy nhất (đặc biệt là Bộ 3 làm sạch da Moccoon)
        const topProductsQuery = `
            SELECT TOP 5
                p.id, p.name, p.slug, p.price, p.is_featured,
                ISNULL(SUM(oi.quantity), 0) AS total_sold,
                ISNULL(SUM(oi.total_price), 0) AS total_sales_amount,
                (
                    SELECT TOP 1 image_url 
                    FROM ProductImages pi 
                    WHERE pi.product_id = p.id 
                    ORDER BY pi.is_primary DESC
                ) AS image_url
            FROM Products p
            LEFT JOIN OrderItems oi ON p.id = oi.product_id
            LEFT JOIN Orders o ON oi.order_id = o.id AND o.order_status != 'CANCELLED'
            GROUP BY p.id, p.name, p.slug, p.price, p.is_featured
            ORDER BY total_sold DESC, p.is_featured DESC;
        `;

        // 5. Thống kê doanh thu 7 ngày gần nhất để vẽ biểu đồ
        const chartQuery = `
            WITH Last7Days AS (
                SELECT CAST(DATEADD(DAY, -6 + v.number, CAST(GETDATE() AS DATE)) AS DATE) AS date_val
                FROM master.dbo.spt_values v
                WHERE v.type = 'P' AND v.number BETWEEN 0 AND 6
            )
            SELECT 
                CONVERT(VARCHAR(10), d.date_val, 103) AS date_label,
                ISNULL(SUM(o.final_amount), 0) AS revenue,
                COUNT(o.id) AS order_count
            FROM Last7Days d
            LEFT JOIN Orders o ON CAST(o.created_at AS DATE) = d.date_val AND o.order_status != 'CANCELLED'
            GROUP BY d.date_val
            ORDER BY d.date_val ASC;
        `;

        const [revenueRes, ordersRes, usersRes, topProductsRes, chartRes] = await Promise.all([
            pool.request().query(revenueQuery),
            pool.request().query(ordersQuery),
            pool.request().query(usersQuery),
            pool.request().query(topProductsQuery),
            pool.request().query(chartQuery)
        ]);

        return res.status(200).json({
            success: true,
            data: {
                revenue: revenueRes.recordset[0],
                orders: ordersRes.recordset[0],
                customers: usersRes.recordset[0],
                top_products: topProductsRes.recordset,
                chart_data: chartRes.recordset
            }
        });
    } catch (error) {
        console.error('getDashboardStats error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi tải thống kê báo cáo.', error: error.message });
    }
};

// 2. Quản lý danh sách tài khoản khách hàng
exports.getCustomers = async (req, res) => {
    try {
        const { search, status, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const pool = await getPool();
        const request = pool.request();

        let whereConditions = ["role = 'CUSTOMER'"];

        if (status !== undefined) {
            whereConditions.push('is_active = @status');
            request.input('status', sql.Bit, status === 'active' || status === '1' ? 1 : 0);
        }

        if (search) {
            whereConditions.push('(full_name LIKE @search OR email LIKE @search OR phone LIKE @search)');
            request.input('search', sql.NVarChar, `%${search}%`);
        }

        const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

        const query = `
            SELECT 
                u.id, u.full_name, u.email, u.phone, u.avatar_url, 
                u.address, u.is_active, u.created_at,
                (SELECT COUNT(*) FROM Orders o WHERE o.user_id = u.id) AS total_orders,
                (SELECT ISNULL(SUM(final_amount), 0) FROM Orders o WHERE o.user_id = u.id AND o.order_status != 'CANCELLED') AS total_spent
            FROM Users u
            ${whereClause}
            ORDER BY u.created_at DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

            SELECT COUNT(*) AS total FROM Users u ${whereClause};
        `;

        request.input('offset', sql.Int, offset);
        request.input('limit', sql.Int, parseInt(limit));

        const result = await request.query(query);

        return res.status(200).json({
            success: true,
            data: {
                customers: result.recordsets[0],
                total: result.recordsets[1][0].total,
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('getCustomers error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi tải danh sách khách hàng.', error: error.message });
    }
};

// 3. Khóa hoặc Mở khóa tài khoản khách hàng vi phạm
// (Đúng theo yêu cầu tài liệu: Admin có quyền khóa/xóa, không được sửa đổi thông tin cá nhân khách)
exports.toggleCustomerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        if (is_active === undefined) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp trạng thái is_active (true/false).' });
        }

        const pool = await getPool();

        // Kiểm tra không cho phép tự khóa Admin
        const checkUser = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT role, full_name FROM Users WHERE id = @id');

        if (checkUser.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Người dùng không tồn tại.' });
        }

        if (checkUser.recordset[0].role === 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Không thể thay đổi trạng thái của tài khoản Quản trị viên.' });
        }

        await pool.request()
            .input('id', sql.Int, id)
            .input('is_active', sql.Bit, is_active ? 1 : 0)
            .query('UPDATE Users SET is_active = @is_active, updated_at = GETDATE() WHERE id = @id');

        const actionText = is_active ? 'Mở khóa' : 'Khóa';
        return res.status(200).json({
            success: true,
            message: `${actionText} tài khoản khách hàng "${checkUser.recordset[0].full_name}" thành công!`
        });
    } catch (error) {
        console.error('toggleCustomerStatus error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật trạng thái tài khoản.', error: error.message });
    }
};

// 4. Xóa tài khoản khách hàng vi phạm nghiêm trọng
exports.deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        const checkUser = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT role, full_name FROM Users WHERE id = @id');

        if (checkUser.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Khách hàng không tồn tại.' });
        }

        if (checkUser.recordset[0].role === 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Không thể xóa tài khoản Quản trị viên.' });
        }

        // Chuyển is_active về 0 và ẩn email/phone để tránh vi phạm khóa ngoại đơn hàng
        await pool.request()
            .input('id', sql.Int, id)
            .query(`
                UPDATE Users 
                SET is_active = 0,
                    full_name = N'[Tài khoản đã bị xóa]',
                    updated_at = GETDATE()
                WHERE id = @id
            `);

        return res.status(200).json({
            success: true,
            message: 'Đã xóa tài khoản khách hàng thành công.'
        });
    } catch (error) {
        console.error('deleteCustomer error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi xóa tài khoản.', error: error.message });
    }
};
