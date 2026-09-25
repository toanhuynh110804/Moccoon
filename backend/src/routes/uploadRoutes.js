const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const { verifyToken } = require('../middlewares/authMiddleware');

// Hỗ trợ cả 2 tên trường file: 'image' hoặc 'file'
const uploadFields = upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'file', maxCount: 1 }
]);

router.post('/', verifyToken, (req, res, next) => {
    uploadFields(req, res, (err) => {
        if (err) {
            return res.status(400).json({
                success: false,
                message: err.message || 'Lỗi xử lý file tải lên.'
            });
        }
        next();
    });
}, (req, res) => {
    try {
        const file = (req.files && (req.files['image']?.[0] || req.files['file']?.[0])) || req.file;
        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn file hình ảnh (JPG, PNG, WEBP, GIF).'
            });
        }

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const relativeUrl = `/uploads/${file.filename}`;
        const fullUrl = `${baseUrl}${relativeUrl}`;

        return res.status(200).json({
            success: true,
            message: 'Tải ảnh sản phẩm lên thành công!',
            data: {
                filename: file.filename,
                url: relativeUrl,      // Đường dẫn chuẩn lưu vào Database
                full_url: fullUrl,     // URL đầy đủ có domain
                size: file.size,
                mimetype: file.mimetype
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi tải file ảnh lên máy chủ.',
            error: error.message
        });
    }
});

module.exports = router;
