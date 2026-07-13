// HumenAI — Cloudinary Media Manager
// Gère les images, vidéos et fichiers audio/vocaux

import { v2 as cloudinary, UploadApiResponse, UploadApiOptions } from "cloudinary";

// Types de médias supportés par plan
export type MediaType = "image" | "video";

export interface MediaConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export interface UploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  format: string;
  width?: number;
  height?: number;
  duration?: number;
  bytes: number;
  resourceType: MediaType;
}

export interface MediaOptions {
  folder?: string;
  transformation?: string;
  publicId?: string;
}

export class CloudinaryManager {
  private configured: boolean = false;

  constructor(config?: MediaConfig) {
    if (config) {
      this.init(config);
    }
  }

  private toResourceType(type: MediaType): "image" | "video" | "raw" | "auto" {
    return type;
  }

  init(config: MediaConfig) {
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
    });
    this.configured = true;
  }

  initFromEnv() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      this.init({ cloudName, apiKey, apiSecret });
    }
  }

  isConfigured(): boolean {
    return this.configured || !!(process.env.CLOUDINARY_CLOUD_NAME);
  }

  /**
   * Upload un fichier (image, vidéo, audio) vers Cloudinary
   */
  async upload(
    file: string | Buffer,
    type: MediaType,
    options: MediaOptions = {}
  ): Promise<UploadResult> {
    this.initFromEnv();

    const uploadOptions: UploadApiOptions = {
      resource_type: this.toResourceType(type),
      folder: options.folder || `humenai/${type}`,
      ...(options.transformation && { transformation: options.transformation }),
      ...(options.publicId && { public_id: options.publicId }),
      quality: "auto",
      fetch_format: "auto",
    };

    const result: UploadApiResponse = await cloudinary.uploader.upload(
      typeof file === "string" ? file : `data:${this.getMime(type)};base64,${file.toString("base64")}`,
      uploadOptions
    );

    return {
      url: result.url,
      secureUrl: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      duration: result.duration,
      bytes: result.bytes,
      resourceType: type,
    };
  }

  /**
   * Upload depuis une URL distante
   */
  async uploadFromUrl(
    url: string,
    type: MediaType,
    options: MediaOptions = {}
  ): Promise<UploadResult> {
    this.initFromEnv();

    const uploadOptions: UploadApiOptions = {
      resource_type: this.toResourceType(type),
      folder: options.folder || `humenai/${type}`,
      quality: "auto",
      fetch_format: "auto",
    };

    const result: UploadApiResponse = await cloudinary.uploader.upload(url, uploadOptions);
    return {
      url: result.url,
      secureUrl: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      duration: result.duration,
      bytes: result.bytes,
      resourceType: type,
    };
  }

  /**
   * Supprime un fichier
   */
  async delete(publicId: string, type: MediaType = "image"): Promise<boolean> {
    this.initFromEnv();
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: this.toResourceType(type),
    });
    return result.result === "ok";
  }

  /**
   * Génère une URL transformée (redimensionnement, crop, etc.)
   */
  getOptimizedUrl(publicId: string, options: { width?: number; height?: number; crop?: string; quality?: string } = {}): string {
    this.initFromEnv();
    const { width, height, crop = "fill", quality = "auto" } = options;
    let url = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`;
    const transforms = [`q_${quality}`];
    if (width) transforms.push(`w_${width}`);
    if (height) transforms.push(`h_${height}`);
    if (crop) transforms.push(`c_${crop}`);
    url += `/${transforms.join(",")}/${publicId}`;
    return url;
  }

  /**
   * Upload de vocal/audio (plan Premium) avec transcription possible
   */
  async uploadAudio(file: string | Buffer, options: MediaOptions = {}): Promise<UploadResult> {
    const result = await this.upload(file, "video", {
      ...options,
      folder: options.folder || "humenai/audio",
      transformation: "f_auto",
    });
    return result;
  }

  private getMime(type: MediaType): string {
    switch (type) {
      case "image": return "image/jpeg";
      case "video": return "video/mp4";
      case "audio": return "audio/mp3";
    }
  }
}

// Export singleton
export const cloudinaryManager = new CloudinaryManager();
