import { type V1VirtualMachine } from '@kubevirt-ui-ext/kubevirt-api/kubevirt';

import { reconcileGeneratedVM } from './reconcileGeneratedVM';

jest.mock('@kubevirt-utils/utils/utils', () => ({
  ensurePath: (resource: Record<string, unknown>, path: string) => {
    path.split('.').reduce((current, key) => {
      current[key] ??= {};
      return current[key] as Record<string, unknown>;
    }, resource);
  },
}));

jest.mock('@kubevirt-utils/resources/vm/utils/selectors', () => ({
  getDisks: (vm: V1VirtualMachine) => vm.spec.template.spec.domain.devices.disks,
  getInterfaces: (vm: V1VirtualMachine) => vm.spec.template.spec.domain.devices.interfaces,
  getNetworks: (vm: V1VirtualMachine) => vm.spec.template.spec.networks,
  getVolumes: (vm: V1VirtualMachine) => vm.spec.template.spec.volumes,
}));

const createVM = (instanceTypeName = 'u1.medium'): V1VirtualMachine => ({
  apiVersion: 'kubevirt.io/v1',
  kind: 'VirtualMachine',
  metadata: { labels: { folder: 'original-folder' }, name: 'test-vm' },
  spec: {
    instancetype: { name: instanceTypeName },
    template: {
      spec: {
        domain: { devices: { disks: [{ name: 'root-disk' }], interfaces: [{ name: 'default' }] } },
        networks: [{ name: 'default' }],
      },
    },
  },
});

describe('reconcileGeneratedVM', () => {
  const cloneVM = (vm: V1VirtualMachine): V1VirtualMachine =>
    JSON.parse(JSON.stringify(vm)) as V1VirtualMachine;

  it('applies generated changes and preserves user-only changes', () => {
    const previous = createVM();
    const customized = cloneVM(previous);
    customized.metadata.labels = {
      ...customized.metadata.labels,
      'kubevirt.io/deletion-protection': 'true',
    };
    customized.spec.template.spec.hostname = 'custom-hostname';
    const next = createVM('u1.large');
    next.metadata.labels.folder = 'new-folder';

    const result = reconcileGeneratedVM(previous, customized, next);

    expect(result.spec.instancetype.name).toBe('u1.large');
    expect(result.spec.template.spec.hostname).toBe('custom-hostname');
    expect(result.metadata.labels).toEqual({
      folder: 'new-folder',
      'kubevirt.io/deletion-protection': 'true',
    });
  });

  it('preserves a customized array when generation leaves it unchanged', () => {
    const previous = createVM();
    const customized = cloneVM(previous);
    customized.spec.template.spec.networks = [{ name: 'custom-network' }];

    const result = reconcileGeneratedVM(previous, customized, createVM('u1.large'));

    expect(result.spec.template.spec.networks).toEqual([{ name: 'custom-network' }]);
  });

  it('preserves custom properties when generation removes their containing object', () => {
    const previous = createVM();
    const customized = cloneVM(previous);
    customized.metadata.labels['kubevirt.io/deletion-protection'] = 'true';
    const next = createVM('u1.large');
    delete next.metadata.labels;

    const result = reconcileGeneratedVM(previous, customized, next);

    expect(result.metadata.labels).toEqual({ 'kubevirt.io/deletion-protection': 'true' });
  });

  it('uses generation when generation and customization conflict', () => {
    const previous = createVM();
    const customized = cloneVM(previous);
    customized.spec.instancetype.name = 'u1.custom';

    const result = reconcileGeneratedVM(previous, customized, createVM('u1.large'));

    expect(result.spec.instancetype.name).toBe('u1.large');
  });

  it('replaces correlated storage together when generated storage changes', () => {
    const previous = createVM();
    previous.spec.dataVolumeTemplates = [{ metadata: { name: 'root-dv' }, spec: {} }];
    previous.spec.template.spec.volumes = [{ dataVolume: { name: 'root-dv' }, name: 'root-disk' }];
    const customized = cloneVM(previous);
    customized.spec.dataVolumeTemplates.push({ metadata: { name: 'custom-dv' }, spec: {} });
    customized.spec.template.spec.domain.devices.disks.push({ name: 'custom-disk' });
    customized.spec.template.spec.volumes.push({
      dataVolume: { name: 'custom-dv' },
      name: 'custom-disk',
    });
    const next = createVM('u1.large');
    next.spec.dataVolumeTemplates = [{ metadata: { name: 'replacement-dv' }, spec: {} }];
    next.spec.template.spec.domain.devices.disks = [{ name: 'replacement-disk' }];
    next.spec.template.spec.volumes = [
      { dataVolume: { name: 'replacement-dv' }, name: 'replacement-disk' },
    ];

    const result = reconcileGeneratedVM(previous, customized, next);

    expect(result.spec.dataVolumeTemplates).toEqual(next.spec.dataVolumeTemplates);
    expect(result.spec.template.spec.domain.devices.disks).toEqual(
      next.spec.template.spec.domain.devices.disks,
    );
    expect(result.spec.template.spec.volumes).toEqual(next.spec.template.spec.volumes);
  });

  it('replaces correlated networking together when generated networking changes', () => {
    const previous = createVM();
    const customized = cloneVM(previous);
    customized.spec.template.spec.domain.devices.interfaces.push({ name: 'custom-network' });
    customized.spec.template.spec.networks.push({ name: 'custom-network' });
    const next = createVM('u1.large');
    next.spec.template.spec.domain.devices.interfaces = [{ name: 'replacement-network' }];
    next.spec.template.spec.networks = [{ name: 'replacement-network' }];

    const result = reconcileGeneratedVM(previous, customized, next);

    expect(result.spec.template.spec.domain.devices.interfaces).toEqual(
      next.spec.template.spec.domain.devices.interfaces,
    );
    expect(result.spec.template.spec.networks).toEqual(next.spec.template.spec.networks);
  });
});
