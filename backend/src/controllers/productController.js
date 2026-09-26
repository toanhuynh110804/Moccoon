const { getPool, sql } = require('../config/db');

// 1. Lấy danh sách sản phẩm (có tìm kiếm, lọc theo danh mục, lọc sản phẩm chủ lực)
exports.getProducts = async (req, res) => {
    try {
        const { category_id, is_featured, search, sort, page = 1, limit = 20, all } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const pool = await getPool();
        const request = pool.request();

        let whereConditions = [];
        if (all !== 'true') {
            whereConditions.push('p.is_active = 1');
        }

        if (category_id) {
            whereConditions.push('p.category_id = @category_id');
            request.input('category_id', sql.Int, parseInt(category_id));
        }

        if (is_featured !== undefined) {
            whereConditions.push('p.is_featured = @is_featured');
            request.input('is_featured', sql.Bit, is_featured === 'true' || is_featured === '1' ? 1 : 0);
        }

        if (search) {
            whereConditions.push('(p.name LIKE @search OR p.short_description LIKE @search)');
            request.input('search', sql.NVarChar, `%${search}%`);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        let orderClause = 'ORDER BY p.created_at DESC, p.id DESC';
        if (sort === 'featured') orderClause = 'ORDER BY p.is_featured DESC, p.created_at DESC';
        if (sort === 'price_asc') orderClause = 'ORDER BY p.price ASC';
        if (sort === 'price_desc') orderClause = 'ORDER BY p.price DESC';
        if (sort === 'newest') orderClause = 'ORDER BY p.created_at DESC';

        const query = `
            SELECT 
                p.id, p.category_id, p.name, p.slug, p.price, p.original_price, 
                p.stock_quantity, p.volume, p.skin_type, p.short_description, 
                p.is_featured, p.is_active, p.created_at,
                c.name AS category_name, c.slug AS category_slug,
                (
                    SELECT TOP 1 image_url 
                    FROM ProductImages pi 
                    WHERE pi.product_id = p.id 
                    ORDER BY pi.is_primary DESC, pi.sort_order ASC
                ) AS primary_image
            FROM Products p
            LEFT JOIN Categories c ON p.category_id = c.id
            ${whereClause}
            ${orderClause}
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

            SELECT COUNT(*) AS total
            FROM Products p
            ${whereClause};
        `;

        request.input('offset', sql.Int, offset);
        request.input('limit', sql.Int, parseInt(limit));

        const result = await request.query(query);

        return res.status(200).json({
            success: true,
            data: {
                products: result.recordsets[0],
                total: result.recordsets[1][0].total,
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('getProducts error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách sản phẩm.', error: error.message });
    }
};

// 2. Chi tiết sản phẩm theo ID hoặc Slug (bao gồm album ảnh chi tiết, thành phần, công dụng, HDSD)
exports.getProductDetail = async (req, res) => {
    try {
        const { identifier } = req.params;
        const pool = await getPool();
        const request = pool.request();

        let condition = 'p.slug = @identifier';
        if (!isNaN(identifier)) {
            condition = '(p.id = @identifierNum OR p.slug = @identifier)';
            request.input('identifierNum', sql.Int, parseInt(identifier));
        }
        request.input('identifier', sql.VarChar, identifier);

        const query = `
            SELECT 
                p.*,
                c.name AS category_name,
                c.slug AS category_slug
            FROM Products p
            LEFT JOIN Categories c ON p.category_id = c.id
            WHERE ${condition};

            SELECT pi.id, pi.image_url, pi.is_primary, pi.sort_order
            FROM ProductImages pi
            INNER JOIN Products p ON pi.product_id = p.id
            WHERE ${condition}
            ORDER BY pi.is_primary DESC, pi.sort_order ASC;
        `;

        const result = await request.query(query);

        if (result.recordsets[0].length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm.' });
        }

        const product = result.recordsets[0][0];
        product.images = result.recordsets[1];

        return res.status(200).json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error('getProductDetail error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi tải thông tin sản phẩm.', error: error.message });
    }
};

// 3. Admin: Thêm sản phẩm mới
exports.createProduct = async (req, res) => {
    try {
        const {
            category_id, name, slug, price, original_price, stock_quantity,
            volume, skin_type, short_description, description,
            ingredients, benefits, usage_instructions, is_featured, images
        } = req.body;

        if (!name || !price) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp đầy đủ Tên sản phẩm và Giá bán hợp lệ.'
            });
        }

        const safePrice = parseFloat(price);
        if (isNaN(safePrice) || safePrice <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Giá bán sản phẩm không hợp lệ.'
            });
        }

        const pool = await getPool();

        // Kiểm tra và bảo vệ category_id hợp lệ
        let safeCategoryId = parseInt(category_id) || 1;
        const checkCat = await pool.request()
            .input('catId', sql.Int, safeCategoryId)
            .query('SELECT id FROM Categories WHERE id = @catId');
        if (checkCat.recordset.length === 0) {
            safeCategoryId = 1;
        }
        
        // Đảm bảo slug luôn hợp lệ và không trùng lặp trong CSDL SQL Server
        let safeSlug = slug ? slug.trim() : '';
        if (!safeSlug) {
            safeSlug = 'san-pham-' + Date.now();
        }
        const checkSlug = await pool.request()
            .input('slug', sql.VarChar, safeSlug)
            .query('SELECT id FROM Products WHERE slug = @slug');
        if (checkSlug.recordset.length > 0) {
            safeSlug = `${safeSlug}-${Date.now().toString().slice(-4)}`;
        }

        const insertQuery = `
            INSERT INTO Products (
                category_id, name, slug, price, original_price, stock_quantity,
                volume, skin_type, short_description, description,
                ingredients, benefits, usage_instructions, is_featured, is_active
            )
            OUTPUT INSERTED.*
            VALUES (
                @category_id, @name, @slug, @price, @original_price, @stock_quantity,
                @volume, @skin_type, @short_description, @description,
                @ingredients, @benefits, @usage_instructions, @is_featured, 1
            )
        `;

        const result = await pool.request()
            .input('category_id', sql.Int, safeCategoryId)
            .input('name', sql.NVarChar, name)
            .input('slug', sql.VarChar, safeSlug)
            .input('price', sql.Decimal(18, 2), safePrice)
            .input('original_price', sql.Decimal(18, 2), original_price || null)
            .input('stock_quantity', sql.Int, stock_quantity || 0)
            .input('volume', sql.NVarChar, volume || null)
            .input('skin_type', sql.NVarChar, skin_type || null)
            .input('short_description', sql.NVarChar(sql.MAX), short_description || null)
            .input('description', sql.NVarChar(sql.MAX), description || null)
            .input('ingredients', sql.NVarChar(sql.MAX), ingredients || null)
            .input('benefits', sql.NVarChar(sql.MAX), benefits || null)
            .input('usage_instructions', sql.NVarChar(sql.MAX), usage_instructions || null)
            .input('is_featured', sql.Bit, is_featured ? 1 : 0)
            .query(insertQuery);

        const newProduct = result.recordset[0];

        // Lưu danh sách ảnh vào bảng ProductImages
        let imageList = [];
        if (images && Array.isArray(images) && images.length > 0) {
            imageList = images.map((img, idx) => ({
                url: typeof img === 'string' ? img : (img.image_url || img.url),
                is_primary: idx === 0 ? 1 : (img.is_primary ? 1 : 0),
                sort_order: img.sort_order || (idx + 1)
            }));
        } else if (req.body.image_url || req.body.primary_image) {
            const singleImg = req.body.image_url || req.body.primary_image;
            imageList.push({ url: singleImg, is_primary: 1, sort_order: 1 });
        }

        for (const img of imageList) {
            if (img.url && img.url.trim() !== '') {
                await pool.request()
                    .input('product_id', sql.Int, newProduct.id)
                    .input('image_url', sql.NVarChar, img.url.trim())
                    .input('is_primary', sql.Bit, img.is_primary)
                    .input('sort_order', sql.Int, img.sort_order)
                    .query('INSERT INTO ProductImages (product_id, image_url, is_primary, sort_order) VALUES (@product_id, @image_url, @is_primary, @sort_order)');
            }
        }

        newProduct.primary_image = imageList.length > 0 ? imageList[0].url : null;

        return res.status(201).json({
            success: true,
            message: 'Thêm sản phẩm thành công!',
            data: newProduct
        });
    } catch (error) {
        console.error('createProduct error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi thêm sản phẩm.', error: error.message });
    }
};

// 4. Admin: Chỉnh sửa thông tin sản phẩm
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            category_id, name, slug, price, original_price, stock_quantity,
            volume, skin_type, short_description, description,
            ingredients, benefits, usage_instructions, is_featured, is_active,
            images, image_url, primary_image
        } = req.body;

        const pool = await getPool();
        const updateQuery = `
            UPDATE Products
            SET category_id = COALESCE(@category_id, category_id),
                name = COALESCE(@name, name),
                slug = COALESCE(@slug, slug),
                price = COALESCE(@price, price),
                original_price = COALESCE(@original_price, original_price),
                stock_quantity = COALESCE(@stock_quantity, stock_quantity),
                volume = COALESCE(@volume, volume),
                skin_type = COALESCE(@skin_type, skin_type),
                short_description = COALESCE(@short_description, short_description),
                description = COALESCE(@description, description),
                ingredients = COALESCE(@ingredients, ingredients),
                benefits = COALESCE(@benefits, benefits),
                usage_instructions = COALESCE(@usage_instructions, usage_instructions),
                is_featured = COALESCE(@is_featured, is_featured),
                is_active = COALESCE(@is_active, is_active),
                updated_at = GETDATE()
            OUTPUT INSERTED.*
            WHERE id = @id
        `;

        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('category_id', sql.Int, category_id || null)
            .input('name', sql.NVarChar, name || null)
            .input('slug', sql.VarChar, slug || null)
            .input('price', sql.Decimal(18, 2), price !== undefined ? price : null)
            .input('original_price', sql.Decimal(18, 2), original_price !== undefined ? original_price : null)
            .input('stock_quantity', sql.Int, stock_quantity !== undefined ? stock_quantity : null)
            .input('volume', sql.NVarChar, volume || null)
            .input('skin_type', sql.NVarChar, skin_type || null)
            .input('short_description', sql.NVarChar(sql.MAX), short_description || null)
            .input('description', sql.NVarChar(sql.MAX), description || null)
            .input('ingredients', sql.NVarChar(sql.MAX), ingredients || null)
            .input('benefits', sql.NVarChar(sql.MAX), benefits || null)
            .input('usage_instructions', sql.NVarChar(sql.MAX), usage_instructions || null)
            .input('is_featured', sql.Bit, is_featured !== undefined ? is_featured : null)
            .input('is_active', sql.Bit, is_active !== undefined ? is_active : null)
            .query(updateQuery);

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm.' });
        }

        // Cập nhật ảnh nếu có truyền vào
        let imageList = [];
        if (images && Array.isArray(images) && images.length > 0) {
            imageList = images.map((img, idx) => ({
                url: typeof img === 'string' ? img : (img.image_url || img.url),
                is_primary: idx === 0 ? 1 : (img.is_primary ? 1 : 0),
                sort_order: img.sort_order || (idx + 1)
            }));
        } else if (image_url || primary_image) {
            const singleImg = image_url || primary_image;
            imageList.push({ url: singleImg, is_primary: 1, sort_order: 1 });
        }

        if (imageList.length > 0) {
            // Xóa ảnh cũ và chèn ảnh mới
            await pool.request()
                .input('product_id', sql.Int, id)
                .query('DELETE FROM ProductImages WHERE product_id = @product_id');

            for (const img of imageList) {
                if (img.url && img.url.trim() !== '') {
                    await pool.request()
                        .input('product_id', sql.Int, id)
                        .input('image_url', sql.NVarChar, img.url.trim())
                        .input('is_primary', sql.Bit, img.is_primary)
                        .input('sort_order', sql.Int, img.sort_order)
                        .query('INSERT INTO ProductImages (product_id, image_url, is_primary, sort_order) VALUES (@product_id, @image_url, @is_primary, @sort_order)');
                }
            }
        }

        const updatedProduct = result.recordset[0];
        if (imageList.length > 0) {
            updatedProduct.primary_image = imageList[0].url;
        }

        return res.status(200).json({
            success: true,
            message: 'Cập nhật sản phẩm thành công!',
            data: updatedProduct
        });
    } catch (error) {
        console.error('updateProduct error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật sản phẩm.', error: error.message });
    }
};

// 5. Admin: Xóa sản phẩm
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();

        // Kiểm tra sản phẩm có tồn tại không
        const checkProd = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT id, name FROM Products WHERE id = @id');

        if (checkProd.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm cần xóa.' });
        }

        const productName = checkProd.recordset[0].name;

        // Kiểm tra xem sản phẩm đã từng phát sinh trong đơn hàng của khách chưa
        const checkOrders = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT COUNT(*) AS order_count FROM OrderItems WHERE product_id = @id');

        const orderCount = checkOrders.recordset[0]?.order_count || 0;

        if (orderCount === 0) {
            // Sản phẩm chưa từng có đơn hàng -> Xóa sạch hoàn toàn khỏi CSDL
            const transaction = new sql.Transaction(pool);
            await transaction.begin();
            try {
                const reqTrans = new sql.Request(transaction);
                reqTrans.input('id', sql.Int, id);

                await reqTrans.query(`
                    DELETE FROM Favorites WHERE product_id = @id;
                    DELETE FROM CartItems WHERE product_id = @id;
                    DELETE FROM ProductImages WHERE product_id = @id;
                    DELETE FROM ProductReviews WHERE product_id = @id;
                    DELETE FROM Products WHERE id = @id;
                `);

                await transaction.commit();

                return res.status(200).json({
                    success: true,
                    message: `Đã xóa vĩnh viễn sản phẩm "${productName}" khỏi hệ thống thành công!`
                });
            } catch (tErr) {
                await transaction.rollback();
                throw tErr;
            }
        } else {
            // Sản phẩm đã có đơn hàng -> Gỡ khỏi giỏ hàng/yêu thích và ẩn vĩnh viễn để bảo toàn lịch sử hóa đơn
            await pool.request()
                .input('id', sql.Int, id)
                .query(`
                    DELETE FROM CartItems WHERE product_id = @id;
                    DELETE FROM Favorites WHERE product_id = @id;
                    UPDATE Products SET is_active = 0, stock_quantity = 0, updated_at = GETDATE() WHERE id = @id;
                `);

            return res.status(200).json({
                success: true,
                message: `Sản phẩm "${productName}" đã phát sinh trong đơn hàng của khách nên đã được xóa và ẩn khỏi toàn bộ cửa hàng để lưu vết lịch sử đơn hàng.`
            });
        }
    } catch (error) {
        console.error('deleteProduct error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi khi xóa sản phẩm.', error: error.message });
    }
};
