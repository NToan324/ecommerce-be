import { CreatedResponse } from "@/core/success.response";
import { Cloudinary } from "@/helpers/uploadImageToCloudinary";
import fs from "fs";
export class UploadService {

    static async uploadImage(image: string, public_id?: string) {
        var uploadedImage;
        if (!public_id) {
            uploadedImage = await Cloudinary.uploadImage(image);
        } else {
            uploadedImage = await Cloudinary.updateImage(image, public_id);
        }
        fs.unlinkSync(image);
        return new CreatedResponse('Tải ảnh lên thành công', uploadedImage)
    }
}