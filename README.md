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

To create a provisioned droplet snapshot on Digital Ocean:

    $ export DIGITALOCEAN_API_TOKEN="..."
    $ ansible-galaxy install\
        --role-file=provisioning/requirements.yml\
        --roles-path=provisioning/roles
    $ packer build machine-images/digitalocean.json
