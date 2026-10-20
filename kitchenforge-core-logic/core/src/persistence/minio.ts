/**
 * MinIO / S3-compatible Object Storage Adapter
 * Stores heavy assets: textures, scan packages, render outputs, PDF brochures, catalogs.
 * Client never talks to MinIO directly for write – only signed URLs or server-mediated.
 */

export interface MinioConfig {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
}

export interface ObjectMeta {
  key: string;
  size: number;
  etag: string;
  lastModified: Date;
  contentType?: string;
}

/**
 * Minimal interface so we can swap the real MinIO client.
 * In production use the official `minio` package.
 */
export interface ObjectStore {
  putObject(key: string, data: Buffer | Uint8Array | string, contentType?: string): Promise<ObjectMeta>;
  getObject(key: string): Promise<Buffer>;
  getSignedUrl(key: string, expirySeconds?: number): Promise<string>;
  deleteObject(key: string): Promise<void>;
  listObjects(prefix: string): Promise<ObjectMeta[]>;
}

export class MinioStore implements ObjectStore {
  constructor(
    private client: {
      putObject: (bucket: string, key: string, data: any, size?: number, meta?: any) => Promise<any>;
      getObject: (bucket: string, key: string) => Promise<NodeJS.ReadableStream>;
      presignedGetObject: (bucket: string, key: string, expiry: number) => Promise<string>;
      removeObject: (bucket: string, key: string) => Promise<void>;
      listObjects: (bucket: string, prefix: string, recursive: boolean) => NodeJS.ReadableStream;
    },
    private bucket: string
  ) {}

  async putObject(
    key: string,
    data: Buffer | Uint8Array | string,
    contentType = "application/octet-stream"
  ): Promise<ObjectMeta> {
    const buffer = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
    const result = await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      "Content-Type": contentType,
    });
    return {
      key,
      size: buffer.length,
      etag: result.etag ?? "",
      lastModified: new Date(),
      contentType,
    };
  }

  async getObject(key: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucket, key);
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });
  }

  async getSignedUrl(key: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, expirySeconds);
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }

  async listObjects(prefix: string): Promise<ObjectMeta[]> {
    const stream = this.client.listObjects(this.bucket, prefix, true);
    const objects: ObjectMeta[] = [];
    return new Promise((resolve, reject) => {
      stream.on("data", (obj: any) => {
        objects.push({
          key: obj.name,
          size: obj.size,
          etag: obj.etag,
          lastModified: obj.lastModified,
        });
      });
      stream.on("end", () => resolve(objects));
      stream.on("error", reject);
    });
  }
}

/** Standard key prefixes used across the platform */
export const StorageKeys = {
  scan: (projectId: string, assetId: string) => `scans/${projectId}/${assetId}`,
  render: (projectId: string, jobId: string) => `renders/${projectId}/${jobId}`,
  texture: (materialId: string, variant: string) => `textures/${materialId}/${variant}`,
  catalog: (vendorId: string, sku: string) => `catalogs/${vendorId}/${sku}`,
  brochure: (projectId: string, templateId: string) => `brochures/${projectId}/${templateId}`,
  projectFile: (projectId: string, version: number) => `projects/${projectId}/v${version}.json`,
};
