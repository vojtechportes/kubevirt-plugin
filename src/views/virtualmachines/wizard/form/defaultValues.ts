import { OperatingSystemType } from '@virtualmachines/wizard/steps/InstanceTypesSteps/GuestOSStep/utils/constants';
import { VMCreationMethod } from '@virtualmachines/wizard/utils/constants';

import {
  type VMWizardCloneValues,
  type VMWizardCustomizationValues,
  type VMWizardDeploymentValues,
  type VMWizardFormValues,
  type VMWizardInstanceTypeValues,
  type VMWizardTemplateValues,
} from './types';

export type CreateInitialDeploymentValuesArgs = {
  /** Cluster resolved from router state, local storage, or the hub-cluster fallback. */
  cluster?: null | string;
  /** Namespace resolved from router state or the active namespace. */
  namespace?: null | string;
};

export type CreateVMWizardDefaultValuesArgs = CreateInitialDeploymentValuesArgs & {
  creationMethod?: null | VMCreationMethod;
};

export const createDeploymentDefaultValues = (): VMWizardDeploymentValues => ({
  cluster: '',
  description: '',
  folder: '',
  name: '',
  project: '',
});

export const createInitialDeploymentValues = ({
  cluster,
  namespace,
}: CreateInitialDeploymentValuesArgs = {}): VMWizardDeploymentValues => ({
  ...createDeploymentDefaultValues(),
  cluster: cluster ?? '',
  project: namespace ?? '',
});

export const createInstanceTypeDefaultValues = (): VMWizardInstanceTypeValues => ({
  bootVolume: null,
  compute: null,
  operatingSystem: OperatingSystemType.RHEL,
  preference: null,
  useBootSource: true,
  volumeNamespace: '',
});

export const createTemplateDefaultValues = (): VMWizardTemplateValues => ({
  generationRevision: 0,
  selectedTemplate: null,
});

export const createCloneDefaultValues = (): VMWizardCloneValues => ({
  sourceVM: null,
});

export const createCustomizationDefaultValues = (): VMWizardCustomizationValues => ({
  autoLabelsApplied: false,
  pendingBootableVolumeUploadKeys: [],
  templateAdditionalObjects: [],
  vmDraft: null,
});

export const createVMWizardDefaultValues = ({
  creationMethod,
  ...initialDeploymentValues
}: CreateVMWizardDefaultValuesArgs = {}): VMWizardFormValues => ({
  clone: createCloneDefaultValues(),
  creationMethod: creationMethod ?? VMCreationMethod.INSTANCE_TYPE,
  customization: createCustomizationDefaultValues(),
  deployment: createInitialDeploymentValues(initialDeploymentValues),
  instanceType: createInstanceTypeDefaultValues(),
  template: createTemplateDefaultValues(),
});

export const resetCreationMethodValues = (
  values: VMWizardFormValues,
  creationMethod: VMCreationMethod,
): VMWizardFormValues => ({
  clone: createCloneDefaultValues(),
  creationMethod,
  customization: createCustomizationDefaultValues(),
  deployment: { ...values.deployment },
  instanceType: createInstanceTypeDefaultValues(),
  template: createTemplateDefaultValues(),
});
