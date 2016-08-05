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