const { getPool, sql } = require('../src/config/db');

async function repairUnicode() {
    console.log('--- BẮT ĐẦU CHUẨN HÓA TOÀN BỘ FONT CHỮ & DỮ LIỆU UNICODE TIẾNG VIỆT ---');
    const pool = await getPool();

    // 1. Chuẩn hóa Users
    await pool.request()
        .input('fn1', sql.NVarChar, 'Quản Trị Viên Moccoon')
        .input('addr1', sql.NVarChar, 'Trụ sở Moccoon Skincare, TP. Hồ Chí Minh')
        .query('UPDATE Users SET full_name = @fn1, address = @addr1 WHERE id = 1');

    await pool.request()
        .input('fn2', sql.NVarChar, 'Nguyễn Thị Mai Linh')
        .input('addr2', sql.NVarChar, '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh')
        .query('UPDATE Users SET full_name = @fn2, address = @addr2 WHERE id = 2');
    console.log('✓ Bảng Users: Đã sửa tên "Quản Trị Viên Moccoon" và "Nguyễn Thị Mai Linh"');

    // 2. Chuẩn hóa Categories
    const categories = [
        { id: 1, name: 'Nước Tẩy Trang', desc: 'Làm sạch sâu lớp trang điểm, bụi bẩn và dầu thừa dịu nhẹ' },
        { id: 2, name: 'Sữa Rửa Mặt', desc: 'Rửa sạch bụi mịn, cân bằng độ pH tự nhiên cho làn da ẩm mượt' },
        { id: 3, name: 'Tẩy Tế Bào Chết', desc: 'Lấy đi tế bào già cỗi, thông thoáng lỗ chân lông, ngừa mụn' },
        { id: 4, name: 'Bộ Combo Làm Sạch', desc: 'Trọn bộ 3 bước làm sạch da chuyên sâu Moccoon tối ưu hiệu quả và tiết kiệm' }
    ];
    for (const c of categories) {
        await pool.request()
            .input('id', sql.Int, c.id)
            .input('name', sql.NVarChar, c.name)
            .input('desc', sql.NVarChar, c.desc)
            .query('UPDATE Categories SET name = @name, description = @desc WHERE id = @id');
    }
    console.log('✓ Bảng Categories: Đã chuẩn hóa danh mục Nước Tẩy Trang, Sữa Rửa Mặt, Tẩy Tế Bào Chết, Bộ Combo Làm Sạch');

    // 3. Chuẩn hóa Banners
    const banners = [
        {
            id: 1,
            title: 'Đột Phá Làm Sạch Da Cùng Bộ 3 Moccoon',
            subtitle: 'Giải pháp 3 bước làm sạch sâu chuẩn y khoa - Nước tẩy trang, Sữa rửa mặt, Tẩy tế bào chết'
        },
        {
            id: 2,
            title: 'Tư Vấn Chu Trình Skincare Miễn Phí 1:1',
            subtitle: 'Kết nối trực tiếp chuyên viên da liễu Moccoon ngay trên ứng dụng để nhận lộ trình riêng biệt'
        },
        {
            id: 3,
            title: 'Mua Trọn Bộ Làm Sạch - Nhận Quà Tinh Tế',
            subtitle: 'Tặng ngay băng đô tai mèo và túi đựng mỹ phẩm chống nước cho đơn hàng từ 500k'
        }
    ];
    for (const b of banners) {
        await pool.request()
            .input('id', sql.Int, b.id)
            .input('title', sql.NVarChar, b.title)
            .input('sub', sql.NVarChar, b.subtitle)
            .query('UPDATE Banners SET title = @title, subtitle = @sub WHERE id = @id');
    }
    console.log('✓ Bảng Banners: Đã chuẩn hóa toàn bộ tiêu đề và mô tả banner');

    // 4. Chuẩn hóa Products
    const products = [
        {
            id: 1,
            name: 'Nước Tẩy Trang Dịu Nhẹ Làm Sạch Sâu Moccoon Pure Clean Micellar Water',
            volume: '500ml',
            skin_type: 'Mọi loại da, kể cả da nhạy cảm & da mụn',
            short_desc: 'Ứng dụng công nghệ Micellar hiện đại giúp hòa tan và cuốn trôi cặn trang điểm chống nước, bụi mịn PM 2.5 mà không gây khô rát.',
            desc: 'Nước tẩy trang Moccoon Pure Clean Micellar Water là bước khởi đầu hoàn hảo cho chu trình chăm sóc da chuẩn chuyên gia. Công thức giàu khoáng chất kết hợp chiết xuất rau má lên men và cúc la mã giúp làm dịu tức thì làn da kích ứng, kháng viêm và duy trì độ ẩm tự nhiên cho da.',
            ingredients: 'Nước khoáng tinh khiết, Chiết xuất Rau má Centella Asiatica, Chiết xuất Cúc La Mã, Glycerin, Sodium Hyaluronate, Panthenol (Vitamin B5), Allantoin, Citric Acid.',
            benefits: '1. Cuốn trôi 99% bụi bẩn, dầu nhờn và lớp makeup cứng đầu.\n2. Cấp ẩm tức thì, không gây cảm giác nhờn dính hay cay mắt.\n3. Kháng viêm, làm dịu da nhạy cảm và hỗ trợ se khít lỗ chân lông.',
            usage: 'Thấm một lượng vừa đủ ra bông tẩy trang. Lau nhẹ nhàng khắp mặt theo chiều từ dưới lên trên, từ trong ra ngoài. Đối với vùng mắt và môi, giữ miếng bông 5-10 giây trước khi lau nhẹ.'
        },
        {
            id: 2,
            name: 'Sữa Rửa Mặt Tạo Bọt Mịn Cân Bằng pH Moccoon Gentle Hydro Cleanser',
            volume: '150ml',
            skin_type: 'Da thường, da dầu mụn, da hỗn hợp thiên dầu',
            short_desc: 'Độ pH chuẩn 5.5 cùng bọt siêu mịn tơ tằm len lỏi sâu làm sạch dầu thừa trong lỗ chân lông mà vẫn bảo toàn lớp màng lipid bảo vệ da.',
            desc: 'Sữa rửa mặt Moccoon Gentle Hydro Cleanser mang lại cảm giác sảng khoái, mịn màng sau mỗi lần sử dụng. Công thức chứa phức hợp Amino Acid và Ceramide NP củng cố hàng rào bảo vệ da, giúp da khỏe mạnh chống lại tác nhân ô nhiễm từ môi trường.',
            ingredients: 'Cocamidopropyl Betaine, Potassium Cocoyl Glycinate, Chiết xuất Tràm trà (Tea Tree), Ceramide NP, Hyaluronic Acid thủy phân, Niacinamide (Vitamin B3), Vitamin E.',
            benefits: '1. Làm sạch tận sâu lỗ chân lông, kiềm dầu thừa hiệu quả suốt 8 giờ.\n2. Duy trì độ pH sinh lý 5.5, da không bị khô căng sau khi rửa.\n3. Giảm khuẩn mụn và hỗ trợ làm sáng đều màu da.',
            usage: 'Làm ướt da mặt với nước ấm. Lấy một lượng sữa rửa mặt bằng hạt đậu ra lòng bàn tay, tạo bọt kỹ rồi massage đều lên mặt theo chuyển động tròn trong 60 giây. Rửa sạch lại với nước mát và thấm khô.'
        },
        {
            id: 3,
            name: 'Gel Tẩy Tế Bào Chết Sinh Học Dịu Nhẹ Moccoon Gentle Peeling Gel',
            volume: '100ml',
            skin_type: 'Mọi loại da, da sần sùi, da xỉn màu thiếu sức sống',
            short_desc: 'Cơ chế kết vón cellulose sinh học tự nhiên, nhẹ nhàng loại bỏ lớp sừng già cỗi mà không gây xước da hay bào mòn như các dạng hạt scrub thô.',
            desc: 'Moccoon Gentle Peeling Gel kích thích tái tạo biểu bì da mới, mở đường cho các bước dưỡng serum và kem thẩm thấu tối đa. Chiết xuất đu đủ lên men tự nhiên giàu enzyme Papain kết hợp AHA thực vật làm tan rã tế bào sừng một cách dịu nhẹ.',
            ingredients: 'Cellulose sinh học, Chiết xuất Đu đủ (Carica Papaya Enzyme), Chiết xuất Táo đỏ (AHA tự nhiên), Chiết xuất Lô hội (Aloe Vera), Trà xanh Camellia Sinensis, Collagen thủy phân.',
            benefits: '1. Loại bỏ tế bào da chết và sợi bã nhờn sần sùi quanh cánh mũi.\n2. Cải thiện làn da sạm màu, giúp da sáng mịn và bắt sáng tức thì.\n3. Ngăn ngừa bít tắc lỗ chân lông gây mụn ẩn.',
            usage: 'Sử dụng sau bước tẩy trang và rửa mặt. Lau khô mặt, lấy lượng gel vừa đủ thoa đều khắp mặt (tránh vùng mắt và môi). Massage nhẹ nhàng 1-2 phút cho đến khi xuất hiện các vón cục tế bào chết. Rửa sạch lại với nước ấm. Dùng 1-2 lần/tuần.'
        },
        {
            id: 4,
            name: 'Combo Trọn Bộ 3 Bước Làm Sạch Chuyên Sâu & Phục Hồi Moccoon Pure & Clear Trio',
            volume: 'Trọn bộ 3 món (500ml + 150ml + 100ml)',
            skin_type: 'Giải pháp làm sạch toàn diện cho mọi làn da',
            short_desc: 'Tiết kiệm hơn 200.000đ khi sở hữu trọn bộ 3 sản phẩm làm sạch da chuẩn y khoa từ Moccoon: Nước tẩy trang 500ml, Sữa rửa mặt 150ml và Tẩy tế bào chết 100ml.',
            desc: 'Bộ 3 làm sạch da Moccoon là nền tảng cốt lõi trong chu trình skincare khoa học. Sự phối hợp nhịp nhàng giữa 3 sản phẩm giúp da được detox hoàn toàn khỏi cặn bẩn, dầu nhờn, kem chống nắng và lớp sừng chết, sẵn sàng hấp thu 100% dưỡng chất ở các bước chăm sóc tiếp theo.',
            ingredients: 'Công thức đồng bộ kết hợp Rau má lên men, Ceramide NP, Phức hợp Amino Acid và Enzyme trái cây tự nhiên.',
            benefits: '1. Chu trình 3 bước làm sạch chuẩn chuyên gia: Tẩy trang -> Rửa mặt -> Tẩy da chết.\n2. Giảm thiểu nguy cơ phát sinh mụn ẩn, mụn đầu đen đến 85%.\n3. Tiết kiệm chi phí và tặng kèm hộp quà cao cấp Moccoon.',
            usage: 'Bước 1: Dùng Nước tẩy trang làm sạch bụi bẩn và makeup.\nBước 2: Rửa mặt lại với Sữa rửa mặt pH 5.5.\nBước 3: Dùng Gel tẩy tế bào chết (1-2 lần/tuần) để tái tạo bề mặt da mịn màng.'
        },
        {
            id: 6,
            name: 'Kem Dưỡng Ẩm Chuyên Sâu Moccoon',
            volume: '50ml',
            skin_type: 'Mọi loại da',
            short_desc: 'Cấp ẩm và phục hồi hàng rào sinh học',
            desc: 'Công thức độc quyền từ Moccoon, dưỡng ẩm sâu và làm dịu da suốt 24 giờ.',
            ingredients: 'Hyaluronic Acid đa phân tử, Ceramide NP, Vitamin B5, Chiết xuất Rau má Centella.',
            benefits: '1. Khóa ẩm tức thì cho da căng mướt.\n2. Tái tạo hàng rào ẩm tự nhiên.\n3. Không gây bí tắc lỗ chân lông.',
            usage: 'Thoa một lượng kem vừa đủ lên mặt và cổ, vỗ nhẹ để kem thẩm thấu hoàn toàn. Dùng sáng và tối.'
        },
        {
            id: 7,
            name: 'Serum Dưỡng Trắng Moccoon Niacinamide 10%',
            volume: '30ml',
            skin_type: 'Mọi loại da, da không đều màu',
            short_desc: 'Làm sáng đều màu da và thu nhỏ lỗ chân lông',
            desc: 'Chứa 10% Niacinamide tinh khiết kết hợp Rau má tự nhiên.',
            ingredients: 'Niacinamide 10%, Zinc PCA 1%, Chiết xuất Rau má, Arbutin, Allantoin.',
            benefits: '1. Mờ thâm sạm, đều màu da sau 14 ngày.\n2. Kiểm soát dầu nhờn và se khít lỗ chân lông.\n3. Giảm kích ứng và tăng cường sức đề kháng cho da.',
            usage: 'Nhỏ 3-4 giọt serum lên mặt, thoa đều và vỗ nhẹ. Dùng ngày 2 lần sáng và tối trước bước kem dưỡng.'
        }
    ];

    for (const p of products) {
        await pool.request()
            .input('id', sql.Int, p.id)
            .input('name', sql.NVarChar, p.name)
            .input('volume', sql.NVarChar, p.volume)
            .input('skin_type', sql.NVarChar, p.skin_type)
            .input('short_desc', sql.NVarChar, p.short_desc)
            .input('desc', sql.NVarChar, p.desc)
            .input('ingredients', sql.NVarChar, p.ingredients)
            .input('benefits', sql.NVarChar, p.benefits)
            .input('usage', sql.NVarChar, p.usage)
            .query(`
                UPDATE Products 
                SET name = @name, 
                    volume = @volume, 
                    skin_type = @skin_type,
                    short_description = @short_desc, 
                    description = @desc,
                    ingredients = @ingredients, 
                    benefits = @benefits,
                    usage_instructions = @usage
                WHERE id = @id
            `);
    }
    console.log('✓ Bảng Products: Đã chuẩn hóa toàn bộ 6 sản phẩm');
    console.log('=== HOÀN TẤT CHUẨN HÓA FONT CHỮ & DỮ LIỆU UNICODE THÀNH CÔNG ===');
    process.exit(0);
}

repairUnicode().catch(err => {
    console.error('Lỗi khi chuẩn hóa:', err);
    process.exit(1);
});
