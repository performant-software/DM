DM: Tools For Digital Annotation and Linking
============================================
(Formerly Digital Mappaemundi)

Prerequisites
-------------

* Python v2
* Java Development Kit v8
* [Apache Maven](http://maven.apache.org/)
* [NodeJS](https://nodejs.org/)
* [Yarn](https://yarnpkg.com/)

Build instructions
------------------

    $ scripts/build

Development instructions
------------------------

In order to develop the client-side code, build and start the backend:

    $ scripts/build
    $ scripts/run

In parallel, initialize and start [Browsersync](https://www.browsersync.io/):

    $ npm run dev

Browsersync serves client-side assets from `src/main/resources/static` and
proxies backend logic provided by the Java process, watching asset changes
and reloading the app in the browser when needed.

VM
--

A production-like setup of DM is available as a provisioned VM. Requirements:

* [Vagrant](https://www.vagrantup.com/)
* [Vagrant/Ansible](https://www.vagrantup.com/docs/provisioning/ansible.html)

With Vagrant and Ansible installed, bring up a local DM instance:

    $ vagrant up

The VM join a private network with IP `192.168.33.44` ; see
`Vagrantfile` for details. After VM startup and provisioning,
optionally add a hosts entry for the private interface

    $ echo "192.168.33.44 vm.local" >>/etc/hosts

and browse to

    http://vm.local/

Machine Images
--------------

Provisioned machine images can also be created via

* [Packer](https://www.packer.io/) and
* [Ansible](https://www.packer.io/docs/provisioners/ansible.html)

To create a provisioned droplet snapshot on Digital Ocean, first open machine-images/digitalocean.json and fill in values for the settings in the `variables` section. You will need a Digital Ocean API token, as well as client key/secret pairs for each OAuth provider you wish to enable. You can also specify a super-user who will be granted admin privileges on any created project; the ID format to use here will be specific to the user's authentication service.

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

Restoring Backup Data from an Older Instance
-------
If you are restoring a backup from another DM instance, you will next need to unpack the compressed backup file, upload it to your new installation server, and relaunch the DM application. You will need to use command line tools for this process:
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
