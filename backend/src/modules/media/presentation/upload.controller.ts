import { BadRequestException, Controller, Inject, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { AdminGuard } from "../../identity";
import { STORAGE, type Storage } from "../../../shared/application/storage.port";
import { ALLOWED_UPLOAD_TYPES } from "../../../shared/infrastructure/storage/local-storage.service";

const MAX_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 50) * 1024 * 1024;

/** Product media upload (multipart field `file`). Returns `{ success, url }` like v1. */
@Controller("admin/upload")
@UseGuards(AdminGuard)
export class UploadController {
  constructor(@Inject(STORAGE) private readonly storage: Storage) {}

  @Post()
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1 } }))
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file provided");
    if (!ALLOWED_UPLOAD_TYPES.includes(file.mimetype)) throw new BadRequestException(`Unsupported file type ${file.mimetype}`);
    const { url } = await this.storage.put("product", file.buffer, file.mimetype);
    return { success: true, url };
  }
}
