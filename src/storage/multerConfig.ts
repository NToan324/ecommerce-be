import multer from 'multer';
import path from 'path';

// Cấu hình lưu trữ file
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Thư mục lưu trữ file
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + path.extname(file.originalname);
        cb(null, `${uniqueSuffix}`);
    },
});

// Bộ lọc file (chỉ chấp nhận ảnh)
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images are allowed.'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 1024 * 1024 }, // Giới hạn kích thước file (1MB)
});

export default upload;