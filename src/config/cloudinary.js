import { v2 as cloudinary } from 'cloudinary';
import { storageConfig } from './env.js';

cloudinary.config({
    cloud_name: storageConfig.cloudinary.cloudName,
    api_key: storageConfig.cloudinary.apiKey,
    api_secret: storageConfig.cloudinary.apiSecret,
});

export default cloudinary;
