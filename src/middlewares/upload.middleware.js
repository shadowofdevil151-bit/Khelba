import multer from 'multer';
import cloudinary from "../config/cloudinary.js";

const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // Strictly under 5MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    },
}).single('avatar');

const profileUpload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith("image/"))
}).single("avatar");

export const handleAvatarUpload = (req, res, next) => {
    profileUpload(req, res, async (err) => {
        if (err) return res.status(400).json({ success: false, message: err.code === "LIMIT_FILE_SIZE" ? "Image must be under 5MB." : "Only image files are allowed." });
        if (!req.file) return next();
        try {
            const result = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream({ folder: "user_profiles", resource_type: "image" },
                    (error, value) => error ? reject(error) : resolve(value));
                stream.end(req.file.buffer);
            });
            req.avatar = { publicId: result.public_id, url: result.secure_url.replace('/upload/', '/upload/f_auto,q_auto/'), mimeType: req.file.mimetype };
            return next();
        } catch { return res.status(502).json({ success: false, message: "Avatar upload failed." }); }
    });
};

export const handleImageUpload = (req, res, next) => {
    upload(req, res, async (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ success: false, message: 'Image must be under 5MB.' });
            }
            return res.status(400).json({ success: false, message: err.message });
        }

        // STRICT REQUIREMENT: Reject the request if no file is present
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Registration failed: Profile image upload is strictly required.'
            });
        }

        try {
            const mimeType = req.file.mimetype;

            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'user_profiles',
                    resource_type: 'image',
                },
                (error, result) => {
                    if (error) {
                        return res.status(500).json({ success: false, message: 'Cloudinary upload failed.', error });
                    }

                    // Passes exactly what your auth.controller.js expects
                    req.avatar = {
                        publicId: result.public_id,
                        url: result.secure_url.replace('/upload/', '/upload/f_auto,q_auto/'),
                        mimeType: mimeType,
                    };

                    next();
                }
            );

            uploadStream.end(req.file.buffer);

        } catch (streamError) {
            return res.status(500).json({ success: false, message: 'Server upload stream error.' });
        }
    });
};
