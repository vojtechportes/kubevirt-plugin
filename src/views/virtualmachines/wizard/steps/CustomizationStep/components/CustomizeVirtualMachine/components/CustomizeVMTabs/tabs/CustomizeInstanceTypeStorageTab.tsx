import { type FC } from 'react';
import produce from 'immer';

import type { V1VirtualMachine } from '@kubevirt-ui-ext/kubevirt-api/kubevirt';
import EnvironmentForm from '@kubevirt-utils/components/EnvironmentEditor/EnvironmentForm';
import Loading from '@kubevirt-utils/components/Loading/Loading';
import { getDataVolumeTemplates, getDisks, getVolumes } from '@kubevirt-utils/resources/vm';
import { ensurePath } from '@kubevirt-utils/utils/utils';
import { Divider, Grid, GridItem, PageSection } from '@patternfly/react-core';
import DiskList from '@virtualmachines/details/tabs/configuration/storage/components/tables/disk/DiskList';
import { useVMWizardForm } from '@virtualmachines/wizard/form/VMWizardFormProvider';
import { useWizardVMDraft } from '@virtualmachines/wizard/hooks/useWizardVMDraft';

const CustomizeInstanceTypeStorageTab: FC = () => {
  const { replaceDraft, vmDraft: vm } = useWizardVMDraft();
  const { getValues } = useVMWizardForm();

  if (!vm) {
    return <Loading />;
  }

  const getCurrentVM = (): null | V1VirtualMachine => getValues('customization.vmDraft');

  const updateDisks = async (updatedVM: V1VirtualMachine): Promise<V1VirtualMachine> => {
    const currentVM = getCurrentVM();

    if (!currentVM) return updatedVM;

    const committedVM = produce(currentVM, (draft) => {
      ensurePath(draft, 'spec.template.spec.domain.devices');

      draft.spec.dataVolumeTemplates = getDataVolumeTemplates(updatedVM);
      draft.spec.template.spec.domain.devices.disks = getDisks(updatedVM);
      draft.spec.template.spec.volumes = getVolumes(updatedVM);
    });

    return replaceDraft(committedVM, currentVM) ?? updatedVM;
  };

  return (
    <Grid hasGutter>
      <GridItem>
        <PageSection>
          <DiskList customize getCurrentVM={getCurrentVM} onDiskUpdate={updateDisks} vm={vm} />
        </PageSection>
      </GridItem>
      <GridItem>
        <Divider />
      </GridItem>
      <GridItem>
        <PageSection>
          <EnvironmentForm
            updateVM={async (updatedVM) => replaceDraft(updatedVM, vm) ?? updatedVM}
            vm={vm}
          />
        </PageSection>
      </GridItem>
    </Grid>
  );
};

export default CustomizeInstanceTypeStorageTab;
