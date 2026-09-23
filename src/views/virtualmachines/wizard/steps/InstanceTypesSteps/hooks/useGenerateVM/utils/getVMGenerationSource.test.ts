import { createVMWizardDefaultValues } from '@virtualmachines/wizard/form/defaultValues';

import { getVMGenerationSource } from './getVMGenerationSource';

type SourceArgs = Parameters<typeof getVMGenerationSource>[0];

const createArgs = (): SourceArgs => {
  const values = createVMWizardDefaultValues({ cluster: 'cluster-a', namespace: 'project-a' });
  return {
    autoUpdateEnabled: false,
    context: {
      enableMultiArchBootImageImport: false,
      isIPv6SingleStack: false,
      isUDNManagedNamespace: false,
      sshSecretName: 'ssh-a',
      vmCreationNad: { metadata: { name: 'nad-a' } },
    },
    driversImage: 'drivers-a',
    instanceTypeData: values.instanceType,
    subscriptionData: { organizationID: 'org-a' },
    vmData: { ...values.deployment, name: 'vm-a' },
  } as SourceArgs;
};

describe('getVMGenerationSource', () => {
  it.each([
    ['automatic updates', (args: SourceArgs) => (args.autoUpdateEnabled = true)],
    ['SSH secret', (args: SourceArgs) => (args.context.sshSecretName = 'ssh-b')],
    ['drivers image', (args: SourceArgs) => (args.driversImage = 'drivers-b')],
    [
      'multi-architecture state',
      (args: SourceArgs) => (args.context.enableMultiArchBootImageImport = true),
    ],
    ['IPv6 state', (args: SourceArgs) => (args.context.isIPv6SingleStack = true)],
    ['UDN state', (args: SourceArgs) => (args.context.isUDNManagedNamespace = true)],
    [
      'default NAD',
      (args: SourceArgs) => (args.context.vmCreationNad = { metadata: { name: 'nad-b' } }),
    ],
    [
      'subscription data',
      (args: SourceArgs) => (args.subscriptionData = { organizationID: 'org-b' }),
    ],
  ])('changes when %s changes', (_name, update) => {
    const previousArgs = createArgs();
    const nextArgs = createArgs();
    update(nextArgs);

    expect(getVMGenerationSource(nextArgs)).not.toEqual(getVMGenerationSource(previousArgs));
  });
});
