import type { FC } from 'react';

import { DescriptionList, GridItem } from '@patternfly/react-core';

import DetailsEditableItems from './DetailsEditableItems';
import DetailsToggleItems from './DetailsToggleItems';

type DetailsLeftColumnProps = {
  isGuestSystemLogsDisabled: boolean;
  treeViewFoldersEnabled: boolean;
};

const DetailsLeftColumn: FC<DetailsLeftColumnProps> = ({
  isGuestSystemLogsDisabled,
  treeViewFoldersEnabled,
}) => {
  return (
    <GridItem span={5}>
      <DescriptionList>
        <DetailsEditableItems treeViewFoldersEnabled={treeViewFoldersEnabled} />
        <DetailsToggleItems isGuestSystemLogsDisabled={isGuestSystemLogsDisabled} />
      </DescriptionList>
    </GridItem>
  );
};

export default DetailsLeftColumn;
