import { type FC } from 'react';
import produce from 'immer';

import type {
  V1Disk,
  V1Interface,
  V1Network,
  V1VirtualMachine,
} from '@kubevirt-ui-ext/kubevirt-api/kubevirt';
import Loading from '@kubevirt-utils/components/Loading/Loading';
import SearchItem from '@kubevirt-utils/components/SearchItem/SearchItem';
import { useKubevirtTranslation } from '@kubevirt-utils/hooks/useKubevirtTranslation';
import { ensurePath } from '@kubevirt-utils/utils/utils';
import { PageSection, Title } from '@patternfly/react-core';
import AddNetworkInterfaceButton from '@virtualmachines/details/tabs/configuration/network/components/AddNetworkInterfaceButton';
import { useWizardVMDraft } from '@virtualmachines/wizard/hooks/useWizardVMDraft';
import NetworkInterfaceList from '@virtualmachines/wizard/steps/CustomizationStep/components/CustomizeVirtualMachine/components/CustomizeVMTabs/tabs/network/NetworkInterfaceList';

const CustomizeInstanceTypeNetworkTab: FC = () => {
  const { t } = useKubevirtTranslation();
  const { replaceDraft, vmDraft: vm } = useWizardVMDraft();

  if (!vm) {
    return <Loading />;
  }

  return (
    <PageSection>
      <Title headingLevel="h2">
        <SearchItem id="network">{t('Network interfaces')}</SearchItem>
      </Title>
      <AddNetworkInterfaceButton
        onAddNetworkInterface={(
          networks: V1Network[],
          interfaces: V1Interface[],
          disks?: V1Disk[],
        ): Promise<V1VirtualMachine> => {
          const updatedVM = produce(vm, (draft) => {
            ensurePath(draft, 'spec.template.spec.domain.devices');

            draft.spec.template.spec.networks = networks;
            draft.spec.template.spec.domain.devices.interfaces = interfaces;

            if (disks !== undefined) draft.spec.template.spec.domain.devices.disks = disks;
          });
          replaceDraft(updatedVM, vm);
          return Promise.resolve(updatedVM);
        }}
        vm={vm}
      />
      <NetworkInterfaceList
        onUpdateVM={async (updatedVM) => {
          replaceDraft(updatedVM, vm);
        }}
        vm={vm}
      />
    </PageSection>
  );
};

export default CustomizeInstanceTypeNetworkTab;
