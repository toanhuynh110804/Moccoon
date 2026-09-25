const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const { verifyToken } = require('../middlewares/authMiddleware');

// Hỗ trợ các tên trường file: 'image', 'video', 'media', 'file'
const uploadFields = upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 },
    { name: 'media', maxCount: 1 },
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
        const file = (req.files && (req.files['video']?.[0] || req.files['image']?.[0] || req.files['media']?.[0] || req.files['file']?.[0])) || req.file;
        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn file hình ảnh hoặc video.'
            });
        }

        const isVideo = file.mimetype.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi)$/i.test(file.originalname);
        const mediaType = isVideo ? 'video' : 'image';
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const relativeUrl = `/uploads/${file.filename}`;
        const fullUrl = `${baseUrl}${relativeUrl}`;

        return res.status(200).json({
            success: true,
            message: isVideo ? 'Tải video lên thành công!' : 'Tải ảnh lên thành công!',
            data: {
                filename: file.filename,
                url: relativeUrl,      // Đường dẫn chuẩn lưu vào Database
                full_url: fullUrl,     // URL đầy đủ có domain
                size: file.size,
                mimetype: file.mimetype,
                media_type: mediaType  // 'image' hoặc 'video'
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
