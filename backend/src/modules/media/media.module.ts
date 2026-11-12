import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity";
import { UploadController } from "./presentation/upload.controller";

@Module({ imports: [IdentityModule], controllers: [UploadController] })
export class MediaModule {}
