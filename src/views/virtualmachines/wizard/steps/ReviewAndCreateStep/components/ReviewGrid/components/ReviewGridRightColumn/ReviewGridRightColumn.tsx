import type { FC } from 'react';

import { type V1VirtualMachine } from '@kubevirt-ui-ext/kubevirt-api/kubevirt';
import DisksReviewTable from '@kubevirt-utils/components/DisksReviewTable/DisksReviewTable';
import NetworksReviewTable from '@kubevirt-utils/components/NetworksReviewTable/NetworksReviewTable';
import { useKubevirtTranslation } from '@kubevirt-utils/hooks/useKubevirtTranslation';
import { getInterfaces, getNetworks } from '@kubevirt-utils/resources/vm';
import { ExpandableSection, Stack, StackItem } from '@patternfly/react-core';
import useWizardDisksTableData from '@virtualmachines/wizard/components/DisksReviewTable/hooks/useWizardDisksTableData/useWizardDisksTableData';
import HardwareDevicesTable from '@virtualmachines/wizard/components/HardwareDevicesTable';

import './ReviewGridRightColumn.scss';

type ReviewGridRightColumnProps = {
  vm: null | V1VirtualMachine;
};

const ReviewGridRightColumn: FC<ReviewGridRightColumnProps> = ({ vm }) => {
  const { t } = useKubevirtTranslation();

  const [disks] = useWizardDisksTableData(vm);
  const interfaces = getInterfaces(vm);
  const networks = getNetworks(vm);

  return (
    <Stack className="review-grid-right-column" hasGutter>
      <StackItem>
        <ExpandableSection isIndented toggleText={t('Storage')}>
          <DisksReviewTable disks={disks} />
        </ExpandableSection>
      </StackItem>
      <StackItem>
        <ExpandableSection isIndented toggleText={t('Network')}>
          <NetworksReviewTable interfaces={interfaces} networks={networks} />
        </ExpandableSection>
      </StackItem>
      <StackItem>
        <ExpandableSection isIndented toggleText={t('Hardware devices')}>
          <HardwareDevicesTable vm={vm} />
        </ExpandableSection>
      </StackItem>
    </Stack>
  );
};

export default ReviewGridRightColumn;
