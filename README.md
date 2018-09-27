# drupal-behaviors-loader
*HOT* module replacement for your Drupal behaviors.

# How it works
Every behavior has to be in its own file. The naming scheme is [name].behavior.js.
The loader will use the [name] and attach it to the global Drupal.behaviors object.

Your behavior file should export an object. Ideally it provides an `attach` and also
a `detach` function.

The loader will generate and inject code that makes 'hot module replacement' possible.
When a module replacement is going to happen, it will first call the `detach` function,
where it's the job of the beahvior to remove any event listeners or 'clean up'.
Then webpack will replace the behavior with the new one. The injected code then calls
`attach` again. No page refresh required and only the behavior actually changed will be
reattached.

It's really important to remove event listeners and destroy instantiated classes that
might have altered the document in any way. Otherwise it might lead to some unexpected
behavior.

# How to use
## Add the loader to your webpack config
```javascript
{
  test: /\.behavior.js$/,
  exclude: /node_modules/,
  options: {
    enableHmr: true
  },
  loader: 'drupal-behaviors-loader'
}
```

## Write your behavior
*behaviors/thing.behavior.js*
```javascript
import Thing from '@/components/thing'

export default {
  _thing: null,
  _button: null,

  _handleClick (e) {
    console.log('Hello!')
  },

  attach (context, settings) {
    this._thing = new Thing()

    this._button = document.getElementById('my-little-button')

    if (this._button) {
      this._button.addEventListener('click', this._handleClick)
    }
  },

  detach () {
    this._thing.destroy()
    this._button.removeEventListener('click', this._handleClick)
  }
}
```

## Import the behavior
*main.js*
```javascript
// Import behavior
import '@/behaviors/thing.behavior'

// Import component style.
import '@/styles/components/thing.scss'
```

## Make hot module replacement work with Drupal
When using the webpack dev server the files are not written to the filesystem, but kept in
memory only. They are accessible via the dev server, e.g. http://localhost:8080/main.js.
This means for local development you need to "attach" this script instead of the built file.

Drupal allows to include external libraries. So let's make use of that:

*mytheme.libraries.yml*
```yaml
main-build:
  js:
    dist/js/chunk-vendors.js: { minified: true, preprocess: false, scope: footer }
    dist/js/main.js: { minified: true, preprocess: false, scope: footer }

main-dev:
  js:
    http://localhost:8080/main.js: { type: external, minified: true, preprocess: false }
```

So for every webpack entry you will need two libraries: One for the production build and one
for local development. You have to manually attach the correct library depending on the
environment:

*mytheme.theme*
```php
$environment = getenv_default('ENV', 'local');

if ($environment === 'local') {
  $variables['#attached']['library'][] = 'mytheme/main-dev';
} else {
  $variables['#attached']['library'][] = 'mytheme/main-build';
}
```

Depending on your setup you will probably also need to set the headers option of the
webpack dev server:
```javascript
headers: {
  'Access-Control-Allow-Origin': '*'
}
```

After that you should be able to enjoy HMR on your local Drupal site! Or do you...?!
Because the hot module stuff from webpack checks for its update.json file using a
relative path and you're accessing it from mydrupalsite.local, you will have to setup
some kind of proxying...

Or you can just do it like I did and set the publicPath option of webpack to literally
itself. Which will result in this lovely URL when starting the webpack orchestra:

```
App running at:
- Local:   http://localhost:8080/http://localhost:8080
- Network: http://10.20.1.1:8080/http://localhost:8080
```

How fantastic!

# Full theme and webpack config example
I created a simple webpack setup for a Drupal theme, which also uses this loader.
https://github.com/dulnan/drupal-webpack-setup-example
