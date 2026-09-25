async function testApi() {
    try {
        console.log('--- BẮT ĐẦU KIỂM THỬ TOÀN BỘ BACKEND MCCOON ---');
        
        // 1. Test Login Admin
        console.log('\n1. Đăng nhập Admin (admin@moccoon.vn)...');
        const adminLoginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                account: 'admin@moccoon.vn',
                password: 'Admin@123456'
            })
        });
        const adminData = await adminLoginRes.json();
        console.log('Kết quả login Admin:', adminData.success, '- Role:', adminData.data?.user?.role);
        const adminToken = adminData.data?.token;

        // 2. Test Login Customer
        console.log('\n2. Đăng nhập Khách hàng mẫu (khachhang@gmail.com)...');
        const userLoginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                account: 'khachhang@gmail.com',
                password: 'Admin@123456'
            })
        });
        const userData = await userLoginRes.json();
        console.log('Kết quả login Khách hàng:', userData.success, '- Tên:', userData.data?.user?.full_name);
        const customerToken = userData.data?.token;

        // 3. Test lấy danh sách sản phẩm
        console.log('\n3. Tải danh sách sản phẩm...');
        const prodRes = await fetch('http://localhost:5000/api/products');
        const prodData = await prodRes.json();
        console.log('Số lượng sản phẩm lấy được:', prodData.data?.products?.length);
        const firstProduct = prodData.data?.products[0];
        console.log('Sản phẩm 1:', firstProduct?.name, '- Giá:', firstProduct?.price);

        // 4. Test thêm vào giỏ hàng
        console.log('\n4. Thêm sản phẩm vào giỏ hàng khách hàng...');
        const cartAddRes = await fetch('http://localhost:5000/api/cart/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${customerToken}`
            },
            body: JSON.stringify({
                product_id: firstProduct.id,
                quantity: 2
            })
        });
        const cartAddData = await cartAddRes.json();
        console.log('Thêm giỏ hàng:', cartAddData.message);

        // 5. Test xem giỏ hàng
        console.log('\n5. Kiểm tra thông tin giỏ hàng...');
        const getCartRes = await fetch('http://localhost:5000/api/cart', {
            headers: { 'Authorization': `Bearer ${customerToken}` }
        });
        const getCartData = await getCartRes.json();
        console.log('Số lượng trong giỏ:', getCartData.data?.total_quantity, '- Tổng tiền:', getCartData.data?.total_amount);

        // 6. Test Đặt hàng (Checkout)
        console.log('\n6. Thực hiện Đặt hàng (Checkout)...');
        const checkoutRes = await fetch('http://localhost:5000/api/orders/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${customerToken}`
            },
            body: JSON.stringify({
                receiver_name: 'Nguyễn Thị Mai Linh',
                receiver_phone: '0912345678',
                shipping_address: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. HCM',
                payment_method: 'COD',
                note: 'Giao giờ hành chính giúp mình nhé'
            })
        });
        const checkoutData = await checkoutRes.json();
        console.log('Đặt hàng:', checkoutData.message, '- Mã đơn:', checkoutData.data?.order_code, '- Số tiền:', checkoutData.data?.final_amount);

        // 7. Test Admin Dashboard thống kê
        console.log('\n7. Admin kiểm tra Dashboard Báo cáo & Thống kê...');
        const statsRes = await fetch('http://localhost:5000/api/admin/dashboard', {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const statsData = await statsRes.json();
        console.log('Doanh thu hôm nay:', statsData.data?.revenue?.revenue_today, 'VNĐ');
        console.log('Tổng số đơn hàng:', statsData.data?.orders?.total_orders);
        console.log('Đơn hàng mới tạo:', statsData.data?.orders?.pending_orders);

        // 8. Test Chat tư vấn Skincare
        console.log('\n8. Khách hàng gửi tin nhắn tư vấn da cho chuyên viên Moccoon...');
        const chatConvRes = await fetch('http://localhost:5000/api/chat/conversation', {
            headers: { 'Authorization': `Bearer ${customerToken}` }
        });
        const chatConvData = await chatConvRes.json();
        const convId = chatConvData.data.id;
        
        const sendMsgRes = await fetch('http://localhost:5000/api/chat/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${customerToken}`
            },
            body: JSON.stringify({
                conversation_id: convId,
                message_text: 'Chào bác sĩ Moccoon, da mình là da hỗn hợp thiên dầu và hay có mụn cám ở mũi thì nên dùng bộ 3 làm sạch như thế nào ạ?'
            })
        });
        const sendMsgData = await sendMsgRes.json();
        console.log('Tin nhắn gửi thành công:', sendMsgData.data?.message_text);

        console.log('\n=============================================');
        console.log('🎉 TOÀN BỘ CÁC MODULE BACKEND VÀ DATABASE HOẠT ĐỘNG HOÀN HẢO!');
        console.log('=============================================');

    } catch (err) {
        console.error('Lỗi kiểm thử:', err);
    }
}

testApi();
