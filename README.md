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

Production Setup/ VM
--------------------

A production-like setup of DM is available as a provisioned VM. Requirements:

* [Vagrant](https://www.vagrantup.com/)
* [Vagrant/Ansible](https://www.vagrantup.com/docs/provisioning/ansible.html)

With Vagrant and Ansible installed, change to `vm/` and bring up a local DM
instance:

    $ cd vm/
    $ vagrant up dm.local

The VM's port 80 is forwarded to port 8000 of the host machine; see
`vm/Vagrantfile` for details. After VM startup and provisioning, browse to

    http://localhost:8000/
