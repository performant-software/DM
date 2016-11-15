DM: Tools For Digital Annotation and Linking
============================================
(Formerly Digital Mappaemundi)


Build instructions
------------------

In order to build client-side assets via [NodeJS](https://nodejs.org/):

    $ npm install
    $ npm run build

In order to build the Java-based server component (including client-side assets):

    $ mvn clean package

(Java Development Kit v8 and [Apache Maven](http://maven.apache.org/) needed.)

Development instructions
------------------------

In order to develop the client-side code, build and start the backend:

    $ mvn clean package
    $ java -jar target/dm-<version>.jar

In parallel, initialize and start [Browsersync](https://www.browsersync.io/):

    $ npm install
    $ npm run dev

Browsersync serves client-side assets from `src/main/resources/static` and
proxies backend logic provided by the Java process, watching asset changes
and reloading the app in the browser when needed.
