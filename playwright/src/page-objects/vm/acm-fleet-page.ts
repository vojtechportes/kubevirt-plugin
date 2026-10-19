import type { FleetVM } from '@/fixtures/acm-fleet-data';
import { expect } from '@playwright/test';

import VirtualMachinesPage from './virtual-machines-page';

/** Cluster-qualified selectors only: VM names and project names repeat across spokes. */
export default class AcmFleetPage extends VirtualMachinesPage {
  async openFleet() {
    await this.dismissStartupOverlays();
    if ((await this.getPerspectiveSwitcherText()).trim() !== 'Fleet Virtualization') {
      await this.switchToPerspective('Fleet Virtualization');
    }
    await this.clickVirtualMachinesNavItem();
    await expect(this.page).toHaveURL(/\/fleet-virtualization\/kubevirt.io~v1~VirtualMachine/);
    await this.clickVmListTab();
    await this.waitForTreeViewReady();
    await this.selectClusterInDropdown('All clusters');
    await expect(this.page).toHaveURL(/\/all-clusters\/all-namespaces/);
  }

  async isolateGroup(run: string) {
    if (new URL(this.page.url()).searchParams.getAll('group').includes(run)) return;
    await this.search.appendToVmSearch(`group:${run}`);
    await expect
      .poll(() => new URL(this.page.url()).searchParams.getAll('group'), {
        message: 'Group search must be enabled (treeViewFolders / advancedSearch prerequisites)',
      })
      .toContain(run);
  }

  vmLink(vm: FleetVM) {
    return this.page
      .locator('table')
      .getByRole('link', { name: vm.name, exact: true })
      .and(this.page.locator(`a[href*="/cluster/${vm.cluster}/ns/${vm.namespace}/${vm.name}"]`));
  }

  async expectVMs(expected: FleetVM[], run: string) {
    const key = (vm: FleetVM) => `${vm.cluster}/${vm.namespace}/${vm.name}`;
    const links = this.page
      .locator('table a[href*="/kubevirt.io~v1~VirtualMachine/cluster/"]')
      .filter({ hasText: run });
    await expect
      .poll(
        async () =>
          links.evaluateAll((elements) =>
            elements
              .map((element) => {
                const path = new URL((element as HTMLAnchorElement).href).pathname;
                const match = path.match(/\/cluster\/([^/]+)\/ns\/([^/]+)\/([^/]+)/);
                return match ? match.slice(1).map(decodeURIComponent).join('/') : path;
              })
              .sort(),
          ),
        { message: 'Exact cluster/project/name identities in the VM list', timeout: 120_000 },
      )
      .toEqual(expected.map(key).sort());
    // Also catch unrelated rows leaking through the group filter.
    await expect(
      this.page.locator('table a[href*="/kubevirt.io~v1~VirtualMachine/cluster/"]'),
    ).toHaveCount(expected.length);
  }

  async expectOverview(count: number) {
    const card = this.page.getByTestId('vm-list-statuses-card');
    await expect(card.getByRole('link', { name: `Stopped: ${count}`, exact: true })).toBeVisible({
      timeout: 120_000,
    });
    for (const status of ['Error', 'Running', 'Other']) {
      await expect(card.getByRole('link', { name: `${status}: 0`, exact: true })).toBeVisible();
    }
  }

  async selectTreeCluster(cluster: string) {
    await this.clearTreeViewSearch();
    await this.page
      .locator(`[id="clusterSelector/${cluster}"] > div`)
      .getByRole('button', { name: cluster, exact: true })
      .click();
    await expect
      .poll(() => new URL(this.page.url()).searchParams.getAll('cluster'))
      .toEqual([cluster]);
  }

  async selectTreeProject(cluster: string, namespace: string) {
    await this.searchTreeView(namespace);
    await this.page
      .locator(`[id="projectSelector/${cluster}/${namespace}"] > div`)
      .getByRole('button', { name: namespace, exact: true })
      .click();
    await expect
      .poll(() => new URL(this.page.url()).searchParams.getAll('project'))
      .toEqual([namespace]);
    await expect(this.page).toHaveURL(new RegExp(`/cluster/${cluster}/ns/${namespace}`));
  }

  async toggleFilter(catalog: 'Cluster' | 'Project', option: string) {
    const toggle = this.page
      .locator('#filter-toolbar')
      .getByRole('button', { name: new RegExp(`^${catalog}`) });
    await expect(toggle).toBeEnabled();
    await toggle.click();
    const item = this.page.getByRole('menuitem', { name: option, exact: true });
    await expect(
      item,
      `${catalog} catalog must retain option ${option} after narrowing`,
    ).toBeVisible();
    await expect(item).toBeEnabled();
    await item.click();
    await toggle.click();
  }
}
