import { type FC, type PropsWithChildren, useCallback, useMemo, useState } from 'react';

import { VMWizardStep } from '../utils/constants';
import { type VMWizardNavigationState } from './types';
import { VMWizardStateContext } from './useVMWizardState';

const createNavigationState = (): VMWizardNavigationState => ({
  currentStep: VMWizardStep.DEPLOYMENT_DETAILS,
  strictVMName: false,
  visitedSteps: [VMWizardStep.DEPLOYMENT_DETAILS],
});

const VMWizardStateProvider: FC<PropsWithChildren> = ({ children }) => {
  const [navigation, setNavigation] = useState(createNavigationState);
  const [isTemplateDrawerOpen, setIsTemplateDrawerOpen] = useState(false);
  const [templateProcessError, setTemplateProcessError] = useState<null | string>(null);

  const setCurrentStep = useCallback((step: VMWizardStep): void => {
    setNavigation((current) => ({
      ...current,
      currentStep: step,
      visitedSteps: [...new Set(current.visitedSteps).add(step)],
    }));
  }, []);

  const setStrictVMName = useCallback((strictVMName: boolean): void => {
    setNavigation((current) => ({ ...current, strictVMName }));
  }, []);

  const resetNavigation = useCallback((): void => setNavigation(createNavigationState()), []);

  const value = useMemo(
    () => ({
      ...navigation,
      isTemplateDrawerOpen,
      resetNavigation,
      setCurrentStep,
      setIsTemplateDrawerOpen,
      setStrictVMName,
      setTemplateProcessError,
      templateProcessError,
    }),
    [
      navigation,
      isTemplateDrawerOpen,
      resetNavigation,
      setCurrentStep,
      setStrictVMName,
      templateProcessError,
    ],
  );

  return <VMWizardStateContext.Provider value={value}>{children}</VMWizardStateContext.Provider>;
};

export default VMWizardStateProvider;
