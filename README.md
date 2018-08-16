DM: Tools For Digital Annotation and Linking
============================================

Installation
-------------

The easiest way to host your own instance of DM for your projects is to use [Digital Ocean](https://www.digitalocean.com/) - a cloud computing platform where you can set up virtual server space for as little as $10/month. We’ve set up an optimized process to deploy DM to Digital Ocean. You can find this deployment system along with the most recent stable version of DM software here: [DM Digital Ocean Deployment](https://github.com/performant-software/dm-digitalocean)

Building and running for development or custom deployment
-------------

If you wish to deploy your DM instance on your own server or on a service other than Digital Ocean, you can do so by installing the requirements and running the scripts listed below in "Building and running for development or custom deployment." The `scripts/build` command will create a .jar file that, when launched in a properly configured environment, will provide the full DM application at port 8080.

#### Requirements
* Python v2
* Java Development Kit v8
* [Apache Maven](http://maven.apache.org/)
* [NodeJS](https://nodejs.org/)
* [Yarn](https://yarnpkg.com/)

#### Configuration
Copy the contents of dm.conf.example to a file named dm.conf and fill in the values for OAuth providers you wish to enable. Please refer to the above section on "Creating an independent user authentication provider" and the guides for key/secret generation with the various services in the "Setting configuration variables" section.

#### Build instructions

    $ scripts/build

#### Development instructions

In order to develop the client-side code, build and start the backend:

    $ scripts/build
    $ scripts/run

In parallel, initialize and start [Browsersync](https://www.browsersync.io/):

    $ npm run dev

Browsersync serves client-side assets from `src/main/resources/static` and
proxies backend logic provided by the Java process, watching asset changes
and reloading the app in the browser when needed.

#### Creating an independent user authentication provider

DM supports login through the OAuth protocol, and by default connects to Google's and GitHub's authentication providers. In addition, an independent OAuth provider application can be quickly created using the accompanying [Simple OAuth2 provider](https://github.com/performant-software/oauth-provider) repository. To add this service, follow the deployment instructions in that repository's ReadMe, then navigate to your-provider-application-url/oauth/applications and add an entry for your DM instance. You should use 'DM' for the application name and add your-dm-application-url/accounts/oauth-callback/independent to the Redirect URI field (this field can accommodate a list of callback URIs separated by line breaks, which is useful if you wish to provide authentication to multiple DM instances). Click Submit to save the application configuration, and copy the Application Id (key) and Secret values shown on the subsequent page.


#### Restoring a Downloaded Project from Another Instance

If you wish to seed your new instance with an exported project from an existing instance, first navigate to the existing project and click "Download" in its table of contents view. You will then need to copy the download file to your instance server and relaunch the application.
- Clicking "Download" will provide you with a .zip file. Unzip this file so that you have a folder containing a file called download.ttl and files for any images used by the project. Use `rsync` to upload the download.ttl file to /home/dm on your instance server and the images to /home/dm/dm-data/images.
- To prepare the DM instance for relaunch, next use `ssh` to connect your command line to your DM server, using the credentials provided by Digital Ocean. Run `cd /home/dm`, then `ps -aux | grep java` to find the process ID number of the DM application, then use `kill` with that process ID to shut down the application.
- Finally, to relaunch the application and restore the exported project, run `nohup java -jar dm-1.0-SNAPSHOT.jar download.ttl > dm.log &`. You can then leave the ssh session with `exit`.

#### Restoring All Projects from Another Instance

If you are restoring a full-data backup from another DM instance, you will next need to unpack the compressed backup file, upload it to your new installation server, and relaunch the DM application. You will need to use command line tools for this process:
- Use `gunzip` to unpack the backup file and `rsync` to upload it to your installation server’s /home/dm directory.
- To prepare the DM instance for relaunch, next use `ssh` to connect your command line to your DM server, using the credentials provided by Digital Ocean. Run `cd /home/dm`, then `ps -aux | grep java` to find the process ID number of the DM application, then use `kill` with that process ID to shut down the application. Run `rm -rf dm-data` to remove the default data directory.
- Finally, to relaunch the application and restore the backup, run `nohup java -jar dm-1.0-SNAPSHOT.jar your-backup-file-name.ttl > dm.log &`, replacing "your-backup-file-name" with the name of the uncompressed backup file you’ve uploaded. You can then leave the ssh session with `exit`.
