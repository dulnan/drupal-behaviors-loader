/**
 * webpack-behaviors-loader
 *
 * (c) 2018 by Jan Hug
 * Released under the MIT license.

 * This loader integrates Drupal behaviors with a regular Webpack workflow.
 * The name of the file has to follow the pattern [name].behavior.js for
 * the loader to pick it up. The behavior name is derived from the file
 * name. The main export is then added to the global Drupal.behaviors
 * object, where it will be 'attached' by Drupal itself.
 *
 * It injects the necessary code to enable 'Hot Module Replacement' for
 * Webpack's dev server, including automatic calling of attach() and
 * detach() functions when the modules are replaced.
 *
 *
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 * Freude, schöner Webpackfunken
 * Regex aus Elysium.
 *
 * Wir betreten sturzbetrunken
 * himmlische dein Buildingtum.
 *
 * Deine Loader binden wieder
 * was das Drupal streng geteilt.
 *
 * Alle Scriptfiles werden Brüder
 * wo dein sanfter Code so weilt.
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *
 */

var loaderUtils = require('loader-utils')
var validateOptions = require('schema-utils')

var OPTIONS_SCHEMA = {
  type: 'object',
  properties: {
    enableHmr: {
      type: 'boolean'
    }
  }
}

// Pattern to match new (export default) and traditional (module.exports)
// export statements.
var REGEX_EXPORT = /.*(export|module)(\s|\.)*(default|exports).*{/gm

/**
 * Main export.
 *
 * @param {String} content The content of source file.
 */
module.exports = function (content) {
  var options = loaderUtils.getOptions(this)
  validateOptions(OPTIONS_SCHEMA, options, 'Drupal Behaviors Loader')

  // Get the name of the file without extension and 'behavior'.
  // This will become the name of the Drupal behavior.
  var name = loaderUtils.interpolateName(this, '[name]', content).split('.')[0]

  // Define the full path inside the global Drupal object.
  var objectPath = `window.Drupal.behaviors.${name}`

  // All export statements are replaced with this String which will
  // basically add them to the global Drupal object.
  var objectDeclaration = `${objectPath} = {`
  content = content.replace(REGEX_EXPORT, objectDeclaration)

  return options.enableHmr ? buildHmrCode(content, objectPath, name) : content
}

/**
 * Build the code for HMR.
 * If HMR is enabled in the Webpack dev server, accept the replacement request and
 * add the attach and detach code if required.
 *
 * @param {String} content The source file
 * @param {String} objectPath The full object path where the behavior is added to.
 * @param {String} name The name of the behavior.
 */
function buildHmrCode (content, objectPath, name) {
  return `${content}
  if (module.hot) {
    console.log('Drupal Behaviors - attaching: ${name}')
    module.hot.accept()

    if (module.hot.status() === 'apply' && typeof ${objectPath}.attach === 'function') {
      ${objectPath}.attach()
    }

    module.hot.dispose(function () {
      if (typeof ${objectPath}.detach === 'function') {
        console.log('Drupal Behaviors - detaching: ${name}')
        ${objectPath}.detach()
      }
    })
  }`
}
