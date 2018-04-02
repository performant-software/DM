DM: Tools For Digital Annotation and Linking
============================================

Setting up your own DM instance:
-------------

The easiest way to host your own instance of DM for your projects is to use [Digital Ocean](https://www.digitalocean.com/) - a cloud computing platform where you can set up virtual server space for as little as $10/month. We’ve set up an optimized process to deploy DM to Digital Ocean.

The size of the “droplet” you will want to set up to host a DM instance will vary, but here is a basic estimate:

| Instance size                                       | Memory | SSD Disk |
| --------------------------------------------------- |:------:|:--------:|
| Small (1-5 individual projects, 30 GB total data)   | 2 GB   | 50 GB    |
| Medium (5-10 individual projects, 40 GB total data) | 2 GB   | 60 GB    |
| Large (10-20 individual projects, 60 GB total data) | 4 GB   | 80 GB    |

Alternatively, if you wish to set up a DM instance on your own server or another service, basic instructions are provided below.

Deploying your own instance to Digital Ocean
--------------

#### Creating an independent user authentication provider
DM supports login through the OAuth protocol, and by default connects to Google's and GitHub's authentication providers. In addition, an independent OAuth provider application can be quickly created using the accompanying [Simple OAuth2 provider](https://github.com/performant-software/oauth-provider) repository. To add this service, follow the deployment instructions in that repository's ReadMe, then navigate to your-provider-application-url/oauth/applications and add an entry for your DM instance. You should use 'DM' for the application name and add your-dm-application-url/accounts/oauth-callback/independent to the Redirect URI field (this field can accommodate a list of callback URIs separated by line breaks, which is useful if you wish to provide authentication to multiple DM instances). Click Submit to save the application configuration, and copy the Application Id (key) and Secret values shown on the subsequent page.

#### Setting configuration variables
In order to run the provisioning script to create an instance on Digital Ocean, you first need to create a local copy of this repository using `git clone` and fill in configuration values in the file machine-images/digitalocean.json. These include:
- `digital_ocean_api_token`: see the "How to Generate a Personal Access Token" in [Digital Ocean's API tutorial](https://www.digitalocean.com/community/tutorials/how-to-use-the-digitalocean-api-v2). Your token must be provided here in order for the deployment process to connect with your Digital Ocean account.
- `superuser_id`: an identifier for a user who should have top-level admin status for all projects created in the instance. The format of this ID will be specific to the authentication provider this user will use; for the independent provider application, the ID will be "independent:username@example.com" with the user's email address replacing the latter part.
- `google_key` and `google_secret`: to enable login through Google's authentication service, see the [guide for Google's People API](https://developers.google.com/people/v1/getting-started) and fill in the key/secret values here after setting it up with your Google account.
- `github_key` and `github_secret`: to enable login through GitHub's authentication service, see the [guide for GitHub OAuth applications](https://developer.github.com/apps/building-oauth-apps/creating-an-oauth-app/) and fill in the key/secret values after creating an application in your GitHub settings.
- `independent_provider_base_url`: the URL for the independent OAuth provider application you have deployed, including the protocol and the trailing slash character, as in "http://example.com/".
- `independent_provider_key` and `independent_provider_secret`: the Application ID and Secret values displayed by your independent OAuth provider application after adding your DM instance to its OAuth applications list.
- `independent_provider_description`: the name of your independent OAuth provider service as it will appear in the Login dropdown menu.

#### Installing required tools
You will need to install Ansible and Packer in order to run the provisioning script. See installation instructions at:
- http://docs.ansible.com/ansible/latest/intro_installation.html for Ansible (Mac OS X users may alternatively wish to use Homebrew)
- https://www.packer.io/intro/getting-started/install.html for Packer

#### Creating the Digital Ocean snapshot
After `cd`ing into your local copy of this repository, run the following two commands:

    $ ansible-galaxy install --role-file=provisioning/requirements.yml --roles-path=provisioning/roles
    $ packer build machine-images/digitalocean.json

The script will save a snapshot, which you can access through the web interface for your Digital Ocean account. To launch your DM instance, create a new droplet from this snapshot and keep the default selection for droplet sizing. When launched, the droplet will have run the DM application from the /home/dm directory.

*Note on apt update errors:*
Recent updates to the software stack used in Digital Ocean droplets can lead to an error during the provisioning script. If the script fails, try opening provisioning/roles/tersmitten.apt/tasks/main.yml and edit it so that the beginnings of the 'update' and 'upgrade' tasks match those shown here:

```
- name: update
  # apt:
  #   update_cache: true
  #   cache_valid_time: "{{ 0 if apt_config_updated is defined and apt_config_updated.changed else apt_update_cache_valid_time }}"
  shell: apt-get -y update
```

```
- name: upgrade
  # apt:
  #   upgrade: "{{ apt_upgrade_type }}"
  #   update_cache: true
  #   dpkg_options: "{{ apt_upgrade_dpkg_options }}"
  shell: apt-get -y upgrade
```

Deploying outside of Digital Ocean
-------
If you wish to deploy your DM instance on your own server or on a service other than Digital Ocean, you can do so by installing the requirements and running the scripts listed below in "Building and running for development or custom deployment." The `scripts/build` command will create a .jar file that, when launched in a properly configured environment, will provide the full DM application at port 8080.

Building and running for development or custom deployment
-------------

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

Restoring a Downloaded Project from Another Instance
-------
If you wish to seed your new instance with an exported project from an existing instance, first navigate to the existing project and click "Download" in its table of contents view. You will then need to copy the download file to your instance server and relaunch the application.
- Clicking "Download" will provide you with a .zip file. Unzip this file so that you have a folder containing a file called download.ttl and files for any images used by the project. Use `rsync` to upload the download.ttl file to /home/dm on your instance server and the images to /home/dm/dm-data/images.
- To prepare the DM instance for relaunch, next use `ssh` to connect your command line to your DM server, using the credentials provided by Digital Ocean. Run `cd /home/dm`, then `ps -aux | grep java` to find the process ID number of the DM application, then use `kill` with that process ID to shut down the application.
- Finally, to relaunch the application and restore the exported project, run `nohup java -jar dm-1.0-SNAPSHOT.jar download.ttl > dm.log &`. You can then leave the ssh session with `exit`.

Restoring All Projects from Another Instance
-------
If you are restoring a full-data backup from another DM instance, you will next need to unpack the compressed backup file, upload it to your new installation server, and relaunch the DM application. You will need to use command line tools for this process:
- Use `gunzip` to unpack the backup file and `rsync` to upload it to your installation server’s /home/dm directory.
- To prepare the DM instance for relaunch, next use `ssh` to connect your command line to your DM server, using the credentials provided by Digital Ocean. Run `cd /home/dm`, then `ps -aux | grep java` to find the process ID number of the DM application, then use `kill` with that process ID to shut down the application. Run `rm -rf dm-data` to remove the default data directory.
- Finally, to relaunch the application and restore the backup, run `nohup java -jar dm-1.0-SNAPSHOT.jar your-backup-file-name.ttl > dm.log &`, replacing "your-backup-file-name" with the name of the uncompressed backup file you’ve uploaded. You can then leave the ssh session with `exit`.


Backups
-------

Backups of the RDF store are generated hourly and are automatically removed after 90 days in order to conserve storage space. To change the length of this window, edit the cron job for backup deletion with `crontab -e`.

To restore your DM instance from a backup file, you will need to shut the application down and relaunch it, passing the decompressed backup file as an argument.
- `ssh` as the root user into your instance server and navigate to /home/dm.
- Identify the backup file you want to restore (hourly backup files are located in dm-data/ttl-dumps). Run `cp your-backup-file-path /home/dm/backup-to-restore.ttl.gz`, replacing "your-backup-file-path" with the full path to the desired backup file, to copy it to a convenient location.
- In the /home/dm directory, run `gunzip backup-to-restore.ttl.gz` to decompress it.
- Run `ps -aux` to identify the process ID of the DM application. It will contain "java -jar dm-1.0-SNAPSHOT.jar" in the Command column. Run `kill` followed by the process ID to shut the application down.
- Run `nohup java -jar dm-1.0-SNAPSHOT.jar backup-to-restore.ttl > dm.log &` to launch the instance and restore it from the selected backup.
