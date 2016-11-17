export { initialize };
/*
Automatically expose translations for addon in a way that can be merged in with app
    https://github.com/jamesarosen/ember-i18n/issues/255
 */
import enUS from 'ember-osf/locales/en-us/translations';

function initialize(appInstance) {
    var i18n = appInstance.lookup('service:i18n');
    i18n.addTranslations('en-US', enUS);
}

export default {
    name: 'ember-osf',
    initialize: initialize
};