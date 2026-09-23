import { type FC } from 'react';
import { useWatch } from 'react-hook-form';
import produce from 'immer';

import { useRunStrategyToggle } from '@kubevirt-utils/components/RunStrategyModal/useRunStrategyToggle';
import {
  getStartAfterCreationLabel,
  START_AFTER_CREATION_CHECKBOX_ID,
} from '@kubevirt-utils/components/RunStrategyModal/utils';
import { useKubevirtTranslation } from '@kubevirt-utils/hooks/useKubevirtTranslation';
import { ensurePath } from '@kubevirt-utils/utils/utils';
import { Checkbox, Stack, StackItem, Title, TitleSizes } from '@patternfly/react-core';
import { useVMWizardForm } from '@virtualmachines/wizard/form/VMWizardFormProvider';
import ReviewGrid from '@virtualmachines/wizard/steps/ReviewAndCreateStep/components/ReviewGrid/ReviewGrid';
import { isCloneCreationMethod } from '@virtualmachines/wizard/utils/utils';

const ReviewAndCreateStep: FC = () => {
  const { t } = useKubevirtTranslation();
  const { control, getValues, setValue } = useVMWizardForm();
  const [creationMethod, sourceVM, vmDraft] = useWatch({
    control,
    name: ['creationMethod', 'clone.sourceVM', 'customization.vmDraft'],
  });
  const isCloneMethod = isCloneCreationMethod(creationMethod);

  const configurationVM = isCloneMethod ? sourceVM : vmDraft;

  const { isStartChecked, onToggle } = useRunStrategyToggle(configurationVM ?? undefined);

  return (
    <Stack hasGutter>
      <StackItem>
        <Title headingLevel="h1" size={TitleSizes.lg}>
          {t('Review and create')}
        </Title>
      </StackItem>
      <StackItem>
        {isCloneMethod
          ? t(
              'Before you clone your VirtualMachine, review its configuration. You can create your own unique VM name, or we can generate a name for you.',
            )
          : t('Before you create your VirtualMachine, review its configuration.')}
      </StackItem>
      <StackItem>
        <ReviewGrid />
      </StackItem>
      <StackItem isFilled />
      <StackItem>
        <Checkbox
          id={START_AFTER_CREATION_CHECKBOX_ID}
          isChecked={isStartChecked}
          label={getStartAfterCreationLabel(t)}
          onChange={(_event, checked: boolean) => {
            const { newStrategy } = onToggle(checked);
            const path = isCloneMethod ? 'clone.sourceVM' : 'customization.vmDraft';
            const currentVM = getValues(path);
            if (!currentVM) return;
            setValue(
              path,
              produce(currentVM, (draft) => {
                ensurePath(draft, 'spec');
                draft.spec.runStrategy = newStrategy;
              }),
              { shouldValidate: true },
            );
          }}
        />
      </StackItem>
    </Stack>
  );
};

export default ReviewAndCreateStep;
