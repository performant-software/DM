# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure(2) do |config|
  config.vm.box = "ubuntu/xenial64"
  config.vm.network "private_network", ip: "192.168.33.44", auto_config: false
  config.vm.provision 'shell', inline: "ifconfig enp0s8 192.168.33.44", run: "always"
  config.ssh.forward_env = []

  config.vm.provision "ansible" do |ansible|
    ansible.galaxy_command = "ansible-galaxy install --role-file=%{role_file} --roles-path=%{roles_path}"
    ansible.galaxy_role_file = "provisioning/requirements.yml"
    ansible.playbook = "provisioning/playbook.yml"
    #ansible.vault_password_file = "provisioning/vault-password"
    ansible.groups = {
      "dm" => [ "default" ],
      "vagrant" => [ "default" ]
    }
    ansible.sudo = true
  end
end
