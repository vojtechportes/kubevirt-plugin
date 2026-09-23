import { type FC } from 'react';
import { useWatch } from 'react-hook-form';

import { Flex, FlexItem } from '@patternfly/react-core';
import { resetCreationMethodValues } from '@virtualmachines/wizard/form/defaultValues';
import { useVMWizardForm } from '@virtualmachines/wizard/form/VMWizardFormProvider';
import { useVMWizardState } from '@virtualmachines/wizard/state/useVMWizardState';
import { VMCreationMethod } from '@virtualmachines/wizard/utils/constants';
import { cancelWizardPendingUploads } from '@virtualmachines/wizard/utils/utils';

import CreationMethodTile from './components/CreationMethodTile/CreationMethodTile';

import './CreationMethodTileGroup.scss';

const CreationMethodTileGroup: FC = () => {
  const { control, getValues, reset } = useVMWizardForm();
  const { resetNavigation } = useVMWizardState();

  const creationMethod: VMCreationMethod = useWatch({
    control,
    name: 'creationMethod',
  });

  const changeCreationMethod = (method: VMCreationMethod): void => {
    if (creationMethod === method) return;

    const values = getValues();

    cancelWizardPendingUploads(
      values.customization.vmDraft,
      values.customization.pendingBootableVolumeUploadKeys,
    );

    reset(resetCreationMethodValues(values, method));
    resetNavigation();
  };

  return (
    <Flex
      className="vm-creation-method-tile-group"
      flexWrap={{ default: 'wrap' }}
      gap={{ default: 'gapMd' }}
      justifyContent={{ default: 'justifyContentFlexStart' }}
    >
      {[VMCreationMethod.INSTANCE_TYPE, VMCreationMethod.TEMPLATE, VMCreationMethod.CLONE].map(
        (method) => (
          <FlexItem className="vm-creation-method-tile-group__item" key={method}>
            <CreationMethodTile
              creationMethod={method}
              isChecked={creationMethod === method}
              setSelectedCreationMethod={changeCreationMethod}
            />
          </FlexItem>
        ),
      )}
    </Flex>
  );
};

export default CreationMethodTileGroup;
