#!/bin/bash -eux

# See:
# * https://github.com/emoncms/emoncms/blob/stable/docs/LinuxInstall.md
# * https://github.com/emoncms/MyHomeEnergyPlanner/blob/master/.travis.yml
# * https://github.com/emoncms/MyHomeEnergyPlanner/tree/development

install_extra_ppas() {
  apt-key add /vagrant/vagrant/postgres_pgp_ACCC4CF8.asc
  echo 'deb http://apt.postgresql.org/pub/repos/apt/ bionic-pgdg main' > /etc/apt/sources.list.d/postgres.list
}

update_package_index() {
  if [ ! -f "/var/run/initial_apt_update_ok" ]; then
    sudo apt-get update
    touch /var/run/initial_apt_update_ok
  fi
}

install_postgresql_11_5() {
  DEBIAN_FRONTEND=noninteractive apt-get install -y \
    postgresql-11 \
    libpq-dev

  sed -i 's/port = 5433/port = 5432/g' /etc/postgresql/11/main/postgresql.conf
  sudo service postgresql restart
}

install_additional_packages() {
  DEBIAN_FRONTEND=noninteractive apt-get install -y \
	ack-grep \
        dos2unix \
	git \
	htop \
	make \
	nfs-common \
	python3 \
	python3-pip \
	run-one \
	sqlite3 \
	tree \
	unzip \
	whois \
	virtualenv \
	zip
}

create_postgresql_database_and_user() {
  if [ ! -f "/root/created_postgres_database" ]; then
    # We make a user and a database both called vagrant, then the vagrant
    # username will automatically access that database.
    CREATE_USER="createuser --superuser vagrant"
    CREATE_DATABASE="createdb --owner vagrant vagrant"

    # Run as postgres user, it has permission to do this
    su -c "${CREATE_USER}" postgres || true
    su -c "${CREATE_DATABASE}" postgres || true
    touch "/root/created_postgres_database"
  fi
}

install_symlinks() {
    ln -sf /vagrant/vagrant/bashrc /home/vagrant/.bashrc
    ln -sf /vagrant/vagrant/my.cnf /home/vagrant/.my.cnf
}

setup_virtualenv() {
  run_as_vagrant "virtualenv -p $(which python3) ~/venv"
  run_as_vagrant "bash -c '. ~/venv/bin/activate ; pip install -r /vagrant/mhep/requirements.txt'"
  run_as_vagrant "bash -c '. ~/venv/bin/activate ; pip install -r /vagrant/mhep/requirements/local.txt'"
}

migrate_django_database() {
  run_as_vagrant "make migrate"
}

load_django_admin_user() {
  run_as_vagrant "python manage.py loaddata /vagrant/vagrant/django_admin_fixture.json"
}

atomic_download() {
    URL=$1
    DEST=$2

    TMP="$(tempfile)"

    wget -qO "${TMP}" "${URL}" && mv "${TMP}" "${DEST}"
}

run_as_vagrant() {
  su vagrant bash -l -c "$1"
}


install_extra_ppas
install_symlinks
update_package_index
install_postgresql_11_5
install_additional_packages
create_postgresql_database_and_user
setup_virtualenv
migrate_django_database
load_django_admin_user

set +x
echo
echo "All done!"
echo
echo "Now open:"
echo "http://localhost:9090"
