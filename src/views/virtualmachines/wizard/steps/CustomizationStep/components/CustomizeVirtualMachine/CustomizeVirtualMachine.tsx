import type { FC } from 'react';

import { Stack, StackItem } from '@patternfly/react-core';
import CustomizeVMTabs from '@virtualmachines/wizard/steps/CustomizationStep/components/CustomizeVirtualMachine/components/CustomizeVMTabs/CustomizeVMTabs';

const CustomizeVirtualMachine: FC = () => {
  return (
    <Stack>
      <StackItem isFilled>
        <CustomizeVMTabs />
      </StackItem>
    </Stack>
  );
};

export default CustomizeVirtualMachine;
