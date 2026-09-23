import { type FC } from 'react';

import DescriptionItem from '@kubevirt-utils/components/DescriptionItem/DescriptionItem';
import { TREE_VIEW_FOLDERS } from '@kubevirt-utils/hooks/useFeatures/constants';
import { useFeatures } from '@kubevirt-utils/hooks/useFeatures/useFeatures';
import { useKubevirtTranslation } from '@kubevirt-utils/hooks/useKubevirtTranslation';
import { getFolder, NO_DATA_DASH } from '@kubevirt-utils/resources/vm';
import { getCluster } from '@multicluster/helpers/selectors';
import { DescriptionList, ExpandableSection } from '@patternfly/react-core';
import { type WizardReviewModel } from '@virtualmachines/wizard/form/review';

import CloneDescriptionInput from './CloneDescriptionInput';
import CloneNameInput from './CloneNameInput';

type ReviewGridLeftColumnProps = {
  review: WizardReviewModel;
};

const ReviewGridLeftColumn: FC<ReviewGridLeftColumnProps> = ({ review }) => {
  const { t } = useKubevirtTranslation();
  const { configurationVM, isCloneMethod, target } = review;

  const { featureEnabled: treeViewFoldersEnabled, loading: treeViewFoldersLoading } =
    useFeatures(TREE_VIEW_FOLDERS);

  return (
    <ExpandableSection isExpanded isIndented toggleText={t('Details')}>
      <DescriptionList isHorizontal>
        {isCloneMethod ? (
          <>
            <CloneNameInput />
            <CloneDescriptionInput />
          </>
        ) : (
          <DescriptionItem
            descriptionData={target.name ?? NO_DATA_DASH}
            descriptionHeader={t('Name')}
          />
        )}
        <DescriptionItem
          descriptionData={getCluster(configurationVM) ?? NO_DATA_DASH}
          descriptionHeader={t('Cluster')}
        />
        <DescriptionItem
          descriptionData={target.project ?? NO_DATA_DASH}
          descriptionHeader={t('Project')}
        />
        {!treeViewFoldersLoading && treeViewFoldersEnabled && (
          <DescriptionItem
            descriptionData={getFolder(configurationVM) ?? NO_DATA_DASH}
            descriptionHeader={t('Group')}
          />
        )}
      </DescriptionList>
    </ExpandableSection>
  );
};

export default ReviewGridLeftColumn;
