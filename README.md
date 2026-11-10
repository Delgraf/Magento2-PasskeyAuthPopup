# Passkey sign-in for the Magento 2 authentication popup

`Delgraf_PasskeyAuthPopup` is a small add-on for [mage-os/module-passkey-auth](https://github.com/mage-os/module-passkey-auth).

That module adds passkey (WebAuthn) sign-in to the customer login page, but not to Magento's **authentication popup**: the "Sign In" modal that many Luma-based themes open from the header account menu. This add-on brings passkey sign-in to that popup.

## Features

- A **Sign in with Passkey** button below the popup's login form, styled with the base module's CSS classes.
- Passkey suggestions in the email field's autofill dropdown (WebAuthn conditional mediation), in browsers that support it.
- After a passkey sign-in the current page reloads, like the popup's password sign-in, and private content (header, minicart) is refreshed.
- Autofill is armed only when the popup opens, so normal page views don't request WebAuthn challenges or use up the base module's per-IP rate limit.
- Turns itself off on the login page and on checkout, where the base module already handles passkeys.
- Follows the base module's **Enable Passkey Authentication** setting and renders nothing for signed-in customers.
- No PHP classes, database tables or configuration of its own.

## Requirements

- Magento Open Source / Adobe Commerce 2.4.x or Mage-OS, PHP 8.2+
- [mage-os/module-passkey-auth](https://github.com/mage-os/module-passkey-auth) 1.x, enabled and configured
- A Luma-based theme that uses the core authentication popup (`Magento_Customer/js/view/authentication-popup`). Hyvä themes are not supported.
- HTTPS (required by WebAuthn)

## Installation

Run all commands from the Magento root directory, as the user that owns the Magento files. Back up your code and database first, and try the module on a staging site before production.

Install and enable [mage-os/module-passkey-auth](https://github.com/mage-os/module-passkey-auth) first. With Composer it is installed automatically as a dependency, but it must still be configured.

### Option 1: Composer (recommended)

1. Put the store in maintenance mode (production stores only):

   ```bash
   bin/magento maintenance:enable
   ```

2. Download the module:

   ```bash
   composer require delgraf/module-passkey-auth-popup
   ```

3. Enable the module and update Magento:

   ```bash
   bin/magento module:enable Delgraf_PasskeyAuthPopup
   bin/magento setup:upgrade
   ```

4. In production mode, compile and deploy static content. List every locale your store views use, for example `en_US it_IT`:

   ```bash
   bin/magento setup:di:compile
   bin/magento setup:static-content:deploy en_US it_IT
   ```

5. Clear the cache and leave maintenance mode:

   ```bash
   bin/magento cache:flush
   bin/magento maintenance:disable
   ```

### Option 2: Manual (app/code)

1. Download the latest version as a ZIP from the [Tags page](https://github.com/Delgraf/Magento2-PasskeyAuthPopup/tags) and extract it.
2. Copy its contents to `app/code/Delgraf/PasskeyAuthPopup/`, so that `registration.php` is at `app/code/Delgraf/PasskeyAuthPopup/registration.php`.
3. Run steps 1 and 3 to 5 of the Composer installation.

### Check the installation

1. Check that the module is enabled:

   ```bash
   bin/magento module:status Delgraf_PasskeyAuthPopup
   ```

2. Make sure **Enable Passkey Authentication** is set to **Yes** (see [Configuration](#configuration)).
3. On the storefront, sign out, open the account menu and click **Sign In**. The popup should show a **Sign in with Passkey** button below the login form.

## Update

Read the [CHANGELOG](CHANGELOG.md) before updating, and back up your code and database. The module follows [Semantic Versioning](https://semver.org/): minor and patch versions (1.x) are backward compatible, while a new major version (2.0) may need changes on your side.

### Installed with Composer

1. Check the installed version and whether a newer one is available:

   ```bash
   composer show delgraf/module-passkey-auth-popup
   composer outdated delgraf/module-passkey-auth-popup
   ```

2. Put the store in maintenance mode (production stores only):

   ```bash
   bin/magento maintenance:enable
   ```

3. Update the package. This stays within the version range in your `composer.json` (for example `^1.0`), so it never jumps to a new major version:

   ```bash
   composer update delgraf/module-passkey-auth-popup
   ```

   To move to a new major version, change the constraint on purpose, for example `composer require delgraf/module-passkey-auth-popup:^2.0`.

4. Update Magento, recompile and redeploy static content (production mode), then clear the cache and leave maintenance mode:

   ```bash
   bin/magento setup:upgrade
   bin/magento setup:di:compile
   bin/magento setup:static-content:deploy en_US it_IT
   bin/magento cache:flush
   bin/magento maintenance:disable
   ```

### Installed manually (app/code)

1. Download the new version as a ZIP from the [Tags page](https://github.com/Delgraf/Magento2-PasskeyAuthPopup/tags) and extract it.
2. Put the store in maintenance mode (step 2 above).
3. Delete the old files and copy in the new ones, so that no file from the old version is left behind:

   ```bash
   rm -rf app/code/Delgraf/PasskeyAuthPopup
   mkdir -p app/code/Delgraf/PasskeyAuthPopup
   cp -R /path/to/extracted/Magento2-PasskeyAuthPopup-x.y.z/. app/code/Delgraf/PasskeyAuthPopup/
   ```

4. Run step 4 above.

### After updating

- Check the version: `composer show delgraf/module-passkey-auth-popup`, or the `CHANGELOG.md` in the module folder for a manual installation.
- Test the popup sign-in as described in [Check the installation](#check-the-installation).
- If the old button still appears, clear your browser cache or test in a private window: the browser may keep the old JavaScript file.

When you update `mage-os/module-passkey-auth`, check this add-on still works too, since it uses the base module's JavaScript and endpoints.

## Configuration

There is nothing to configure. Turn on passkeys in the base module:

**Stores > Configuration > Customers > Customer Configuration > Passkey Authentication > Enable Passkey Authentication = Yes**

## Translations

The button and messages reuse the base module's strings, so any translation of `mage-os/module-passkey-auth` (module CSV, language pack or theme) also translates this add-on.

## How it works

- `view/frontend/layout/default.xml` adds a block to `before.body.end`, using the base module's `ConditionalLogin` block for the endpoint URLs and the signed-in check.
- `view/frontend/web/js/popup-passkey.js` waits for the popup's login form, inserts the button and starts autofill on the core modal's `modalopened` event. The WebAuthn ceremony goes through the base module's `passkey-core.js` and endpoints, so all security checks (challenge handling, rate limiting, account checks) stay in the base module.
- `checkout_index_index.xml` and `customer_account_login.xml` remove the block on those pages, since a browser allows only one active WebAuthn request.

## Uninstall

The module stores no data and adds no database tables or configuration, so removing its code is all it takes. Customers' passkeys belong to `mage-os/module-passkey-auth` and are not affected: they keep working on the login page.

To only hide the button for a while, disable the module (step 2) and skip removing the files.

### Installed with Composer

1. Put the store in maintenance mode (production stores only):

   ```bash
   bin/magento maintenance:enable
   ```

2. Disable the module:

   ```bash
   bin/magento module:disable Delgraf_PasskeyAuthPopup
   ```

3. Remove the package:

   ```bash
   composer remove delgraf/module-passkey-auth-popup
   ```

4. Update Magento, recompile and redeploy static content (production mode), then clear the cache and leave maintenance mode:

   ```bash
   bin/magento setup:upgrade
   bin/magento setup:di:compile
   bin/magento setup:static-content:deploy en_US it_IT
   bin/magento cache:flush
   bin/magento maintenance:disable
   ```

Alternatively, `bin/magento module:uninstall Delgraf_PasskeyAuthPopup` does steps 2 and 3 in one command, also for Composer installations only.

### Installed manually (app/code)

1. Run steps 1 and 2 above.
2. Delete the module folder:

   ```bash
   rm -rf app/code/Delgraf/PasskeyAuthPopup
   ```

   If `app/code/Delgraf/` is now empty, you can delete it too.

3. Run step 4 above.

### Removing the base module too

This module depends on `mage-os/module-passkey-auth`. Uninstall this add-on first; Magento refuses to disable the base module while `Delgraf_PasskeyAuthPopup` is still enabled.

## License

[OSL-3.0](LICENSE.txt) (Open Software License 3.0)
