import { ADMIN_ONLY_TAG, T1, T1_TAG } from '@/data-models/allure-constants';
import { expect, test } from '@/fixtures/create-vm-fixture';
import { setupTestNamespace } from '@/utils/test-setup-helpers';

const SUITE = 'VM Creation Wizard';

test.describe(
  'VM Creation Wizard — Custom configuration: Customization editing and persistence',
  { tag: [T1_TAG, '@catalog-wizard', ADMIN_ONLY_TAG] },
  () => {
    test('Description and boot order edits persist across Back/Next navigation and appear in Review', async ({
      apiClient,
      vmListPage,
      vmWizardNavigationPage,
      vmWizardBootSourcePage,
      vmWizardComputePage,
      utils,
    }) => {
      test.setTimeout(utils.TestTimeouts.TEST_MEDIUM);
      await utils.withAllure({
        suite: SUITE,
        feature: T1,
        tags: [T1_TAG],
      });

      const wizardNs = await setupTestNamespace(apiClient, 'wizard-custom-edit');

      await vmListPage.switchToVirtualizationPerspective();
      await vmListPage.navigateToProjectVmListViaUI(wizardNs);
      await vmWizardNavigationPage.openWizardFromCreateDropdown();

      const wizardVisible = await vmWizardNavigationPage.verifyWizardVisible();
      expect(wizardVisible, 'Wizard should open').toBe(true);

      await test.step('Step 1: Deployment details — Custom configuration, generate name', async () => {
        const isCustomSelected =
          await vmWizardNavigationPage.verifyCreationMethodCardSelected('newVm');
        expect
          .soft(isCustomSelected, 'Custom configuration should be selected by default')
          .toBe(true);

        await vmWizardNavigationPage.generateVmName();
        await vmWizardNavigationPage.clickNext();
      });

      await test.step('Step 2: Guest OS — wait for async OS type load, then Next', async () => {
        await expect
          .poll(() => vmWizardNavigationPage.isNextButtonDisabled(), {
            message: 'Next should enable once the guest OS type list finishes loading',
            timeout: utils.TestTimeouts.UI_ELEMENT_VISIBILITY,
          })
          .toBe(false);

        const selectedOs = await vmWizardNavigationPage.getSelectedOsType();
        expect.soft(selectedOs.length, 'A guest OS type should be pre-selected').toBeGreaterThan(0);

        await vmWizardNavigationPage.clickNext();
      });

      await test.step('Step 3: Boot source — select the first available volume', async () => {
        const bootStepVisible = await vmWizardBootSourcePage.verifyBootSourceStepVisible();
        expect.soft(bootStepVisible, 'Boot source step should be visible').toBe(true);

        await vmWizardBootSourcePage.selectFirstBootVolumeOrNone();
        await vmWizardNavigationPage.clickNext();
      });

      await test.step('Step 4: Compute resources — no changes, Next', async () => {
        const computeVisible = await vmWizardComputePage.verifyComputeResourcesStepVisible();
        expect.soft(computeVisible, 'Compute resources step should be visible').toBe(true);
        await vmWizardNavigationPage.clickNext();
      });

      let vmName = '';

      await test.step('Step 5: Customization — edit Description twice, verify each render', async () => {
        const custVisible = await vmWizardComputePage.verifyCustomizationStepVisible();
        expect(custVisible, 'Customization step should be visible').toBe(true);

        vmName = await vmWizardComputePage.getCustomizationVmName();
        expect(vmName.length, 'VM name should be available on the Details tab').toBeGreaterThan(0);

        await vmWizardComputePage.openCustomizationDescriptionModal(vmName);
        await vmWizardComputePage.fillCustomizationDescriptionModal('test');
        await vmWizardComputePage.saveCustomizationDescriptionModal();

        await expect
          .poll(() => vmWizardComputePage.getCustomizationDescription(vmName), {
            message: 'Description should render "test" after the first edit',
            timeout: utils.TestTimeouts.UI_ACTION_COMPLETE,
          })
          .toContain('test');

        await vmWizardComputePage.openCustomizationDescriptionModal(vmName);
        await vmWizardComputePage.fillCustomizationDescriptionModal('test test');
        await vmWizardComputePage.saveCustomizationDescriptionModal();

        await expect
          .poll(() => vmWizardComputePage.getCustomizationDescription(vmName), {
            message: 'Description should render "test test" after the second edit',
            timeout: utils.TestTimeouts.UI_ACTION_COMPLETE,
          })
          .toContain('test test');
      });

      let bootOrderAfterEdit: string[] = [];

      await test.step('Step 5 (cont.): edit Boot order twice, verify each render', async () => {
        await vmWizardComputePage.openBootOrderModal(vmName);
        const initialOrder = await vmWizardComputePage.getBootOrderModalDeviceNames();
        expect(initialOrder.length, 'Boot order modal should list at least one device').toBeGreaterThan(
          0,
        );

        if (initialOrder.length > 1) {
          await vmWizardComputePage.reorderBootDeviceInModal(initialOrder[0], 'down');
        }
        await vmWizardComputePage.saveBootOrderModal();

        const displayedOrderAfterFirstEdit = await vmWizardComputePage.getDisplayedBootOrder(vmName);
        expect(
          displayedOrderAfterFirstEdit.length,
          'Boot order should display the same number of devices after the first edit',
        ).toBe(initialOrder.length);

        if (initialOrder.length > 1) {
          await vmWizardComputePage.openBootOrderModal(vmName);
          await vmWizardComputePage.reorderBootDeviceInModal(displayedOrderAfterFirstEdit[0], 'down');
          await vmWizardComputePage.saveBootOrderModal();
        }

        bootOrderAfterEdit = await vmWizardComputePage.getDisplayedBootOrder(vmName);
        expect(
          bootOrderAfterEdit.length,
          'Boot order should display the same number of devices after the second edit',
        ).toBe(initialOrder.length);
      });

      await test.step('Back to Compute resources, then Next — edits should persist', async () => {
        await vmWizardNavigationPage.clickBack();
        const computeVisible = await vmWizardComputePage.verifyComputeResourcesStepVisible();
        expect(computeVisible, 'Back should return to Compute resources step').toBe(true);

        await vmWizardNavigationPage.clickNext();
        const custVisible = await vmWizardComputePage.verifyCustomizationStepVisible();
        expect(custVisible, 'Next should return to Customization step').toBe(true);

        const description = await vmWizardComputePage.getCustomizationDescription(vmName);
        expect(description, 'Description edit should persist after Back/Next').toContain(
          'test test',
        );

        const bootOrder = await vmWizardComputePage.getDisplayedBootOrder(vmName);
        expect(
          bootOrder,
          'Boot order edit should persist after Back/Next',
        ).toEqual(bootOrderAfterEdit);

        await vmWizardNavigationPage.clickNext();
      });

      await test.step('Step 6: Review and create — verify prior selections are displayed', async () => {
        const reviewVisible = await vmWizardComputePage.verifyReviewStepVisible();
        expect(reviewVisible, 'Review step should be visible').toBe(true);

        const sectionsVisible = await vmWizardComputePage.verifyReviewSectionsVisible();
        expect
          .soft(
            sectionsVisible,
            'Review sections (Details, Storage, Network, Hardware devices) should be visible',
          )
          .toBe(true);

        const reviewName = await vmWizardComputePage.getReviewVmName();
        expect(reviewName, 'Review should display the generated VM name').toBe(vmName);

        await vmWizardNavigationPage.clickCreateVm();
        const redirected = await vmWizardNavigationPage.verifyRedirectedToVmDetails();
        expect(redirected, 'Should redirect to VM details after creation').toBe(true);
      });

      await test.step('Verify VM resource was created', async () => {
        const createdVmName = await vmWizardNavigationPage.getCreatedVmNameFromUrl();
        expect(createdVmName.length, 'VM name should be in the URL').toBeGreaterThan(0);
        apiClient.trackResource('VirtualMachine', createdVmName, wizardNs);

        const result = await apiClient.verifyVmCreated(createdVmName, wizardNs);
        expect.soft(result.exists, `VM '${createdVmName}' should exist`).toBe(true);
      });
    });
  },
);
