/**
 * Interceptor
 * Belongs to Decentraleyes.
 *
 * @author      Thomas Rientjes
 * @since       2016-04-06
 * @license     MPL 2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

'use strict';

/**
 * Interceptor
 */

var interceptor = {};

/**
 * Public Methods
 */

interceptor.handleRequest = function (requestDetails, tabIdentifier, tab) {

    let validCandidate, tabDomain, targetDetails, targetPath;

    validCandidate = requestAnalyzer.isValidCandidate(requestDetails, tab);

    if (!validCandidate) {

        return {
            'cancel': false
        };
    }

    try {
        tabDomain = tab.url.match(Address.DOMAIN_EXPRESSION)[1];
        tabDomain = requestAnalyzer._normalizeDomain(tabDomain);
    } catch (exception) {
        tabDomain = Address.EXAMPLE;
    }

    // Temporary list of undetectable tainted domains.
    let undetectableTaintedDomains = {
        'cdnjs.com': true,
        'dropbox.com': true,
        'glowing-bear.org': true,
        'jadi.sk': true,
        'minigames.mail.ru': true,
        'report-uri.io': true,
        'scotthelme.co.uk': true,
        'securityheaders.io': true,
        'stefansundin.github.io': true,
        'udacity.com': true,
        'yourvotematters.co.uk': true
    };

    if (undetectableTaintedDomains[tabDomain] || (/yandex\./).test(tabDomain)) {

        if (tabDomain !== 'yandex.ru') {
            return interceptor._handleMissingCandidate(requestDetails.url);
        }
    }

    targetDetails = requestAnalyzer.getLocalTarget(requestDetails);
    targetPath = targetDetails.path;

    if (!targetPath) {
        return interceptor._handleMissingCandidate(requestDetails.url);
    }

    if (!files[targetPath]) {
        return interceptor._handleMissingCandidate(requestDetails.url);
    }

    stateManager.requests[requestDetails.requestId] = {
        tabIdentifier, targetDetails
    };

    return {
        'redirectUrl': chrome.extension.getURL(targetPath)
    };
};

/**
 * Private Methods
 */

interceptor._handleMissingCandidate = function (requestUrl) {

    if (interceptor.blockMissing === true) {

        return {
            'cancel': true
        };
    }

    if (requestUrl.match(Address.HTTP_EXPRESSION)) {

        let secureRequestUrl = requestUrl.replace(Address.HTTP_EXPRESSION, Address.HTTPS);

        return {
            'redirectUrl': secureRequestUrl
        };

    } else {

        return {
            'cancel': false
        };
    }
};

interceptor._handleStorageChanged = function (changes) {

    if (Setting.BLOCK_MISSING in changes) {
        interceptor.blockMissing = changes.blockMissing.newValue;
    }
};

/**
 * Initializations
 */

interceptor.amountInjected = 0;
interceptor.blockMissing = false;

chrome.storage.local.get([Setting.AMOUNT_INJECTED, Setting.BLOCK_MISSING], function (items) {

    interceptor.amountInjected = items.amountInjected || 0;
    interceptor.blockMissing = items.blockMissing || false;
});

/**
 * Event Handlers
 */

chrome.storage.onChanged.addListener(interceptor._handleStorageChanged);
