import { type V1VirtualMachine } from '@kubevirt-ui-ext/kubevirt-api/kubevirt';
import { VMCreationMethod } from '@virtualmachines/wizard/utils/constants';

import { finalizeWizardVMDraft } from './finalizeWizardVMDraft';
import { type VMWizardDeploymentValues, type VMWizardFormValues } from './types';

export type WizardReviewModel = {
  configurationVM: null | V1VirtualMachine;
  isCloneMethod: boolean;
  target: VMWizardDeploymentValues;
};

export const mapWizardValuesToReview = (values: VMWizardFormValues): WizardReviewModel => {
  const isCloneMethod = values.creationMethod === VMCreationMethod.CLONE;
  const sourceVM = isCloneMethod ? values.clone.sourceVM : null;

  const finalizedDraft =
    !isCloneMethod && values.customization.vmDraft
      ? finalizeWizardVMDraft(values.customization.vmDraft, values.deployment)
      : null;

  return {
    configurationVM: finalizedDraft ?? sourceVM,
    isCloneMethod,
    target: values.deployment,
  };
};
