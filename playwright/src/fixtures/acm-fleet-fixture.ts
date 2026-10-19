import AcmSpokeClient from '@/clients/acm-spoke-client';
import { ACM_FEATURE, ACM_TAG } from '@/data-models/allure-constants';
import AcmFleetPage from '@/page-objects/vm/acm-fleet-page';
import { withAllure } from '@/utils/allure';
import { EnvVariables } from '@/utils/env-variables';

import { fleetData, type FleetData, FleetResources } from './acm-fleet-data';
import { expect, test as vmListTest } from './vm-list-fixture';

export { expect };

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value)
    throw new Error(
      `ACM baseline prerequisite missing: set ${name}. See acm-fleet-baseline.spec.md.`,
    );
  return value;
};

export const test = vmListTest.extend<{ fleetPage: AcmFleetPage }, { fleet: FleetData }>({
  // The inherited check waits for a local TEST_NS and can run its local janitor.
  // This suite instead preflights both spokes and owns its fresh namespaces there.
  _autoResourceCheck: async ({}, use) => {
    await use();
  },
  fleet: [
    async ({ _workerContext, apiClient }, use, workerInfo) => {
      if (workerInfo.project.name !== 'ACM') {
        throw new Error(
          'Run ACM baseline with --config=playwright/acm.playwright.config.ts to isolate resource cleanup.',
        );
      }
      expect(required('ON_ACM'), 'ACM baseline requires ON_ACM=1').toBe('1');
      const clusters = [required('ACM_SPOKE_A'), required('ACM_SPOKE_B')];
      if (clusters[0] === clusters[1])
        throw new Error('ACM_SPOKE_A and ACM_SPOKE_B must identify distinct managed spokes.');
      for (const cluster of clusters) {
        if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(cluster))
          throw new Error(`Invalid ACM managed cluster name: ${cluster}`);
      }
      const page = await _workerContext.newPage();
      const data = fleetData(clusters);
      const resources = new FleetResources();
      try {
        await page.goto(EnvVariables.webConsoleUrl);
        const auth = {
          baseUrl: EnvVariables.webConsoleUrl.replace(/\/$/, ''),
          username: EnvVariables.username,
          password: EnvVariables.password,
        };
        const clients = new Map<string, AcmSpokeClient>();
        // Read every prerequisite before creating anything on either spoke.
        for (const cluster of clusters) {
          try {
            const managed = await apiClient.getResource(
              'cluster.open-cluster-management.io',
              'v1',
              'managedclusters',
              cluster,
            );
            expect(
              managed,
              `ManagedCluster ${cluster} must exist and be readable on the hub`,
            ).toBeTruthy();
            expect(
              managed?.metadata?.labels?.['local-cluster'],
              `${cluster} must be a remote spoke`,
            ).not.toBe('true');
            expect(
              managed?.metadata?.labels?.['feature.open-cluster-management.io/addon-cluster-proxy'],
              `${cluster} needs the available cluster-proxy add-on`,
            ).toBe('available');
            expect(managed?.status?.conditions).toEqual(
              expect.arrayContaining([
                expect.objectContaining({
                  type: 'ManagedClusterConditionAvailable',
                  status: 'True',
                }),
              ]),
            );
            const client = new AcmSpokeClient(page, auth, cluster);
            await client.listResources('', 'v1', 'namespaces');
            await client.listResources('kubevirt.io', 'v1', 'virtualmachines');
            clients.set(cluster, client);
          } catch (error) {
            throw new Error(
              `ACM prerequisite failed for ${cluster}: check VPN, hub session, RBAC, cluster-proxy and CNV. ${String(error)}`,
            );
          }
        }
        console.info(`ACM baseline resources: ${JSON.stringify(data)}`);
        await resources.create(data, clients);
        await use(data);
      } finally {
        try {
          await resources.cleanup(data.run);
        } finally {
          await page.close();
        }
      }
    },
    { scope: 'worker', timeout: 480_000 },
  ],

  fleetPage: async ({ page, fleet }, use, testInfo) => {
    await withAllure({ suite: 'ACM Fleet baseline', feature: ACM_FEATURE, tags: [ACM_TAG] });
    await testInfo.attach('acm-baseline-resources', {
      body: JSON.stringify(fleet, null, 2),
      contentType: 'application/json',
    });
    const fleetPage = new AcmFleetPage(page);
    await fleetPage.openFleet();
    await use(fleetPage);
  },
});
