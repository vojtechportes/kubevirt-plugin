import { type FC } from 'react';

import DescriptionItem from '@kubevirt-utils/components/DescriptionItem/DescriptionItem';
import { DescriptionModal } from '@kubevirt-utils/components/DescriptionModal/DescriptionModal';
import HostnameModal from '@kubevirt-utils/components/HostnameModal/HostnameModal';
import { useModal } from '@kubevirt-utils/components/ModalProvider/ModalProvider';
import MoveVMToFolderModal from '@kubevirt-utils/components/MoveVMToFolderModal/MoveVMToFolderModal';
import MutedTextSpan from '@kubevirt-utils/components/MutedTextSpan/MutedTextSpan';
import SearchItem from '@kubevirt-utils/components/SearchItem/SearchItem';
import { useKubevirtTranslation } from '@kubevirt-utils/hooks/useKubevirtTranslation';
import { getAnnotation, getLabel, getName } from '@kubevirt-utils/resources/shared';
import { DESCRIPTION_ANNOTATION, getHostname } from '@kubevirt-utils/resources/vm';
import { VM_FOLDER_LABEL } from '@virtualmachines/tree/utils/constants';
import { useVMWizardForm } from '@virtualmachines/wizard/form/VMWizardFormProvider';
import { useWizardVMDraft } from '@virtualmachines/wizard/hooks/useWizardVMDraft';

import CPUMemory from './CPUMemory';

type DetailsEditableItemsProps = {
  treeViewFoldersEnabled: boolean;
};

const DetailsEditableItems: FC<DetailsEditableItemsProps> = ({ treeViewFoldersEnabled }) => {
  const { t } = useKubevirtTranslation();
  const { createModal } = useModal();

  const { replaceDraft, vmDraft: vm } = useWizardVMDraft();
  const { setValue } = useVMWizardForm();
  const vmName = getName(vm);
  const hostname = getHostname(vm);
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty string must fall back
  const displayHostname = hostname || vmName;

  return (
    <>
      <DescriptionItem
        data-test={`${vmName}-description`}
        descriptionData={
          getAnnotation(vm, DESCRIPTION_ANNOTATION) ?? <MutedTextSpan text={t('None')} />
        }
        descriptionHeader={<SearchItem id="description">{t('Description')}</SearchItem>}
        isEdit
        onEditClick={() => {
          if (!vm) return;
          createModal(({ isOpen, onClose }) => (
            <DescriptionModal
              isOpen={isOpen}
              obj={vm}
              onClose={onClose}
              onSubmit={(description) => {
                setValue('deployment.description', description, { shouldDirty: true });
                if (!description) return Promise.resolve(undefined);
                return Promise.resolve(
                  replaceDraft(
                    {
                      ...vm,
                      metadata: {
                        ...vm.metadata,
                        annotations: {
                          ...vm.metadata?.annotations,
                          [DESCRIPTION_ANNOTATION]: description,
                        },
                      },
                    },
                    vm,
                  ) ?? undefined,
                );
              }}
            />
          ));
        }}
      />
      <CPUMemory />
      {treeViewFoldersEnabled && (
        <DescriptionItem
          data-test={`${vmName}-folder`}
          descriptionData={getLabel(vm, VM_FOLDER_LABEL)}
          descriptionHeader={<SearchItem id="folder">{t('Group')}</SearchItem>}
          isEdit
          onEditClick={() => {
            if (!vm) return;
            createModal(({ isOpen, onClose }) => (
              <MoveVMToFolderModal
                isOpen={isOpen}
                onClose={onClose}
                onSubmit={(folder) => {
                  setValue('deployment.folder', folder, { shouldDirty: true });
                  if (!folder) return Promise.resolve(undefined);
                  return Promise.resolve(
                    replaceDraft(
                      {
                        ...vm,
                        metadata: {
                          ...vm.metadata,
                          labels: { ...vm.metadata?.labels, [VM_FOLDER_LABEL]: folder },
                        },
                      },
                      vm,
                    ) ?? undefined,
                  );
                }}
                vm={vm}
              />
            ));
          }}
        />
      )}
      <DescriptionItem
        data-test={`${vmName}-hostname`}
        descriptionData={displayHostname}
        descriptionHeader={<SearchItem id="hostname">{t('Hostname')}</SearchItem>}
        isEdit
        onEditClick={() =>
          createModal(({ isOpen, onClose }) =>
            vm ? (
              <HostnameModal
                isOpen={isOpen}
                onClose={onClose}
                onSubmit={(updatedVM) => Promise.resolve(replaceDraft(updatedVM, vm) ?? undefined)}
                vm={vm}
              />
            ) : null,
          )
        }
      />
    </>
  );
};

export default DetailsEditableItems;
