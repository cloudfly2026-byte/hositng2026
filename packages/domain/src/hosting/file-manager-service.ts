import { AuthorizedContext } from '@cloudfly/contracts';
import { HestiaTransport } from './hosting-management';

export class PathTraversalError extends Error {
  constructor(path: string) {
    super(`Access denied: path traversal detected in '${path}'`);
    this.name = 'PathTraversalError';
  }
}

export class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

export class FileNotFoundError extends Error {
  constructor(path: string) {
    super(`File '${path}' was not found.`);
    this.name = 'FileNotFoundError';
  }
}

export class DirectoryNotFoundError extends Error {
  constructor(path: string) {
    super(`Directory '${path}' was not found.`);
    this.name = 'DirectoryNotFoundError';
  }
}

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  sizeBytes: number;
  permissions: string;
  mimeType?: string;
  organizationId: string;
  updatedAt: Date;
}

export interface FileManagerOptions {
  maxUploadSizeBytes?: number;
  tenantQuotaBytes?: number;
}

export class FileManagerService {
  private fileSystem: Map<string, FileNode> = new Map(); // key = `${orgId}:${normalizedPath}`
  private orgUsageBytes: Map<string, number> = new Map();

  private readonly maxUploadSizeBytes: number;
  private readonly tenantQuotaBytes: number;

  constructor(
    _transport?: HestiaTransport,
    options?: FileManagerOptions
  ) {
    this.maxUploadSizeBytes = options?.maxUploadSizeBytes || 25 * 1024 * 1024; // 25 MB
    this.tenantQuotaBytes = options?.tenantQuotaBytes || 1024 * 1024 * 1024; // 1 GB
  }

  private normalizeAndValidatePath(rawPath: string): string {
    if (!rawPath || typeof rawPath !== 'string') return '';
    let p = rawPath.replace(/\\/g, '/').trim();

    // Check for absolute path targeting root directly or traversal
    if (p.startsWith('/') && !p.startsWith('/public_html') && !p.startsWith('/logs') && !p.startsWith('/backups')) {
      throw new PathTraversalError(rawPath);
    }

    // Remove leading slashes
    while (p.startsWith('/')) {
      p = p.substring(1);
    }

    // Traversal check
    const segments = p.split('/').filter(Boolean);
    const resolved: string[] = [];

    for (const seg of segments) {
      if (seg === '.' || seg === '') continue;
      if (seg === '..') {
        throw new PathTraversalError(rawPath);
      }
      if (seg.includes(':') || seg.includes('\0')) {
        throw new PathTraversalError(rawPath);
      }
      resolved.push(seg);
    }

    return resolved.join('/');
  }

  async listFiles(dirPath: string, context: AuthorizedContext): Promise<FileNode[]> {
    const cleanDir = this.normalizeAndValidatePath(dirPath);
    const orgId = context.organizationId;

    // Filter nodes belonging to org that are direct children of cleanDir
    const results: FileNode[] = [];
    const prefix = `${orgId}:`;

    for (const [key, node] of this.fileSystem.entries()) {
      if (!key.startsWith(prefix)) continue;
      if (node.organizationId !== orgId) continue;

      const parent = node.path.includes('/')
        ? node.path.substring(0, node.path.lastIndexOf('/'))
        : '';

      if (parent === cleanDir) {
        results.push(node);
      }
    }

    // If empty and default root, provide initial default standard folders for hosting
    if (results.length === 0 && cleanDir === '') {
      const defaultFolders = ['public_html', 'logs', 'backups'];
      for (const f of defaultFolders) {
        const folderNode: FileNode = {
          id: `dir-${orgId}-${f}`,
          name: f,
          path: f,
          type: 'folder',
          sizeBytes: 0,
          permissions: f === 'public_html' ? '0755' : '0750',
          organizationId: orgId,
          updatedAt: new Date(),
        };
        this.fileSystem.set(`${orgId}:${f}`, folderNode);
        results.push(folderNode);
      }
    }

    return results;
  }

  async createDirectory(dirPath: string, context: AuthorizedContext): Promise<FileNode> {
    const cleanPath = this.normalizeAndValidatePath(dirPath);
    if (!cleanPath) {
      throw new PathTraversalError(dirPath);
    }

    const orgId = context.organizationId;
    const name = cleanPath.split('/').pop() || cleanPath;

    const node: FileNode = {
      id: `dir-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      path: cleanPath,
      type: 'folder',
      sizeBytes: 0,
      permissions: '0755',
      organizationId: orgId,
      updatedAt: new Date(),
    };

    this.fileSystem.set(`${orgId}:${cleanPath}`, node);
    return node;
  }

  async uploadFile(
    filePath: string,
    content: Buffer,
    mimeType: string,
    context: AuthorizedContext
  ): Promise<FileNode> {
    const cleanPath = this.normalizeAndValidatePath(filePath);
    if (!cleanPath) {
      throw new PathTraversalError(filePath);
    }

    if (content.length > this.maxUploadSizeBytes) {
      throw new QuotaExceededError(
        `File size (${content.length} bytes) exceeds maximum allowed upload size (${this.maxUploadSizeBytes} bytes).`
      );
    }

    const orgId = context.organizationId;
    const currentUsage = this.orgUsageBytes.get(orgId) || 0;

    if (currentUsage + content.length > this.tenantQuotaBytes) {
      throw new QuotaExceededError(
        `Organization storage quota exceeded. Allowed: ${this.tenantQuotaBytes} bytes, Used: ${currentUsage + content.length} bytes.`
      );
    }

    const name = cleanPath.split('/').pop() || cleanPath;

    const node: FileNode = {
      id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      path: cleanPath,
      type: 'file',
      sizeBytes: content.length,
      permissions: '0644',
      mimeType,
      organizationId: orgId,
      updatedAt: new Date(),
    };

    this.fileSystem.set(`${orgId}:${cleanPath}`, node);
    this.orgUsageBytes.set(orgId, currentUsage + content.length);

    return node;
  }
}
