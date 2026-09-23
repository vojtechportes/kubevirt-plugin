import type { FC } from 'react';
import { useWatch } from 'react-hook-form';

import { Grid, GridItem, Stack } from '@patternfly/react-core';
import { mapWizardValuesToReview } from '@virtualmachines/wizard/form/review';
import { type VMWizardFormValues } from '@virtualmachines/wizard/form/types';
import { useVMWizardForm } from '@virtualmachines/wizard/form/VMWizardFormProvider';
import ReviewGridLeftColumn from '@virtualmachines/wizard/steps/ReviewAndCreateStep/components/ReviewGrid/components/ReviewGridLeftColumn';

import ReviewGridRightColumn from './components/ReviewGridRightColumn/ReviewGridRightColumn';

const ReviewGrid: FC = () => {
  const { control } = useVMWizardForm();
  const values = useWatch({ control }) as VMWizardFormValues;
  const reviewModel = mapWizardValuesToReview(values);

  return (
    <Stack hasGutter>
      <Grid hasGutter>
        <GridItem span={6}>
          <ReviewGridLeftColumn review={reviewModel} />
        </GridItem>
        <GridItem span={6}>
          <ReviewGridRightColumn vm={reviewModel.configurationVM} />
        </GridItem>
      </Grid>
    </Stack>
  );
};

export default ReviewGrid;
