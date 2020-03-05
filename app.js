const typeInfoRegex = /^:([a-z])(\((.+)\))?/;

let settings ={
  id:'',
  WebhookToken:'',
  optional:{
    username:'Translate error',
    avatar:'https://imgur.com/sK2kaum.png',
  }
}

var I18n = {

  _localizers: {
    s /*string*/: v => v.toLocaleString(I18n.locale),
    c /*currency*/: (v, currency) => (
        v.toLocaleString(I18n.locale, {
          style: 'currency',
          currency: I18n.currency || I18n.defaultCurrency
        })
    ),
    n /*number*/: (v, fractionalDigits) => (
        v.toLocaleString(I18n.locale, {
          minimumFractionDigits: fractionalDigits,
          maximumFractionDigits: fractionalDigits
        })
    )
  },

  _extractTypeInfo(literal) {
    let match = typeInfoRegex.exec(literal);
    if (match) {
      return {type: match[1], options: match[3]};
    } else {
      return {type: 's', options: ''};
    }
  },

  _localize(value, {type, options}) {
    return I18n._localizers[type](value, options);
  },

  // e.g. I18n._buildKey(['', ' has ', ':c in the']) == '{0} has {1} in the bank'
  _buildKey(literals) {
    let stripType = s => s.replace(typeInfoRegex, '');
    let lastPartialKey = stripType(literals[literals.length - 1]);
    let prependPartialKey = (memo, curr, i) => `${stripType(curr)}{${i}}${memo}`;

    return literals.slice(0, -1).reduceRight(prependPartialKey, lastPartialKey);
  },

  // e.g. I18n._formatStrings('{0} {1}!', 'hello', 'world') == 'hello world!'
  _buildMessage(str, ...values) {
    return str.replace(/{(\d)}/g, (_, index) => values[Number(index)]);
  },
  _sendWebhook(translationKey){

    if(!settings.id) return
    if(!settings.WebhookToken) return

    const {WebhookClient } = require('discord.js');
    const webhookClient = new WebhookClient(settings.id, settings.WebhookToken);
    webhookClient.send( {
      username: settings.optional.username,
      avatarURL: settings.optional.avatar,
      embeds: [{
        title:'Error Translate',
        description:`Missing Translation\n${translationKey}`
      }],
    });

  },
};

function initWebhook(Webhookid,WebhookToken,username,avatarURL){
  if(!Webhookid) return console.log(`No ID Provided`)
  if(!WebhookToken) return console.log(`No Webhook token provided`)

  settings.id = Webhookid
  settings.WebhookToken = WebhookToken
  settings.optional.avatar = avatarURL ?  avatarURL:settings.optional.avatar
  settings.optional.username = username ?  username:settings.optional.username

}

function init({bundles, defaultCurrency}) {
  I18n.bundles = bundles;
  I18n.defaultCurrency = defaultCurrency;
}

function use (lang) {
  I18n.lang = lang;
  I18n.locale = I18n.bundles[lang].locale;
  I18n.currency = I18n.bundles[lang].currency;
}

function translate(literals, ...values) {
  let translationKey = I18n._buildKey(literals);
  let translationString = I18n.bundles[I18n.lang].strings[translationKey];

  if (translationString) {
    let typeInfoForValues = literals.slice(1).map(I18n._extractTypeInfo);
    let localizedValues = values.map((v, i) => I18n._localize(v, typeInfoForValues[i]));
    return I18n._buildMessage(translationString, ...localizedValues);
  }else{
    I18n._sendWebhook(translationKey)
    console.log(`Missing translation key in ${module.parent.filename}:\n${translationKey}`)
  }

  return I18n._buildMessage(translationKey, ...values);
}

function bundleFromLocale (locale) {
  for(const lang in I18n.bundles) {
    const bundle = I18n.bundles[lang];
    if(bundle.locale === locale)
      return lang;
  }
  return null;
}

module.exports = {
  init,
  use,
  translate,
  initWebhook,
  bundleFromLocale
}

