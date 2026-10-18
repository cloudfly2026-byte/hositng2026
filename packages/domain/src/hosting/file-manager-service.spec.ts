import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  FileManagerService,
  PathTraversalError,
  QuotaExceededError,
  FileNotFoundError,
  DirectoryNotFoundError,
  FileNode,
} from './file-manager-service';
import { AuthorizedContext } from '@cloudfly/contracts';
import { CrossTenantViolationError } from '../identity/rbac';

describe('FileManagerService (Tenant-Isolated Secure File Manager)', () => {
  let service: FileManagerService;
  let mockHestiaTransport: any;

  const tenantAContext: AuthorizedContext = {
    userId: 'usr-tenant-a',
    organizationId: 'org-tenant-a',
    roles: ['DEVELOPER'],
    permissions: ['files.manage'],
  };

  const tenantBContext: AuthorizedContext = {
    userId: 'usr-tenant-b',
    organizationId: 'org-tenant-b',
    roles: ['DEVELOPER'],
    permissions: ['files.manage'],
  };

  beforeEach(() => {
    mockHestiaTransport = {
      executeCommand: vi.fn().mockImplementation(async (command: string, args: string[]) => {
        return { returnCode: 0, output: 'Success' };
      }),
    };

    service = new FileManagerService(mockHestiaTransport, {
      maxUploadSizeBytes: 10 * 1024 * 1024, // 10MB limit per file
      tenantQuotaBytes: 100 * 1024 * 1024, // 100MB quota
    });
  });

  describe('Path Traversal and Security Validations', () => {
    it('blocks directory traversal attempts in listing and operations', async () => {
      await expect(service.listFiles('../../etc', tenantAContext)).rejects.toThrow(
        PathTraversalError
      );
      await expect(service.listFiles('/etc/passwd', tenantAContext)).rejects.toThrow(
        PathTraversalError
      );
      await expect(service.listFiles('public_html/../../../root', tenantAContext)).rejects.toThrow(
        PathTraversalError
      );
    });

    it('creates folders strictly within tenant root', async () => {
      const folder = await service.createDirectory('public_html/assets', tenantAContext);
      expect(folder.name).toBe('assets');
      expect(folder.path).toBe('public_html/assets');
      expect(folder.type).toBe('folder');
      expect(folder.organizationId).toBe('org-tenant-a');
    });

    it('prevents folder creation with invalid or traversal characters', async () => {
      await expect(
        service.createDirectory('../bad_folder', tenantAContext)
      ).rejects.toThrow(PathTraversalError);
    });
  });

  describe('File Upload, Quota, and Storage', () => {
    it('uploads file within limits, updating used quota and tenant isolation', async () => {
      const fileData = Buffer.from('console.log("Velupi Cloud");');
      const uploaded = await service.uploadFile(
        'public_html/app.js',
        fileData,
        'application/javascript',
        tenantAContext
      );

      expect(uploaded.name).toBe('app.js');
      expect(uploaded.sizeBytes).toBe(fileData.length);
      expect(uploaded.organizationId).toBe('org-tenant-a');

      // Verify file appears in directory listing
      const items = await service.listFiles('public_html', tenantAContext);
      expect(items.some((i) => i.name === 'app.js')).toBe(true);
    });

    it('rejects upload exceeding max file size limit', async () => {
      const hugeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      await expect(
        service.uploadFile('public_html/huge.zip', hugeBuffer, 'application/zip', tenantAContext)
      ).rejects.toThrow(QuotaExceededError);
    });

    it('enforces strict cross-tenant isolation', async () => {
      await service.createDirectory('public_html/secret-a', tenantAContext);

      // Tenant B listing same virtual path should not see Tenant A files
      const itemsB = await service.listFiles('public_html', tenantBContext);
      expect(itemsB.some((i) => i.name === 'secret-a')).toBe(false);
    });
  });
});
