import { DEFAULT_NAMESPACE } from '@kubevirt-utils/constants/constants';
import { useFleetAccessReview } from '@stolostron/multicluster-sdk';
import { getCanCreateVMFleetAccessReview } from '@virtualmachines/list/utils/utils';

type UseCanCreateVMInDefaultNamespaceOptions = {
  cluster?: string;
  enabled?: boolean;
  shouldValidate?: boolean;
};

type UseCanCreateVMInDefaultNamespaceResult = {
  canCreate: boolean;
  loading: boolean;
  shouldValidate: boolean;
};

const useCanCreateVMInDefaultNamespace = ({
  cluster,
  enabled = true,
  shouldValidate = false,
}: UseCanCreateVMInDefaultNamespaceOptions): UseCanCreateVMInDefaultNamespaceResult => {
  const [canCreateVMInDefaultNamespace, isLoadingAccessReview] = useFleetAccessReview(
    enabled ? getCanCreateVMFleetAccessReview(DEFAULT_NAMESPACE, cluster) : {},
  );

  return {
    canCreate: enabled && Boolean(canCreateVMInDefaultNamespace),
    loading: enabled && isLoadingAccessReview,
    shouldValidate,
  };
};

export default useCanCreateVMInDefaultNamespace;
