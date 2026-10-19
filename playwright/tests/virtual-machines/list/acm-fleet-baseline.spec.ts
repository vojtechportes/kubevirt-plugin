import { load } from 'js-yaml';

import { ACM_TAG } from '@/data-models/allure-constants';
import type { KubernetesResource } from '@/data-models/kubernetes-types';
import { ROUTE_VIRTUAL_MACHINES_LIST_TAG } from '@/data-models/route-tags';
import { expect, test } from '@/fixtures/acm-fleet-fixture';
import VirtualMachineDetailPage from '@/page-objects/vm/virtual-machine-detail-page';

test.describe(
  'ACM Fleet healthy inventory baseline',
  {
    tag: [ACM_TAG, ROUTE_VIRTUAL_MACHINES_LIST_TAG],
  },
  () => {
    test('list and Navigator Overview preserve all-cluster and spoke scope in all and selected projects', async ({
      fleetPage,
      fleet,
    }) => {
      const { clusters, namespaces, run, vms } = fleet;
      const checkScope = async (cluster?: string, namespace?: string) => {
        await fleetPage.isolateGroup(run);
        const expected = vms.filter(
          (vm) =>
            (!cluster || vm.cluster === cluster) && (!namespace || vm.namespace === namespace),
        );
        await fleetPage.expectVMs(expected, run);
        const scope = () => {
          const url = new URL(fleetPage.page.url());
          return {
            path: url.pathname,
            cluster: url.searchParams.getAll('cluster'),
            project: url.searchParams.getAll('project'),
            group: url.searchParams.getAll('group'),
          };
        };
        const before = scope();
        await fleetPage.clickOverviewTab();
        await fleetPage.expectOverview(expected.length);
        expect(scope(), 'Opening Overview preserves path and inventory filters').toEqual(before);
        await fleetPage.clickVmListTab();
        expect(scope(), 'Returning to the list preserves path and inventory filters').toEqual(
          before,
        );
        await fleetPage.expectVMs(expected, run);
      };

      await test.step('All clusters / all projects: five exact identities, five stopped VMs', async () => {
        await checkScope();
      });
      await test.step('All clusters / Project filter one: three list VMs, including both same-named VMs', async () => {
        await fleetPage.toggleFilter('Project', namespaces[0]);
        await fleetPage.expectVMs(
          vms.filter((vm) => vm.namespace === namespaces[0]),
          run,
        );
        // The all-clusters project picker is disabled; Overview has no supported
        // all-clusters namespace route through the UI. Do not invent one here.
        await fleetPage.toggleFilter('Project', namespaces[0]);
        await fleetPage.expectVMs(vms, run);
      });
      await test.step('Tree cluster A / all projects: two VMs and Cluster filter A', async () => {
        await fleetPage.selectTreeCluster(clusters[0]);
        await expect
          .poll(() => new URL(fleetPage.page.url()).searchParams.getAll('project'))
          .toEqual([]);
        await expect(fleetPage.page.locator('#filter-toolbar')).toContainText(clusters[0]);
        await checkScope(clusters[0]);
      });
      await test.step('Tree project one on cluster A: one VM and matching Project filter', async () => {
        await fleetPage.selectTreeProject(clusters[0], namespaces[0]);
        await expect(fleetPage.page.locator('#filter-toolbar')).toContainText(namespaces[0]);
        await checkScope(clusters[0], namespaces[0]);
      });
    });

    test('name search and project/cluster catalogs narrow and broaden the actual VM selection', async ({
      fleetPage,
      fleet,
    }) => {
      const { clusters, namespaces, run, vms } = fleet;
      await fleetPage.selectTreeCluster(clusters[0]);
      await fleetPage.selectTreeProject(clusters[0], namespaces[0]);
      await fleetPage.isolateGroup(run);
      await fleetPage.expectVMs([vms[0]], run);

      await test.step('Add project two while project one is selected', async () => {
        await fleetPage.toggleFilter('Project', namespaces[1]);
        await expect(fleetPage.page).toHaveURL(/\/all-namespaces/);
        await expect
          .poll(() => new URL(fleetPage.page.url()).searchParams.getAll('project').sort())
          .toEqual([...namespaces].sort());
        await fleetPage.expectVMs(
          vms.filter((vm) => vm.cluster === clusters[0]),
          run,
        );
      });
      await test.step('Add cluster B while cluster A is selected', async () => {
        await fleetPage.toggleFilter('Cluster', clusters[1]);
        await expect
          .poll(() => new URL(fleetPage.page.url()).searchParams.getAll('cluster').sort())
          .toEqual([...clusters].sort());
        await fleetPage.expectVMs(vms, run);
      });
      await test.step('Remove project one and cluster A, then restore both through the same catalogs', async () => {
        await fleetPage.toggleFilter('Project', namespaces[0]);
        await fleetPage.expectVMs(
          vms.filter((vm) => vm.namespace === namespaces[1]),
          run,
        );
        await fleetPage.toggleFilter('Cluster', clusters[0]);
        await fleetPage.expectVMs([vms[4]], run);
        await fleetPage.toggleFilter('Project', namespaces[0]);
        await fleetPage.expectVMs(
          vms.filter((vm) => vm.cluster === clusters[1]),
          run,
        );
        await fleetPage.toggleFilter('Cluster', clusters[0]);
        await fleetPage.expectVMs(vms, run);
      });
      await test.step('Search the shared name: exactly two distinct cluster-qualified VM links', async () => {
        await fleetPage.search.appendToVmSearch(`name:${vms[0].name}`);
        await fleetPage.expectVMs([vms[0], vms[2]], run);
        await expect(fleetPage.vmLink(vms[0])).toBeVisible();
        await expect(fleetPage.vmLink(vms[2])).toBeVisible();
      });
    });

    test('same-named VMs open the correct live spoke resource in Overview, YAML and Configuration', async ({
      fleetPage,
      fleet,
    }) => {
      for (const vm of [fleet.vms[0], fleet.vms[2]]) {
        await test.step(`Open ${vm.cluster}/${vm.namespace}/${vm.name}`, async () => {
          await fleetPage.isolateGroup(fleet.run);
          await fleetPage.expectVMs(fleet.vms, fleet.run);
          await fleetPage.vmLink(vm).click();
          await expect(fleetPage.page).toHaveURL(
            new RegExp(`/cluster/${vm.cluster}/ns/${vm.namespace}/${vm.name}(?:/|\\?|$)`),
          );
          const detail = new VirtualMachineDetailPage(fleetPage.page);
          await detail.navigateToOverview();
          await expect(
            fleetPage.page.getByTestId('virtual-machine-overview-details-name'),
          ).toContainText(vm.name);
          await expect(
            fleetPage.page.getByTestId('virtual-machine-overview-details-status'),
          ).toContainText('Stopped');
          const compute = new RegExp(
            `${vm.cores} CPU.*${vm.memory === '256Mi' ? '256' : '512'}\\s*MiB`,
          );
          await expect(
            fleetPage.page.getByTestId('virtual-machine-overview-details-cpu-memory'),
          ).toContainText(compute);

          await detail.navigateToYAML();
          await expect(fleetPage.page.locator('.monaco-editor')).toBeVisible();
          await expect
            .poll(
              async () => {
                const yaml = await fleetPage.page.evaluate(() => {
                  const editorWindow = window as unknown as {
                    monaco?: {
                      editor?: {
                        getEditors: () => Array<{
                          getModel: () => { getValue: () => string } | null;
                        }>;
                      };
                    };
                  };
                  return (
                    editorWindow.monaco?.editor
                      ?.getEditors()
                      .map((editor) => editor.getModel()?.getValue())
                      .find((value) => value?.includes('kind: VirtualMachine')) ?? ''
                  );
                });
                return yaml ? (load(yaml) as KubernetesResource) : null;
              },
              {
                message:
                  'Displayed YAML must contain the UID and content returned by the spoke at setup',
              },
            )
            .toMatchObject({
              kind: 'VirtualMachine',
              metadata: {
                name: vm.name,
                namespace: vm.namespace,
                uid: vm.uid,
                annotations: { description: vm.description },
              },
              spec: {
                runStrategy: 'Halted',
                template: {
                  spec: { domain: { cpu: { cores: vm.cores }, memory: { guest: vm.memory } } },
                },
              },
            });

          await detail.navigateToConfigurationDetails();
          await expect(fleetPage.page.getByTestId(`${vm.name}-description`)).toContainText(
            vm.description,
          );
          await expect(fleetPage.page.getByTestId(`${vm.name}-cpu-memory`)).toContainText(compute);
          await fleetPage.openFleet();
        });
      }
    });
  },
);
