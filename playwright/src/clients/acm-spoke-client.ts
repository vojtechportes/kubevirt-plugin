import type { KubernetesResource } from '@/data-models/kubernetes-types';
import type { Page } from '@playwright/test';

import type { ClusterAuthConfig } from './base-client';
import RequestContextClient from './request-context-client';

/** ACM-only adapter; retain the existing client's cookie/CSRF handling. */
export default class AcmSpokeClient extends RequestContextClient {
  constructor(
    page: Page,
    config: ClusterAuthConfig,
    private readonly cluster: string,
  ) {
    super(page, config);
  }

  override async _request(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    path: string,
    extra?: Record<string, unknown>,
  ): Promise<KubernetesResource | null> {
    if (!path.startsWith('/kubernetes/')) {
      throw new Error(`ACM spoke adapter only supports Kubernetes API paths: ${path}`);
    }
    // Matches the installed multicluster SDK's managed-spoke transport.
    return super._request(
      method,
      `/proxy/plugin/mce/console/multicloud/managedclusterproxy/${encodeURIComponent(this.cluster)}${path.slice('/kubernetes'.length)}`,
      extra,
    );
  }
}
