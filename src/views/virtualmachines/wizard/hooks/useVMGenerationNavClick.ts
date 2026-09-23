import { useRef } from 'react';

import { type WizardStepType } from '@patternfly/react-core';
import {
  getNavigationPrerequisites,
  getWizardStepIds,
} from '@virtualmachines/wizard/form/stepValidation';
import { useVMWizardForm } from '@virtualmachines/wizard/form/VMWizardFormProvider';
import { type VMGenerationCoordinator } from '@virtualmachines/wizard/hooks/useVMGenerationCoordinator/types';
import useWizardStepValidation from '@virtualmachines/wizard/hooks/useWizardStepValidation';
import { useVMWizardState } from '@virtualmachines/wizard/state/useVMWizardState';
import {
  VM_DRAFT_REQUIRED_STEPS,
  type VMCreationMethod,
  type VMWizardStep,
} from '@virtualmachines/wizard/utils/constants';
import {
  isInstanceTypeCreationMethod,
  isTemplateCreationMethod,
} from '@virtualmachines/wizard/utils/utils';

import { type WizardStepNavItemConfig } from '../utils/types';

const useVMGenerationNavClick = (
  creationMethod: VMCreationMethod,
  generationCoordinator: VMGenerationCoordinator,
): WizardStepNavItemConfig => {
  const { getFieldState } = useVMWizardForm();
  const { currentStep, setStrictVMName, visitedSteps } = useVMWizardState();
  const { isStepDisabled, validateSteps } = useWizardStepValidation();
  const { ensureInstanceTypeDraft, ensureTemplateDraft, instanceTypeReady, isTemplateGenerating } =
    generationCoordinator;
  const navigatingRef = useRef(false);

  const generateVMForMethod = async (): Promise<boolean> => {
    if (isInstanceTypeCreationMethod(creationMethod)) return ensureInstanceTypeDraft();
    if (isTemplateCreationMethod(creationMethod)) return ensureTemplateDraft();
    return true;
  };

  const handleNavItemClick = async (
    step: WizardStepType,
    activeStep: WizardStepType,
    goToStepByIndex: (index: number) => void,
  ): Promise<void> => {
    if (navigatingRef.current || isTemplateGenerating) return;
    const target = step.id as VMWizardStep;
    const current = activeStep.id as VMWizardStep;
    const flow = getWizardStepIds(creationMethod);
    if (flow.indexOf(target) <= flow.indexOf(current)) {
      goToStepByIndex(step.index);
      return;
    }
    navigatingRef.current = true;
    try {
      const prerequisites = getNavigationPrerequisites(creationMethod, current, target);
      if (prerequisites.some((prerequisite) => !visitedSteps.includes(prerequisite))) return;
      if (!(await validateSteps(prerequisites))) {
        if (getFieldState('deployment.name').invalid) {
          setStrictVMName(true);
        }
        return;
      }
      if (VM_DRAFT_REQUIRED_STEPS.has(target) && !(await generateVMForMethod())) return;
      goToStepByIndex(step.index);
    } finally {
      navigatingRef.current = false;
    }
  };

  return {
    handleNavItemClick,
    isGeneratingVM: isTemplateGenerating,
    isStepDisabled: (step): boolean => {
      const current = currentStep;
      const flow = getWizardStepIds(creationMethod);
      if (isTemplateGenerating) return true;
      if (flow.indexOf(step) <= flow.indexOf(current)) return false;
      return (
        isStepDisabled(step) ||
        (VM_DRAFT_REQUIRED_STEPS.has(step) &&
          isInstanceTypeCreationMethod(creationMethod) &&
          !instanceTypeReady)
      );
    },
  };
};

export default useVMGenerationNavClick;
