import { useMemo } from 'react';
import { useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router';

import { getVMListURL } from '@multicluster/urls';
import { useVMWizardForm } from '@virtualmachines/wizard/form/VMWizardFormProvider';

type UseCloseWizard = () => () => void;

const useCloseWizard: UseCloseWizard = () => {
  const navigate = useNavigate();
  const { control } = useVMWizardForm();
  const [cluster, namespace] = useWatch({
    control,
    name: ['deployment.cluster', 'deployment.project'],
  });

  const vmListURL = useMemo(() => getVMListURL(cluster ?? '', namespace), [cluster, namespace]);

  const navigateToVMList = (): void => {
    navigate(vmListURL);
  };

  return navigateToVMList;
};

export default useCloseWizard;
