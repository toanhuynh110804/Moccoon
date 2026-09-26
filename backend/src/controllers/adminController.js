const { getPool, sql } = require('../config/db');
const XLSX = require('xlsx');

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
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

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

// 4. Xóa tài khoản khách hàng
exports.deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        const checkUser = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT id, role, full_name, email FROM Users WHERE id = @id');

        if (checkUser.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Khách hàng không tồn tại.' });
        }

        const user = checkUser.recordset[0];
        if (user.role === 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Không thể xóa tài khoản Quản trị viên.' });
        }

        // Kiểm tra xem khách hàng đã từng đặt đơn hàng nào chưa
        const checkOrders = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT COUNT(*) AS order_count FROM Orders WHERE user_id = @id');

        const orderCount = checkOrders.recordset[0]?.order_count || 0;

        if (orderCount === 0) {
            // Chưa có đơn hàng -> Xóa vĩnh viễn và hoàn toàn khỏi CSDL
            const transaction = new sql.Transaction(pool);
            await transaction.begin();
            try {
                const reqTrans = new sql.Request(transaction);
                reqTrans.input('id', sql.Int, id);

                await reqTrans.query(`
                    DELETE FROM CartItems WHERE cart_id IN (SELECT id FROM Carts WHERE user_id = @id);
                    DELETE FROM Carts WHERE user_id = @id;
                    DELETE FROM Favorites WHERE user_id = @id;
                    DELETE FROM UserAddresses WHERE user_id = @id;
                    DELETE FROM Notifications WHERE user_id = @id;
                    DELETE FROM ProductReviews WHERE user_id = @id;
                    DELETE FROM ChatMessages WHERE conversation_id IN (SELECT id FROM ChatConversations WHERE customer_id = @id);
                    DELETE FROM ChatConversations WHERE customer_id = @id;
                    DELETE FROM Users WHERE id = @id;
                `);

                await transaction.commit();
                return res.status(200).json({
                    success: true,
                    message: `Đã xóa vĩnh viễn tài khoản "${user.full_name}" khỏi hệ thống thành công!`
                });
            } catch (tErr) {
                await transaction.rollback();
                throw tErr;
            }
        } else {
            // Đã có đơn hàng -> Gỡ giỏ hàng, địa chỉ, khóa và ẩn thông tin để bảo toàn lịch sử hóa đơn
            await pool.request()
                .input('id', sql.Int, id)
                .query(`
                    DELETE FROM CartItems WHERE cart_id IN (SELECT id FROM Carts WHERE user_id = @id);
                    DELETE FROM Carts WHERE user_id = @id;
                    DELETE FROM Favorites WHERE user_id = @id;
                    DELETE FROM UserAddresses WHERE user_id = @id;
                    UPDATE Users 
                    SET is_active = 0,
                        full_name = N'[Tài khoản đã bị xóa]',
                        email = 'deleted_' + CAST(@id AS VARCHAR(10)) + '@moccoon.deleted',
                        phone = 'deleted_' + CAST(@id AS VARCHAR(10)),
                        updated_at = GETDATE()
                    WHERE id = @id;
                `);

            return res.status(200).json({
                success: true,
                message: `Tài khoản "${user.full_name}" đã phát sinh ${orderCount} đơn hàng nên đã được xóa và khóa vĩnh viễn để lưu trữ dữ liệu lịch sử đơn hàng.`
            });
        }
    } catch (error) {
        console.error('deleteCustomer error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi xóa tài khoản.', error: error.message });
    }
};

// 5. Xuất báo cáo toàn diện sang file Excel (.xlsx)
exports.exportExcel = async (req, res) => {
    try {
        const pool = await getPool();

        // Lấy dữ liệu đa chiều từ CSDL SQL Server
        const [revenueRes, ordersRes, usersRes, chartRes, allOrdersRes, productsRes] = await Promise.all([
            pool.request().query(`
                SELECT 
                    ISNULL(SUM(CASE WHEN CAST(created_at AS DATE) = CAST(GETDATE() AS DATE) AND order_status != 'CANCELLED' THEN final_amount ELSE 0 END), 0) AS revenue_today,
                    ISNULL(SUM(CASE WHEN MONTH(created_at) = MONTH(GETDATE()) AND YEAR(created_at) = YEAR(GETDATE()) AND order_status != 'CANCELLED' THEN final_amount ELSE 0 END), 0) AS revenue_this_month,
                    ISNULL(SUM(CASE WHEN YEAR(created_at) = YEAR(GETDATE()) AND order_status != 'CANCELLED' THEN final_amount ELSE 0 END), 0) AS revenue_this_year,
                    ISNULL(SUM(CASE WHEN order_status != 'CANCELLED' THEN final_amount ELSE 0 END), 0) AS total_revenue
                FROM Orders;
            `),
            pool.request().query(`
                SELECT 
                    COUNT(*) AS total_orders,
                    SUM(CASE WHEN order_status = 'PENDING' THEN 1 ELSE 0 END) AS pending_orders,
                    SUM(CASE WHEN order_status = 'PREPARING' THEN 1 ELSE 0 END) AS preparing_orders,
                    SUM(CASE WHEN order_status = 'SHIPPING' THEN 1 ELSE 0 END) AS shipping_orders,
                    SUM(CASE WHEN order_status = 'DELIVERED' THEN 1 ELSE 0 END) AS delivered_orders,
                    SUM(CASE WHEN order_status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_orders
                FROM Orders;
            `),
            pool.request().query(`
                SELECT COUNT(*) AS total_customers FROM Users WHERE role = 'CUSTOMER';
            `),
            pool.request().query(`
                WITH Last7Days AS (
                    SELECT CAST(DATEADD(DAY, -6 + v.number, CAST(GETDATE() AS DATE)) AS DATE) AS date_val
                    FROM master.dbo.spt_values v
                    WHERE v.type = 'P' AND v.number BETWEEN 0 AND 6
                )
                SELECT 
                    CONVERT(VARCHAR(10), d.date_val, 103) AS [Ngày],
                    ISNULL(SUM(o.final_amount), 0) AS [Doanh Thu (VNĐ)],
                    COUNT(o.id) AS [Số Lượng Đơn]
                FROM Last7Days d
                LEFT JOIN Orders o ON CAST(o.created_at AS DATE) = d.date_val AND o.order_status != 'CANCELLED'
                GROUP BY d.date_val
                ORDER BY d.date_val ASC;
            `),
            pool.request().query(`
                SELECT 
                    o.order_code AS [Mã Đơn Hàng],
                    CONVERT(VARCHAR(19), o.created_at, 120) AS [Ngày Đặt],
                    o.receiver_name AS [Người Nhận],
                    o.receiver_phone AS [Số Điện Thoại],
                    o.shipping_address AS [Địa Chỉ Nhận Hàng],
                    CASE o.payment_method 
                        WHEN 'COD' THEN N'Thanh toán khi nhận hàng (COD)'
                        WHEN 'BANK_TRANSFER' THEN N'Chuyển khoản ngân hàng'
                        WHEN 'BANKING' THEN N'Chuyển khoản ngân hàng'
                        ELSE o.payment_method 
                    END AS [Phương Thức Thanh Toán],
                    CASE o.payment_status 
                        WHEN 'PAID' THEN N'Đã thanh toán'
                        ELSE N'Chưa thanh toán' 
                    END AS [Trạng Thái Thanh Toán],
                    CASE o.order_status 
                        WHEN 'PENDING' THEN N'Chờ xác nhận'
                        WHEN 'PREPARING' THEN N'Đang đóng gói'
                        WHEN 'SHIPPING' THEN N'Đang giao hàng'
                        WHEN 'DELIVERED' THEN N'Giao thành công'
                        WHEN 'CANCELLED' THEN N'Đã hủy'
                        ELSE o.order_status 
                    END AS [Trạng Thái Đơn Hàng],
                    o.final_amount AS [Tổng Tiền (VNĐ)],
                    ISNULL(o.note, N'') AS [Ghi Chú]
                FROM Orders o
                ORDER BY o.created_at DESC;
            `),
            pool.request().query(`
                SELECT 
                    p.id AS [Mã SP],
                    p.name AS [Tên Sản Phẩm],
                    ISNULL(c.name, N'Chưa phân loại') AS [Danh Mục],
                    p.price AS [Giá Bán (VNĐ)],
                    ISNULL(p.original_price, p.price) AS [Giá Niêm Yết (VNĐ)],
                    p.stock_quantity AS [Tồn Kho],
                    ISNULL(p.volume, N'Chuẩn') AS [Dung Tích],
                    ISNULL(p.skin_type, N'Mọi loại da') AS [Loại Da Phù Hợp],
                    CASE WHEN p.is_active = 1 THEN N'Đang mở bán' ELSE N'Đã ẩn' END AS [Trạng Thái Bán]
                FROM Products p
                LEFT JOIN Categories c ON p.category_id = c.id
                ORDER BY p.id ASC;
            `)
        ]);

        const rev = revenueRes.recordset[0] || {};
        const ord = ordersRes.recordset[0] || {};
        const usr = usersRes.recordset[0] || {};

        const summaryData = [
            { 'Chỉ Số Thống Kê': 'Thời gian xuất báo cáo', 'Giá Trị': new Date().toLocaleString('vi-VN') },
            { 'Chỉ Số Thống Kê': 'Doanh thu hôm nay (VNĐ)', 'Giá Trị': rev.revenue_today || 0 },
            { 'Chỉ Số Thống Kê': 'Doanh thu tháng này (VNĐ)', 'Giá Trị': rev.revenue_this_month || 0 },
            { 'Chỉ Số Thống Kê': 'Doanh thu năm nay (VNĐ)', 'Giá Trị': rev.revenue_this_year || 0 },
            { 'Chỉ Số Thống Kê': 'Tổng doanh thu toàn hệ thống (VNĐ)', 'Giá Trị': rev.total_revenue || 0 },
            { 'Chỉ Số Thống Kê': 'Tổng số khách hàng đăng ký', 'Giá Trị': usr.total_customers || 0 },
            { 'Chỉ Số Thống Kê': 'Tổng số đơn hàng', 'Giá Trị': ord.total_orders || 0 },
            { 'Chỉ Số Thống Kê': 'Số đơn chờ duyệt (PENDING)', 'Giá Trị': ord.pending_orders || 0 },
            { 'Chỉ Số Thống Kê': 'Số đơn đang đóng gói (PREPARING)', 'Giá Trị': ord.preparing_orders || 0 },
            { 'Chỉ Số Thống Kê': 'Số đơn đang giao (SHIPPING)', 'Giá Trị': ord.shipping_orders || 0 },
            { 'Chỉ Số Thống Kê': 'Số đơn giao thành công (DELIVERED)', 'Giá Trị': ord.delivered_orders || 0 },
            { 'Chỉ Số Thống Kê': 'Số đơn đã hủy (CANCELLED)', 'Giá Trị': ord.cancelled_orders || 0 },
        ];

        const wb = XLSX.utils.book_new();

        const wsSummary = XLSX.utils.json_to_sheet(summaryData);
        wsSummary['!cols'] = [{ wch: 38 }, { wch: 25 }];
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Tổng Quan');

        const wsChart = XLSX.utils.json_to_sheet(chartRes.recordset);
        wsChart['!cols'] = [{ wch: 15 }, { wch: 22 }, { wch: 18 }];
        XLSX.utils.book_append_sheet(wb, wsChart, 'Doanh Thu 7 Ngày');

        const wsOrders = XLSX.utils.json_to_sheet(allOrdersRes.recordset);
        wsOrders['!cols'] = [
            { wch: 18 }, { wch: 20 }, { wch: 22 }, { wch: 15 }, 
            { wch: 35 }, { wch: 28 }, { wch: 20 }, { wch: 20 }, 
            { wch: 18 }, { wch: 25 }
        ];
        XLSX.utils.book_append_sheet(wb, wsOrders, 'Danh Sách Đơn Hàng');

        const wsProducts = XLSX.utils.json_to_sheet(productsRes.recordset);
        wsProducts['!cols'] = [
            { wch: 10 }, { wch: 35 }, { wch: 20 }, { wch: 18 }, 
            { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 16 }
        ];
        XLSX.utils.book_append_sheet(wb, wsProducts, 'Danh Sách Sản Phẩm');

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const nowStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Bao_Cao_Moccoon_${nowStr}.xlsx"`);
        return res.send(buffer);
    } catch (error) {
        console.error('exportExcel error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi xuất file Excel báo cáo.', error: error.message });
    }
};
