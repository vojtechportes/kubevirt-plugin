import { randomUUID } from 'crypto';

import { load } from 'js-yaml';

import type AcmSpokeClient from '@/clients/acm-spoke-client';
import { VirtualMachineFactory } from '@/data-factories/virtual-machine-factory';
import type { KubernetesResource } from '@/data-models/kubernetes-types';
import { expect } from '@playwright/test';

export const ACM_OWNER_LABEL = 'e2e.kubevirt.io/acm-baseline';

export type FleetVM = {
  cluster: string;
  namespace: string;
  name: string;
  cores: number;
  memory: string;
  description: string;
  uid?: string;
};

export function fleetData(clusters: string[]) {
  const run = `acm-${randomUUID().slice(0, 8)}`;
  const namespaces = [`${run}-one`, `${run}-two`];
  const vm = (cluster: string, project: number, suffix: string, cores: number): FleetVM => ({
    cluster,
    namespace: namespaces[project],
    name: `${run}-${suffix}`,
    cores,
    memory: cores === 1 ? '256Mi' : '512Mi',
    description: `${run} live resource on ${cluster}, project ${project + 1}`,
  });
  return {
    run,
    clusters,
    namespaces,
    vms: [
      vm(clusters[0], 0, 'shared', 1),
      vm(clusters[0], 1, 'only-a', 1),
      vm(clusters[1], 0, 'shared', 2),
      vm(clusters[1], 0, 'marker-b', 2),
      vm(clusters[1], 1, 'only-b', 2),
    ],
  };
}

export type FleetData = ReturnType<typeof fleetData>;

/** Track only successful namespace POSTs; never adopt an existing namespace. */
export class FleetResources {
  private readonly owned: Array<{
    client: AcmSpokeClient;
    cluster: string;
    name: string;
    uid: string;
  }> = [];

  async create(data: FleetData, clients: Map<string, AcmSpokeClient>) {
    for (const cluster of data.clusters) {
      const client = clients.get(cluster)!;
      for (const name of data.namespaces) {
        const namespace = await client.createResource('', 'v1', 'namespaces', {
          apiVersion: 'v1',
          kind: 'Namespace',
          metadata: { name, labels: { [ACM_OWNER_LABEL]: data.run } },
        });
        expect(
          namespace?.metadata?.uid,
          `Created namespace ${cluster}/${name} must have a UID`,
        ).toBeTruthy();
        this.owned.push({ client, cluster, name, uid: namespace!.metadata!.uid! });
        console.info(
          `ACM created namespace: ${JSON.stringify({ cluster, name, uid: namespace!.metadata!.uid, run: data.run })}`,
        );
        await expect
          .poll(
            async () => (await client.getResource('', 'v1', 'namespaces', name))?.status?.phase,
            { message: `Namespace ${cluster}/${name} must become Active` },
          )
          .toBe('Active');
      }
      for (const vm of data.vms.filter((item) => item.cluster === cluster)) {
        const payload = load(
          VirtualMachineFactory.create({
            name: vm.name,
            namespace: vm.namespace,
            runStrategy: 'Halted',
            cpuCores: vm.cores,
            memory: vm.memory,
            description: vm.description,
            customLabels: { [ACM_OWNER_LABEL]: data.run, 'vm.openshift.io/folder': data.run },
          }),
        ) as KubernetesResource;
        const created = await client.createResource(
          'kubevirt.io',
          'v1',
          'virtualmachines',
          payload,
          vm.namespace,
        );
        vm.uid = created?.metadata?.uid;
        expect(
          vm.uid,
          `Created VM ${cluster}/${vm.namespace}/${vm.name} must have a UID`,
        ).toBeTruthy();
        await expect
          .poll(
            async () =>
              (await client.getVirtualMachine(vm.namespace, vm.name))?.status?.printableStatus,
            { message: `VM ${cluster}/${vm.name} must settle to Stopped`, timeout: 120_000 },
          )
          .toBe('Stopped');
      }
    }
  }

  async cleanup(run: string) {
    const results = await Promise.allSettled(
      this.owned.map(async ({ client, cluster, name, uid }) => {
        const current = await client.getResource('', 'v1', 'namespaces', name);
        if (!current) return;
        if (current.metadata?.uid !== uid || current.metadata?.labels?.[ACM_OWNER_LABEL] !== run) {
          throw new Error(`Refusing cleanup: ownership changed for ${cluster}/${name}`);
        }
        await client._request('delete', `/kubernetes/api/v1/namespaces/${name}`, {
          data: { apiVersion: 'v1', kind: 'DeleteOptions', preconditions: { uid } },
        });
        await expect
          .poll(() => client.getResource('', 'v1', 'namespaces', name), {
            message: `Cleanup must remove owned namespace ${cluster}/${name}`,
            timeout: 120_000,
          })
          .toBeNull();
      }),
    );
    const failures = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    if (failures.length)
      throw new Error(
        `ACM cleanup failed (run ${run}): ${failures.map((result) => String(result.reason)).join('\n')}`,
      );
  }
}
