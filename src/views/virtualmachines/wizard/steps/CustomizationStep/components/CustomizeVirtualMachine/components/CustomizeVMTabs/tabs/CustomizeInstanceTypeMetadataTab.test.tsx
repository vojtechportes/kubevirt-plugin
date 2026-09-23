import { DESCRIPTION_ANNOTATION } from '@kubevirt-utils/resources/vm/utils/annotations';
import { act, render } from '@testing-library/react';
import { VM_FOLDER_LABEL } from '@virtualmachines/tree/utils/constants';

import CustomizeInstanceTypeMetadataTab from './CustomizeInstanceTypeMetadataTab';

const mockVM = {
  apiVersion: 'kubevirt.io/v1',
  kind: 'VirtualMachine',
  metadata: {
    annotations: { [DESCRIPTION_ANNOTATION]: 'old description' },
    labels: { [VM_FOLDER_LABEL]: 'old-folder' },
    name: 'test-vm',
  },
};
const mockGetValues = jest.fn();
const mockReplaceDraft = jest.fn((replacement) => replacement);
const mockSetValue = jest.fn();
let mockMetadataTabProps: {
  onAnnotationsSubmit: (annotations: Record<string, string>) => Promise<unknown>;
  onLabelsSubmit: (labels: Record<string, string>) => Promise<unknown>;
};

jest.mock(
  '@virtualmachines/details/tabs/configuration/metadata/components/MetadataTabContent',
  () =>
    jest.fn((props) => {
      mockMetadataTabProps = props;
      return null;
    }),
);
jest.mock('@kubevirt-utils/utils/utils', () => ({
  ensurePath: (resource: { metadata?: object }) => {
    resource.metadata ??= {};
  },
}));
jest.mock('@virtualmachines/wizard/form/VMWizardFormProvider', () => ({
  useVMWizardForm: () => ({ getValues: mockGetValues, setValue: mockSetValue }),
}));
jest.mock('@virtualmachines/wizard/hooks/useWizardVMDraft', () => ({
  useWizardVMDraft: () => ({ replaceDraft: mockReplaceDraft, vmDraft: mockVM }),
}));

describe('CustomizeInstanceTypeMetadataTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('synchronizes description and folder metadata with deployment fields', async () => {
    mockGetValues.mockReturnValue('old value');
    render(<CustomizeInstanceTypeMetadataTab />);

    await act(() =>
      mockMetadataTabProps.onAnnotationsSubmit({ [DESCRIPTION_ANNOTATION]: 'new description' }),
    );
    await act(() => mockMetadataTabProps.onLabelsSubmit({ [VM_FOLDER_LABEL]: 'new-folder' }));

    expect(mockSetValue).toHaveBeenCalledWith('deployment.description', 'new description', {
      shouldDirty: true,
    });
    expect(mockSetValue).toHaveBeenCalledWith('deployment.folder', 'new-folder', {
      shouldDirty: true,
    });
  });

  it('clears deployment fields when their metadata keys are removed', async () => {
    mockGetValues.mockReturnValue('old value');
    render(<CustomizeInstanceTypeMetadataTab />);

    await act(() => mockMetadataTabProps.onAnnotationsSubmit({}));
    await act(() => mockMetadataTabProps.onLabelsSubmit({}));

    expect(mockSetValue).toHaveBeenCalledWith('deployment.description', '', {
      shouldDirty: true,
    });
    expect(mockSetValue).toHaveBeenCalledWith('deployment.folder', '', { shouldDirty: true });
  });
});
