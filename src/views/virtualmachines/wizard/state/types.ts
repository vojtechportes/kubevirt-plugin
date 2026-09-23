import { type Dispatch, type SetStateAction } from 'react';

import { type VMWizardStep } from '../utils/constants';

export type VMWizardNavigationState = {
  currentStep: VMWizardStep;
  strictVMName: boolean;
  visitedSteps: VMWizardStep[];
};

export type VMWizardState = VMWizardNavigationState & {
  isTemplateDrawerOpen: boolean;
  templateProcessError: null | string;
};

export type VMWizardStateContextValue = VMWizardState & {
  resetNavigation: () => void;
  setCurrentStep: (step: VMWizardStep) => void;
  setIsTemplateDrawerOpen: Dispatch<SetStateAction<boolean>>;
  setStrictVMName: (strict: boolean) => void;
  setTemplateProcessError: Dispatch<SetStateAction<null | string>>;
};
