import cloudinary from '@/storage/storage';

export class Cloudinary {
    static async uploadImage(filePath: string) {
        try {
            const result = await cloudinary.uploader.upload(filePath);
            return {
                url: result.secure_url,
                public_id: result.public_id,
            };
        } catch (error: any) {
            throw new Error('Failed to upload image to Cloudinary' + error.message);
        }
    }
    static async deleteImage(publicId: string) {
        try {
            await cloudinary.uploader.destroy(publicId);
        } catch (error) {
            throw new Error('Failed to delete image from Cloudinary');
        }
    }
    static async deleteImages(publicIds: string[]) {
        try {
            await Promise.all(publicIds.map((publicId) => cloudinary.uploader.destroy(publicId)));
        } catch (error) {
            throw new Error('Failed to delete images from Cloudinary');
        }
    }
    static async updateImage(filePath: string, publicId: string) {
        try {
            const result = await cloudinary.uploader.upload(filePath, {
                public_id: publicId,
                overwrite: true,
            });
            return {
                url: result.secure_url,
                public_id: result.public_id,
            };
        } catch (error) {
            throw new Error('Failed to update image on Cloudinary');
        }
    }
}