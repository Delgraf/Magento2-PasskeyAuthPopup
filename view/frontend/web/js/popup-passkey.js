/**
 * Copyright © Delgraf. All rights reserved.
 * Licensed under the Open Software License version 3.0 (OSL-3.0). See LICENSE.txt for license details.
 *
 * Adds passkey sign-in to Magento's core authentication popup.
 *
 * MageOS_PasskeyAuth only renders its button on the login page, so this script
 * waits for the popup's login form, inserts a "Sign in with Passkey" button
 * below it and arms passkey autofill on the popup's email field.
 */
define([
    'jquery',
    'MageOS_PasskeyAuth/js/passkey-core',
    'Magento_Customer/js/customer-data',
    'mage/translate'
], function ($, passkeyCore, customerData, $t) {
    'use strict';

    var POPUP_FORM_SELECTOR = '.block-authentication .block-customer-login form',
        EMAIL_SELECTOR = '.block-authentication #customer-email',
        SECTION_CLASS = 'delgraf-passkey-popup';

    /**
     * Run the callback once the element exists (the popup is built by Knockout,
     * possibly after this script runs).
     */
    function whenPresent(selector, callback) {
        var element = document.querySelector(selector),
            observer;

        if (element) {
            callback(element);
            return;
        }

        observer = new MutationObserver(function () {
            var found = document.querySelector(selector);

            if (found) {
                observer.disconnect();
                callback(found);
            }
        });
        observer.observe(document.body, {childList: true, subtree: true});
    }

    /**
     * Build the button and message markup, reusing MageOS_PasskeyAuth's CSS classes.
     */
    function buildSection() {
        var $section = $('<div/>', {'class': 'passkey-login-section ' + SECTION_CLASS}),
            $button = $('<button/>', {
                type: 'button',
                'class': 'action passkey-login primary',
                title: $t('Sign in with Passkey')
            }).append($('<span/>').text($t('Sign in with Passkey'))),
            $message = $('<div/>', {'class': 'message', role: 'alert'}).hide().append('<div/>');

        $section
            .append($('<div/>', {'class': 'passkey-divider'}).append($('<span/>').text($t('or'))))
            .append($('<div/>', {'class': 'passkey-login-actions'}).append($button))
            .append($message);

        return $section;
    }

    /**
     * Reload so the header, minicart and private content show the signed-in customer.
     */
    function onSignedIn() {
        customerData.invalidate(['*']);
        window.location.reload();
    }

    /**
     * Modal WebAuthn ceremony started by the button.
     */
    function signIn(config, email) {
        return passkeyCore.postJson(
            config.optionsUrl,
            {email: email},
            $t('Unable to sign in with passkey. Please use your password.')
        ).then(function (serverOptions) {
            return navigator.credentials.get(passkeyCore.prepareRequestOptions(serverOptions))
                .then(function (credential) {
                    return {
                        challengeToken: serverOptions.challengeToken,
                        credential: passkeyCore.serializeAssertionResponse(credential)
                    };
                }, function (error) {
                    if (error && error.name === 'NotAllowedError') {
                        throw new Error($t(
                            'Passkey sign-in was cancelled, or no passkey for this account was found on this device.'
                        ));
                    }
                    throw new Error($t('Unable to sign in with passkey. Please use your password.'));
                });
        }).then(function (assertion) {
            return passkeyCore.postJson(
                config.verifyUrl,
                assertion,
                $t('Passkey verification failed. Please try again.')
            );
        });
    }

    function attach(form, config) {
        var $section, $button, $message;

        if ($(form).siblings('.' + SECTION_CLASS).length) {
            return;
        }

        $section = buildSection();
        $button = $section.find('button');
        $message = $section.find('.message');
        $(form).after($section);

        function showMessage(text, type) {
            $message.removeClass('error success').addClass(type).show().find('div').text(text);
        }

        function setBusy(busy) {
            $button.prop('disabled', busy)
                .attr('aria-busy', busy ? 'true' : 'false')
                .find('span')
                .text(busy ? $t('Waiting for your passkey…') : $t('Sign in with Passkey'));
        }

        $button.on('click', function () {
            $message.hide();
            setBusy(true);

            // Browsers allow one active WebAuthn request: stop autofill before the modal ceremony
            passkeyCore.abortConditional();

            signIn(config, $(EMAIL_SELECTOR).val() || '')
                .then(function () {
                    showMessage($t('Signed in. One moment…'), 'success');
                    onSignedIn();
                })
                .catch(function (error) {
                    showMessage(error.message || $t('Passkey sign-in failed.'), 'error');
                    setBusy(false);
                    passkeyCore.restartConditional();
                });
        });

        armAutofillOnOpen(form, config);
    }

    /**
     * Passkey suggestions in the email field's autofill dropdown.
     *
     * The popup's markup is on every page, so autofill is armed only when the popup
     * first opens: arming it on page load would request a challenge on every page
     * view and could hit MageOS_PasskeyAuth's per-IP rate limit.
     */
    function armAutofillOnOpen(form, config) {
        var armed = false;

        function arm() {
            if (armed) {
                return;
            }
            armed = true;
            passkeyCore.startConditional({
                optionsUrl: config.optionsUrl,
                verifyUrl: config.verifyUrl,
                selectors: EMAIL_SELECTOR,
                onSuccess: onSignedIn
            });
        }

        // Core's modal widget triggers "modalopened" on the popup content element
        $(document).on('modalopened', function (event) {
            if ($.contains(event.target, form)) {
                arm();
            }
        });

        if (form.offsetParent !== null) {
            arm();
        }
    }

    return function (config) {
        if (!config.optionsUrl || !config.verifyUrl || !passkeyCore.isAvailable()) {
            return;
        }

        whenPresent(POPUP_FORM_SELECTOR, function (form) {
            attach(form, config);
        });
    };
});
